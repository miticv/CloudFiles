using AdaFile.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.WebJobs;
using Microsoft.Azure.WebJobs.Extensions.DurableTask;
using Microsoft.Azure.WebJobs.Extensions.Http;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json;
using System.IO;
using System.Threading.Tasks;

namespace AdaFile
{
    public static class HttpFunctions
    {
        [FunctionName(Constants.ProcessAzureToGoogleStart)]
        public static async Task<IActionResult> AzureToGoogleStarter(
            [HttpTrigger(AuthorizationLevel.Function, "post", Route = "process/AzureToGoogle/start")] HttpRequest req,
            [DurableClient] IDurableOrchestrationClient starter,
            ILogger log)
        {
            string requestBody = await new StreamReader(req.Body).ReadToEndAsync().ConfigureAwait(false);
            var request = JsonConvert.DeserializeObject<FilesCopyRequest>(requestBody);

            if (string.IsNullOrEmpty(request.AccessToken))
            {
                return new BadRequestObjectResult($"{nameof(request.AccessToken)} is required");
            }
            if (request.SelectedItemsList == null || request.SelectedItemsList.Count == 0)
            {
                return new BadRequestObjectResult($"{nameof(request.SelectedItemsList)} must contain items");
            }

            string instanceId = await starter.StartNewAsync(Constants.AzureToGoogleOrchestrator, null, request).ConfigureAwait(false);
            log.LogInformation($"Started orchestration instance '{instanceId}'.");

            return starter.CreateCheckStatusResponse(req, instanceId);
        }
    }
}
