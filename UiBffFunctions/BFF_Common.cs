using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.Functions.Worker;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using CloudFiles.Utilities;
using CloudFiles.Models;
using System.Net;
using System.Threading;
using Microsoft.DurableTask.Client;
using System.Collections.Generic;
using System.Linq;

namespace CloudFiles
{
    public static class BFF_Common
    {
        [Function(Constants.bffPing)]
        public static IActionResult Ping(
            [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "ping")] HttpRequest req,
            FunctionContext executionContext)
        {
            var log = executionContext.GetLogger(nameof(Ping));
            log.LogInformation($"{Constants.bffPing} call {req.Path}");
            return new OkObjectResult("pong");
        }

        [Function(Constants.GoogleValidateToken)]
        public static async Task<IActionResult> GoogleValidateToken(
            [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "google/tokenvalidate")] HttpRequest req,
            FunctionContext executionContext)
        {
            var log = executionContext.GetLogger(nameof(GoogleValidateToken));
            try
            {
                log.LogInformation($"{Constants.GoogleValidateToken} call");
                await GoogleUtility.VerifyGoogleHeaderTokenIsValid(req).ConfigureAwait(false);

                return new OkResult();
            }
            catch (UnauthorizedAccessException ex)
            {
                log.LogError(ex.Message);
                return new StatusCodeResult(StatusCodes.Status401Unauthorized);
            }
        }

        [Function(Constants.ProcessListInstances)]
        public static async Task<IActionResult> DurableFunctionsInstances(
           [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "process/instances")] HttpRequest req,
           [DurableClient] DurableTaskClient starter,
           FunctionContext executionContext)
        {
            var log = executionContext.GetLogger(nameof(DurableFunctionsInstances));
            try
            {
                var (_, userEmail) = await GoogleUtility.VerifyGoogleHeaderTokenWithEmail(req).ConfigureAwait(false);
                var statuses = new List<OrchestrationRuntimeStatus>();

                int pageSizeInt = 500;
                var intSuccess = string.IsNullOrEmpty(req.Query["pageSize"]) || int.TryParse(req.Query["pageSize"], out pageSizeInt);
                if (!intSuccess)
                {
                    throw new InvalidOperationException("pageSize must be int.");
                }

                var fromDate = DateTime.MinValue;
                var dateSuccess = string.IsNullOrEmpty(req.Query["from"]) || DateTime.TryParse(req.Query["from"], out fromDate);
                if (!dateSuccess)
                {
                    throw new InvalidOperationException("from must be date.");
                }

                var toDate = DateTime.MaxValue;
                dateSuccess = string.IsNullOrEmpty(req.Query["to"]) || DateTime.TryParse(req.Query["to"], out toDate);
                if (!dateSuccess)
                {
                    throw new InvalidOperationException("to must be date.");
                }

                //  Running = 0        The orchestration is running (it may be actively running or waiting for input).
                //  Completed = 1      The orchestration ran to completion.
                //  ContinuedAsNew = 2 The orchestration completed with ContinueAsNew as is in the process of restarting.
                //  Failed = 3         The orchestration failed with an error.
                //  Canceled = 4       The orchestration was canceled.
                //  Terminated = 5     The orchestration was terminated via an API call.
                //  Pending = 6        The orchestration was scheduled but has not yet started.
                const string statusListAll = "0,1,2,3,4,5,6";
                string[] statusList = string.IsNullOrEmpty(req.Query["statusList"]) ? statusListAll.Split(",") : (req.Query["statusList"].ToString()).Split(",");
                foreach (var i in statusList)
                {
                    var success = int.TryParse(i, out int status);
                    if (success)
                    {
                        statuses.Add((OrchestrationRuntimeStatus)status);
                    }
                    else
                    {
                        throw new InvalidOperationException($"Item in statusList: `{i}` is not an integer.");
                    }
                }

                var queryFilter = new OrchestrationQuery
                {
                    CreatedFrom = fromDate == DateTime.MinValue ? null : fromDate,
                    CreatedTo = toDate == DateTime.MaxValue ? null : toDate,
                    Statuses = statuses,
                    PageSize = pageSizeInt,
                    FetchInputsAndOutputs = true,
                    ContinuationToken = req.Query["continueToken"],
                    InstanceIdPrefix = req.Query["prefix"]
                };

                log.LogInformation("List orchestration instances.");
                var instances = new List<OrchestrationMetadata>();
                await foreach (var instance in starter.GetAllInstancesAsync(queryFilter))
                {
                    instances.Add(instance);
                }

                // Filter to only show instances belonging to the current user.
                // Parent orchestrators have StartedBy in their input; sub-orchestrators
                // are matched by instanceId prefix (Durable Functions naming convention).
                if (!string.IsNullOrEmpty(userEmail))
                {
                    var parentIds = new HashSet<string>();
                    foreach (var inst in instances)
                    {
                        if (!string.IsNullOrEmpty(inst.SerializedInput) &&
                            inst.SerializedInput.Contains($"\"StartedBy\"", StringComparison.OrdinalIgnoreCase) &&
                            inst.SerializedInput.Contains(userEmail, StringComparison.OrdinalIgnoreCase))
                        {
                            parentIds.Add(inst.InstanceId);
                        }
                    }
                    instances = instances.Where(i =>
                        parentIds.Contains(i.InstanceId) ||
                        parentIds.Any(pid => i.InstanceId.StartsWith(pid))
                    ).ToList();
                }

                return new OkObjectResult(instances);
            }
            catch (UnauthorizedAccessException ex)
            {
                log.LogError(ex.Message);
                return new StatusCodeResult(StatusCodes.Status401Unauthorized);
            }
            catch (InvalidOperationException ex)
            {
                return new BadRequestObjectResult(ex.Message);
            }
            catch (Exception ex)
            {
                log.LogError(ex, $"Unexpected error in {Constants.ProcessListInstances}");
                return new StatusCodeResult(StatusCodes.Status500InternalServerError);
            }
        }

        [Function(Constants.ProcessPurgeInstance)]
        public static async Task<IActionResult> PurgeInstance(
           [HttpTrigger(AuthorizationLevel.Anonymous, "delete", Route = "process/instances/{instanceId}")] HttpRequest req,
           [DurableClient] DurableTaskClient starter,
           string instanceId,
           FunctionContext executionContext)
        {
            var log = executionContext.GetLogger(nameof(PurgeInstance));
            try
            {
                _ = await GoogleUtility.VerifyGoogleHeaderTokenIsValid(req).ConfigureAwait(false);
                log.LogInformation($"Purging orchestration instance '{instanceId}'.");
                var result = await starter.PurgeInstanceAsync(instanceId).ConfigureAwait(false);
                return new OkObjectResult(new { instanceId, purged = result != null });
            }
            catch (UnauthorizedAccessException ex)
            {
                log.LogError(ex.Message);
                return new StatusCodeResult(StatusCodes.Status401Unauthorized);
            }
            catch (Exception ex)
            {
                log.LogError(ex, $"Error purging instance {instanceId}");
                return new StatusCodeResult(StatusCodes.Status500InternalServerError);
            }
        }
    }
}
