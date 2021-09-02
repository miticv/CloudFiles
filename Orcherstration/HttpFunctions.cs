using CloudFiles.Models;
using CloudFiles.Utilities;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.WebJobs;
using Microsoft.Azure.WebJobs.Extensions.DurableTask;
using Microsoft.Azure.WebJobs.Extensions.Http;
using Microsoft.Azure.WebJobs.Extensions.OpenApi.Core.Attributes;
using Microsoft.Azure.WebJobs.Extensions.OpenApi.Core.Enums;
using Microsoft.Extensions.Logging;
using Microsoft.OpenApi.Models;
using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.IO;
using System.Net;
using System.Threading;
using System.Threading.Tasks;

namespace CloudFiles
{
    public static class HttpFunctions
    {
        [OpenApiOperation(operationId: Constants.ProcessListInstances, tags: new[] { "Processes" }, Summary = "List all process instances", Visibility = OpenApiVisibilityType.Important)]
        [OpenApiSecurity("Bearer token", SecuritySchemeType.ApiKey, Name = "Authorization", In = OpenApiSecurityLocationType.Header, Description = "Google bearer token")]
        [OpenApiParameter(name: "continueToken", In = ParameterLocation.Query, Required = false, Type = typeof(string), Summary = "next page token if applicable", Visibility = OpenApiVisibilityType.Advanced)]
        [OpenApiParameter(name: "prefix", In = ParameterLocation.Query, Required = false, Type = typeof(string), Summary = "prefix of instanceId", Visibility = OpenApiVisibilityType.Advanced)]
        [OpenApiParameter(name: "showInput", In = ParameterLocation.Query, Required = false, Type = typeof(bool), Summary = "show job input", Visibility = OpenApiVisibilityType.Advanced)]
        [OpenApiParameter(name: "pageSize", In = ParameterLocation.Query, Required = false, Type = typeof(int), Summary = "records per page", Visibility = OpenApiVisibilityType.Advanced)]
        [OpenApiParameter(name: "from", In = ParameterLocation.Query, Required = false, Type = typeof(DateTime), Summary = "filter from creation date", Visibility = OpenApiVisibilityType.Advanced, Description = "MM/dd/yyyy HH:mm:ss")]
        [OpenApiParameter(name: "to", In = ParameterLocation.Query, Required = false, Type = typeof(DateTime), Summary = "filter to creation date", Visibility = OpenApiVisibilityType.Advanced, Description = "MM/dd/yyyy HH:mm:ss")]
        [OpenApiParameter(name: "statusList", In = ParameterLocation.Query, Required = false, Type = typeof(List<int>), Summary = "List of statuses to show", Visibility = OpenApiVisibilityType.Advanced,
            Description = "0:Running, 1:Completed, 2:New: 3:Failed, 4:Canceled, 5:Terminated, 6:Pending")]
        [OpenApiResponseWithBody(statusCode: HttpStatusCode.OK, contentType: "application/json",  bodyType: typeof(object), Description = "Returns list of process instances.")]

        [FunctionName(Constants.ProcessListInstances)]
        public static async Task<IActionResult> DurableFunctionsInstances(
           [HttpTrigger(AuthorizationLevel.Function, "get", Route = "process/instances")] HttpRequest req,
           [DurableClient] IDurableOrchestrationClient starter,
           ILogger log)
        {
            try {
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
            catch (UnauthorizedAccessException ex) {
                log.LogError(ex.Message);
                return new StatusCodeResult(StatusCodes.Status401Unauthorized);
            }
        }

        [OpenApiOperation(operationId: Constants.ProcessAzureToGooglePhotos_Start, tags: new[] { "Processes" }, Summary = "Start Azure to Google Photos job", Description = "Single tenant for now.", Visibility = OpenApiVisibilityType.Important)]
        [OpenApiSecurity("Bearer token", SecuritySchemeType.ApiKey, Name = "Authorization", In = OpenApiSecurityLocationType.Header, Description = "Google bearer token")]
        [OpenApiRequestBody("File Copy Request", typeof(FilesCopyRequest))]
        [OpenApiResponseWithBody(statusCode: HttpStatusCode.OK, contentType: "application/json", bodyType: typeof(StartJobResponse),
            Description = "Returns list of job actions you can execute. For statusQueryGetUri you can append these options as well: `&showHistory = true&showHistoryOutput = true`")]

        // append this to statusQueryGetUri: &showHistory=true&showHistoryOutput=true
        [FunctionName(Constants.ProcessAzureToGooglePhotos_Start)]
        public static async Task<IActionResult> AzureStorageToGooglePhotos(
            [HttpTrigger(AuthorizationLevel.Function, "post", Route = "process/AzureStorageToGooglePhotos/start")] HttpRequest req,
            [DurableClient] IDurableOrchestrationClient starter,
            ILogger log)
        {
            try
            {
                var accessToken = await GoogleUtility.VerifyGoogleHeaderTokenIsValid(req).ConfigureAwait(false);
                string requestBody = await new StreamReader(req.Body).ReadToEndAsync().ConfigureAwait(false);
                var request = JsonConvert.DeserializeObject<FilesCopyRequest>(requestBody);

                if (request.SelectedItemsList == null || request.SelectedItemsList.Count == 0)
                {
                    return new BadRequestObjectResult($"{nameof(request.SelectedItemsList)} must contain items");
                }
                request.AccessToken = accessToken;

                string instanceId = await starter.StartNewAsync(Constants.AzureStorageToGooglePhotosOrchestrator, null, request).ConfigureAwait(false);
                log.LogInformation($"Started orchestration instance '{instanceId}'.");

                return starter.CreateCheckStatusResponse(req, instanceId);
            }
            catch (UnauthorizedAccessException ex) {
                    log.LogError(ex.Message);
                    return new StatusCodeResult(StatusCodes.Status401Unauthorized);
            }
        }

        [OpenApiOperation(operationId: Constants.ProcessGooleStorageToGooglePhotos_Start, tags: new[] { "Processes" }, Summary = "Start Google Storage to Google Photos job", Description = "Single tenant for now", Visibility = OpenApiVisibilityType.Important)]
        [OpenApiSecurity("Bearer token", SecuritySchemeType.ApiKey, Name = "Authorization", In = OpenApiSecurityLocationType.Header, Description = "Google bearer token")]
        [OpenApiRequestBody("File Copy Request", typeof(FilesCopyRequest))]
        [OpenApiResponseWithBody(statusCode: HttpStatusCode.OK, contentType: "application/json", bodyType: typeof(StartJobResponse),
            Description = "Returns list of job actions you can execute. For statusQueryGetUri you can append these options as well: `&showHistory = true&showHistoryOutput = true`")]
        [OpenApiIgnore]

        // append this to statusQueryGetUri: &showHistory=true&showHistoryOutput=true
        [FunctionName(Constants.ProcessGooleStorageToGooglePhotos_Start)]
        public static async Task<IActionResult> GooleStorageToGooglePhotos(
            [HttpTrigger(AuthorizationLevel.Function, "post", Route = "process/GooleStorageToGooglePhotos/start")] HttpRequest req,
            [DurableClient] IDurableOrchestrationClient starter,
            ILogger log)
        {
            try {
                var accessToken = await GoogleUtility.VerifyGoogleHeaderTokenIsValid(req).ConfigureAwait(false);
                string requestBody = await new StreamReader(req.Body).ReadToEndAsync().ConfigureAwait(false);
                var request = JsonConvert.DeserializeObject<FilesCopyRequest>(requestBody);

                if (request.SelectedItemsList == null || request.SelectedItemsList.Count == 0)
                {
                    return new BadRequestObjectResult($"{nameof(request.SelectedItemsList)} must contain items");
                }
                request.AccessToken = accessToken;

                string instanceId = await starter.StartNewAsync(Constants.GooleStorageToGooglePhotosOrchestrator, null, request).ConfigureAwait(false);
                log.LogInformation($"Started orchestration instance '{instanceId}'.");

                return starter.CreateCheckStatusResponse(req, instanceId);
            }
            catch (UnauthorizedAccessException ex) {
                log.LogError(ex.Message);
                return new StatusCodeResult(StatusCodes.Status401Unauthorized);
            }
        }
    }
}
