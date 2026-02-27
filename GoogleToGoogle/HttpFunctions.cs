using CloudFiles.Models;
using CloudFiles.Utilities;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.Functions.Worker;
using Microsoft.DurableTask.Client;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json;
using System;
using System.IO;
using System.Net;
using System.Threading.Tasks;

namespace CloudFiles.GoogleToGoogle
{
    public static class HttpFunctions
    {
        // append this to statusQueryGetUri: &showHistory=true&showHistoryOutput=true
        [Function(Constants.ProcessGooleStorageToGooglePhotos_Start)]
        public static async Task<IActionResult> GooleStorageToGooglePhotos(
            [HttpTrigger(AuthorizationLevel.Function, "post", Route = "process/GooleStorageToGooglePhotos/start")] HttpRequest req,
            [DurableClient] DurableTaskClient starter,
            FunctionContext executionContext)
        {
            var log = executionContext.GetLogger(nameof(GooleStorageToGooglePhotos));
            try {
                var accessToken = await GoogleUtility.VerifyGoogleHeaderTokenIsValid(req).ConfigureAwait(false);
                string requestBody = await new StreamReader(req.Body).ReadToEndAsync().ConfigureAwait(false);
                var request = JsonConvert.DeserializeObject<FilesCopyRequest>(requestBody);

                if (request.SelectedItemsList == null || request.SelectedItemsList.Count == 0)
                {
                    return new BadRequestObjectResult($"{nameof(request.SelectedItemsList)} must contain items");
                }
                request.AccessToken = accessToken;

                string instanceId = await starter.ScheduleNewOrchestrationInstanceAsync(
                    Constants.GooleStorageToGooglePhotosOrchestrator, request).ConfigureAwait(false);
                log.LogInformation($"Started orchestration instance '{instanceId}'.");

                return CreateCheckStatusResponse(req, instanceId);
            }
            catch (UnauthorizedAccessException ex) {
                log.LogError(ex.Message);
                return new StatusCodeResult(StatusCodes.Status401Unauthorized);
            }
        }
        private static IActionResult CreateCheckStatusResponse(HttpRequest req, string instanceId)
        {
            var baseUrl = $"{req.Scheme}://{req.Host}/runtime/webhooks/durabletask/instances/{instanceId}";
            return new OkObjectResult(new StartJobResponse
            {
                Id = instanceId,
                StatusQueryGetUri = baseUrl,
                SendEventPostUri = $"{baseUrl}/raiseEvent/{{eventName}}",
                TerminatePostUri = $"{baseUrl}/terminate?reason={{text}}",
                PurgeHistoryDeleteUri = baseUrl,
                RestartPostUri = $"{baseUrl}/restart"
            });
        }
    }
}
