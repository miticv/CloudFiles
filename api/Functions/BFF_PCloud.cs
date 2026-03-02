using System;
using System.IO;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.Functions.Worker;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using CloudFiles.Utilities;
using CloudFiles.Models;
using Newtonsoft.Json;

namespace CloudFiles
{
    public static class BFF_PCloud
    {
        [Function(Constants.PCloudOAuthCallback)]
        public static async Task<IActionResult> PCloudOAuthCallback(
            [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "pcloud/oauth/callback")] HttpRequest req,
            FunctionContext executionContext)
        {
            var log = executionContext.GetLogger(nameof(PCloudOAuthCallback));
            try
            {
                // Verify the user has a valid CloudFiles JWT
                var cfToken = CommonUtility.GetTokenFromHeaders(req);
                UserTableUtility.ValidateJwt(cfToken);

                var body = await new StreamReader(req.Body).ReadToEndAsync().ConfigureAwait(false);
                var request = JsonConvert.DeserializeObject<PCloudOAuthCallbackRequest>(body);

                if (request == null || string.IsNullOrEmpty(request.Code) || string.IsNullOrEmpty(request.Hostname))
                {
                    return new BadRequestObjectResult("code and hostname are required.");
                }

                // Validate hostname
                if (request.Hostname != "api.pcloud.com" && request.Hostname != "eapi.pcloud.com")
                {
                    return new BadRequestObjectResult("Invalid pCloud API hostname.");
                }

                log.LogInformation($"Exchanging pCloud OAuth code for token (hostname: {request.Hostname})");

                var tokenResponse = await PCloudUtility.ExchangeCodeForTokenAsync(request.Code, request.Hostname)
                    .ConfigureAwait(false);

                return new OkObjectResult(tokenResponse);
            }
            catch (UnauthorizedAccessException ex)
            {
                log.LogError(ex.Message);
                return new StatusCodeResult(StatusCodes.Status401Unauthorized);
            }
            catch (Exception ex)
            {
                log.LogError(ex, $"Error in {Constants.PCloudOAuthCallback}");
                return new StatusCodeResult(StatusCodes.Status500InternalServerError);
            }
        }

        [Function(Constants.PCloudFileList)]
        public static async Task<IActionResult> PCloudFileList(
            [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "pcloud/files/list")] HttpRequest req,
            FunctionContext executionContext)
        {
            var log = executionContext.GetLogger(nameof(PCloudFileList));
            try
            {
                var (accessToken, apiHostname) = PCloudUtility.VerifyPCloudHeaderTokenIsValid(req);

                string folderIdStr = req.Query["folderId"];
                long folderId = 0;
                if (!string.IsNullOrEmpty(folderIdStr) && long.TryParse(folderIdStr, out var parsed))
                {
                    folderId = parsed;
                }

                var utility = PCloudUtility.Create(accessToken, apiHostname);
                log.LogInformation($"{Constants.PCloudFileList}: listing folderId={folderId}");

                var result = await utility.ListFolderAsync(folderId).ConfigureAwait(false);
                return new OkObjectResult(result);
            }
            catch (UnauthorizedAccessException ex)
            {
                log.LogError(ex.Message);
                return new StatusCodeResult(StatusCodes.Status401Unauthorized);
            }
            catch (InvalidOperationException ex)
            {
                log.LogError(ex, $"pCloud API error in {Constants.PCloudFileList}");
                return new BadRequestObjectResult(ex.Message);
            }
            catch (Exception ex)
            {
                log.LogError(ex, $"Unexpected error in {Constants.PCloudFileList}");
                return new StatusCodeResult(StatusCodes.Status500InternalServerError);
            }
        }
    }

    // Request model for OAuth callback
    public class PCloudOAuthCallbackRequest
    {
        [JsonProperty("code")]
        public string Code { get; set; } = default!;

        [JsonProperty("hostname")]
        public string Hostname { get; set; } = default!;
    }
}
