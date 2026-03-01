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

                int pageSizeInt = 50;
                var intSuccess = string.IsNullOrEmpty(req.Query["pageSize"]) || int.TryParse(req.Query["pageSize"], out pageSizeInt);
                if (!intSuccess)
                {
                    throw new InvalidOperationException("pageSize must be int.");
                }

                // Default to the last 90 days when no date is provided.
                // Fetching all history exceeds the Durable Task gRPC message size limit.
                var fromDate = string.IsNullOrEmpty(req.Query["from"])
                    ? DateTime.UtcNow.AddDays(-90)
                    : DateTime.MinValue;
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

                // Fetch metadata without serialized inputs/outputs to avoid gRPC message-size limits.
                // Large orchestration inputs (e.g. file lists) cause ResourceExhausted when fetched in bulk.
                var queryFilter = new OrchestrationQuery
                {
                    CreatedFrom = fromDate == DateTime.MinValue ? null : fromDate,
                    CreatedTo = toDate == DateTime.MaxValue ? null : toDate.AddDays(1),
                    Statuses = statuses,
                    PageSize = pageSizeInt,
                    FetchInputsAndOutputs = false,
                    ContinuationToken = req.Query["continueToken"],
                    InstanceIdPrefix = req.Query["prefix"]
                };

                log.LogInformation("List orchestration instances.");
                var allInstances = new List<OrchestrationMetadata>();
                await foreach (var instance in starter.GetAllInstancesAsync(queryFilter))
                {
                    allInstances.Add(instance);
                }

                // Check admin privileges.
                var adminEmails = (Environment.GetEnvironmentVariable("ADMIN_EMAILS") ?? "")
                    .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
                var isAdmin = adminEmails.Any(e => string.Equals(e, userEmail, StringComparison.OrdinalIgnoreCase));
                var showAll = isAdmin && string.Equals(req.Query["all"], "true", StringComparison.OrdinalIgnoreCase);

                // Top-level orchestrator names. Sub-orchestrators are matched by instanceId prefix.
                var parentOrchestratorNames = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
                {
                    "azureStorageToGooglePhotosOrchestrator",
                    "googleStorageToGooglePhotosOrchestrator",
                    "googlePhotosToAzureOrchestrator"
                };

                List<OrchestrationMetadata> instances;
                var parentInstances = allInstances
                    .Where(i => parentOrchestratorNames.Contains(i.Name))
                    .ToList();

                // Fetch details individually — catch per-instance failures (e.g. gRPC size limits)
                // so one large instance doesn't take down the whole listing.
                var detailById = new Dictionary<string, OrchestrationMetadata>();
                var detailTasks = parentInstances.Select(async p =>
                {
                    try
                    {
                        return await starter.GetInstanceAsync(p.InstanceId, getInputsAndOutputs: true);
                    }
                    catch (Exception ex)
                    {
                        log.LogWarning(ex, $"Failed to fetch details for {p.InstanceId}, using metadata only.");
                        return null;
                    }
                }).ToList();
                var details = await Task.WhenAll(detailTasks);
                foreach (var d in details)
                {
                    if (d != null) detailById[d.InstanceId] = d;
                }

                if (showAll)
                {
                    instances = allInstances
                        .Select(i => detailById.TryGetValue(i.InstanceId, out var d) ? d : i)
                        .ToList();
                }
                else if (!string.IsNullOrEmpty(userEmail))
                {
                    // Filter to the current user's instances using StartedBy in serialized input.
                    var parentIds = new HashSet<string>();
                    foreach (var detail in detailById.Values)
                    {
                        if (!string.IsNullOrEmpty(detail.SerializedInput) &&
                            detail.SerializedInput.Contains("\"StartedBy\"", StringComparison.OrdinalIgnoreCase) &&
                            detail.SerializedInput.Contains(userEmail, StringComparison.OrdinalIgnoreCase))
                        {
                            parentIds.Add(detail.InstanceId);
                        }
                    }

                    instances = allInstances
                        .Where(i => parentIds.Contains(i.InstanceId) ||
                                    parentIds.Any(pid => i.InstanceId.StartsWith(pid)))
                        .Select(i => detailById.TryGetValue(i.InstanceId, out var d) ? d : i)
                        .ToList();
                }
                else
                {
                    instances = allInstances;
                }

                // Map to simple DTOs to avoid serialization issues with OrchestrationMetadata.
                // The SDK type can contain properties that fail JSON serialization (e.g. gRPC internals),
                // causing a 500 at the response layer even though the function itself succeeds.
                var result = instances.Select(i => new
                {
                    name = i.Name,
                    instanceId = i.InstanceId,
                    runtimeStatus = (int)i.RuntimeStatus,
                    createdAt = i.CreatedAt,
                    lastUpdatedAt = i.LastUpdatedAt,
                    serializedInput = i.SerializedInput,
                    serializedOutput = i.SerializedOutput,
                    serializedCustomStatus = i.SerializedCustomStatus
                }).ToList();

                return new OkObjectResult(result);
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
