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

namespace CloudFiles.DropboxToGoogleDrive
{
    public static class HttpFunctions
    {
        [Function(Constants.ProcessDropboxToDrive_Start)]
        public static async Task<IActionResult> DropboxToDriveStart(
            [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "process/DropboxToGoogleDrive/start")] HttpRequest req,
            [DurableClient] DurableTaskClient starter,
            FunctionContext executionContext)
        {
            var log = executionContext.GetLogger(nameof(DropboxToDriveStart));
            try
            {
                var dropboxToken = DropboxUtility.VerifyDropboxHeaderTokenIsValid(req);
                string requestBody = await new StreamReader(req.Body).ReadToEndAsync().ConfigureAwait(false);
                var request = JsonConvert.DeserializeObject<DropboxToDriveRequest>(requestBody)!;

                if (request.Items == null || request.Items.Count == 0)
                {
                    return new BadRequestObjectResult($"{nameof(request.Items)} must contain items");
                }
                request.DropboxAccessToken = dropboxToken;

                string instanceId = await starter.ScheduleNewOrchestrationInstanceAsync(
                    Constants.DropboxToDriveOrchestrator, request).ConfigureAwait(false);
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
