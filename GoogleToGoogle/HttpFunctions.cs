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
using System.IO;
using System.Net;
using System.Threading.Tasks;

namespace CloudFiles.GoogleToGoogle
{
    public static class HttpFunctions
    {
        [OpenApiOperation(operationId: Constants.ProcessGooleStorageToGooglePhotos_Start, tags: new[] { "Processes" }, Summary = "Start Google Storage to Google Photos job")]
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
