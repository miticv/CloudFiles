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
using System.Threading.Tasks;

namespace CloudFiles.GoogleStorageToAzure
{
    public static class HttpFunctions
    {
        [Function(Constants.ProcessGcsToAzure_Start)]
        public static async Task<IActionResult> GoogleStorageToAzureStart(
            [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "process/GoogleStorageToAzure/start")] HttpRequest req,
            [DurableClient] DurableTaskClient starter,
            FunctionContext executionContext)
        {
            var log = executionContext.GetLogger(nameof(GoogleStorageToAzureStart));
            try
            {
                var accessToken = await GoogleUtility.VerifyGoogleHeaderTokenIsValid(req).ConfigureAwait(false);
                string requestBody = await new StreamReader(req.Body).ReadToEndAsync().ConfigureAwait(false);
                var request = JsonConvert.DeserializeObject<GcsToAzureRequest>(requestBody)!;

                if (request.SelectedItems == null || request.SelectedItems.Count == 0)
                {
                    return new BadRequestObjectResult($"{nameof(request.SelectedItems)} must contain items");
                }
                request.AccessToken = accessToken;

                string instanceId = await starter.ScheduleNewOrchestrationInstanceAsync(
                    Constants.GcsToAzureOrchestrator, request).ConfigureAwait(false);
                log.LogInformation($"Started orchestration instance '{instanceId}'.");

                return CreateCheckStatusResponse(req, instanceId);
            }
            catch (UnauthorizedAccessException ex)
            {
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
