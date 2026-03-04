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

namespace CloudFiles.PCloudToGcs
{
    public static class HttpFunctions
    {
        [Function(Constants.ProcessPCloudToGcs_Start)]
        public static async Task<IActionResult> PCloudToGcsStart(
            [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "process/PCloudToGcs/start")] HttpRequest req,
            [DurableClient] DurableTaskClient starter,
            FunctionContext executionContext)
        {
            var log = executionContext.GetLogger(nameof(PCloudToGcsStart));
            try
            {
                var (pcloudToken, pcloudHostname) = PCloudUtility.VerifyPCloudHeaderTokenIsValid(req);
                string requestBody = await new StreamReader(req.Body).ReadToEndAsync().ConfigureAwait(false);
                var request = JsonConvert.DeserializeObject<PCloudToGcsRequest>(requestBody)!;

                if (request.Items == null || request.Items.Count == 0)
                {
                    return new BadRequestObjectResult($"{nameof(request.Items)} must contain items");
                }
                request.PCloudAccessToken = pcloudToken;
                request.PCloudHostname = pcloudHostname;

                string instanceId = await starter.ScheduleNewOrchestrationInstanceAsync(
                    Constants.PCloudToGcsOrchestrator, request).ConfigureAwait(false);
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
