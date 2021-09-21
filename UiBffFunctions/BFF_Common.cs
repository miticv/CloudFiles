using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.WebJobs;
using Microsoft.Azure.WebJobs.Extensions.Http;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using CloudFiles.Utilities;
using CloudFiles.Models;
using Microsoft.Azure.WebJobs.Extensions.OpenApi.Core.Attributes;
using Microsoft.OpenApi.Models;
using Microsoft.Azure.WebJobs.Extensions.OpenApi.Core.Enums;
using System.Net;
using System.Threading;
using Microsoft.Azure.WebJobs.Extensions.DurableTask;
using System.Collections.Generic;

namespace CloudFiles
{
    public static class BFF_Common
    {
        [OpenApiOperation(operationId: Constants.bffPing, tags: new[] { "Common" }, Summary = "Ping function")]
        [OpenApiResponseWithBody(statusCode: HttpStatusCode.OK, contentType: "text/plain", bodyType: typeof(string), Description = "This returns plain `pong` response")]
        [FunctionName(Constants.bffPing)]
        public static IActionResult Ping(
            [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "ping")] HttpRequest req,
            ILogger log)
        {
            log.LogInformation($"{Constants.bffPing} call {req.Path}");
            return new OkObjectResult("pong");
        }

        [OpenApiOperation(operationId: Constants.GoogleValidateToken, tags: new[] { "Google" }, Summary = "Verifies Google Bearer Token")]
        [OpenApiSecurity("Bearer token", SecuritySchemeType.ApiKey, Name = "Authorization", In = OpenApiSecurityLocationType.Header, Description = "Google bearer token")]
        [OpenApiResponseWithBody(statusCode: HttpStatusCode.OK, contentType: "application/json", bodyType: typeof(string))]

        [FunctionName(Constants.GoogleValidateToken)]
        public static async Task<IActionResult> GoogleValidateToken(
            [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "google/tokenvalidate")] HttpRequest req,
            ILogger log)
        {
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

        [OpenApiOperation(operationId: Constants.ProcessListInstances, tags: new[] { "Processes" }, Summary = "List all process instances")]
        [OpenApiSecurity("Bearer token", SecuritySchemeType.ApiKey, Name = "Authorization", In = OpenApiSecurityLocationType.Header, Description = "Google bearer token")]
        [OpenApiParameter(name: "continueToken", In = ParameterLocation.Query, Required = false, Type = typeof(string))]
        [OpenApiParameter(name: "prefix", In = ParameterLocation.Query, Required = false, Type = typeof(string))]
        [OpenApiParameter(name: "showInput", In = ParameterLocation.Query, Required = false, Type = typeof(bool))]
        [OpenApiParameter(name: "pageSize", In = ParameterLocation.Query, Required = false, Type = typeof(int))]
        [OpenApiParameter(name: "from", In = ParameterLocation.Query, Required = false, Type = typeof(DateTime), Description = "MM/dd/yyyy HH:mm:ss")]
        [OpenApiParameter(name: "to", In = ParameterLocation.Query, Required = false, Type = typeof(DateTime), Description = "MM/dd/yyyy HH:mm:ss")]
        [OpenApiParameter(name: "statusList", In = ParameterLocation.Query, Required = false, Type = typeof(List<int>),
            Description = "0:Running, 1:Completed, 2:New: 3:Failed, 4:Canceled, 5:Terminated, 6:Pending")]

        [FunctionName(Constants.ProcessListInstances)]
        public static async Task<IActionResult> DurableFunctionsInstances(
           [HttpTrigger(AuthorizationLevel.Function, "get", Route = "process/instances")] HttpRequest req,
           [DurableClient] IDurableOrchestrationClient starter,
           ILogger log)
        {
            try
            {
                _ = await GoogleUtility.VerifyGoogleHeaderTokenIsValid(req).ConfigureAwait(false);
                var queryFilter = new OrchestrationStatusQueryCondition();
                var statuses = new List<OrchestrationRuntimeStatus>();

                int pageSizeInt = 500;
                var intSuccess = string.IsNullOrEmpty(req.Query["pageSize"]) || int.TryParse(req.Query["pageSize"], out pageSizeInt);
                if (!intSuccess)
                {
                    throw new InvalidOperationException("pageSize must be int.");
                }

                var showInput = true;
                var boolSuccess = string.IsNullOrEmpty(req.Query["showInput"]) || bool.TryParse(req.Query["showInput"], out showInput);
                if (!boolSuccess)
                {
                    throw new InvalidOperationException("showInput must be boolean.");
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

                queryFilter.CreatedTimeFrom = fromDate;
                queryFilter.CreatedTimeTo = toDate;
                queryFilter.TaskHubNames = new[] { starter.TaskHubName };
                queryFilter.ContinuationToken = req.Query["continueToken"];
                queryFilter.InstanceIdPrefix = req.Query["prefix"];
                queryFilter.ShowInput = showInput;
                queryFilter.PageSize = pageSizeInt;
                queryFilter.RuntimeStatus = statuses;

                log.LogInformation("List orchestration instances.");
                var result = await starter.ListInstancesAsync(queryFilter, CancellationToken.None).ConfigureAwait(false);
                return new OkObjectResult(result);
            }
            catch (UnauthorizedAccessException ex)
            {
                log.LogError(ex.Message);
                return new StatusCodeResult(StatusCodes.Status401Unauthorized);
            }
        }
    }
}
