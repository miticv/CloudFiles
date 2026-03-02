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
    public static class BFF_Dropbox
    {
        [Function(Constants.DropboxOAuthCallback)]
        public static async Task<IActionResult> DropboxOAuthCallback(
            [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "dropbox/oauth/callback")] HttpRequest req,
            FunctionContext executionContext)
        {
            var log = executionContext.GetLogger(nameof(DropboxOAuthCallback));
            try
            {
                // Verify the user has a valid CloudFiles JWT
                var cfToken = CommonUtility.GetTokenFromHeaders(req);
                UserTableUtility.ValidateJwt(cfToken);

                var body = await new StreamReader(req.Body).ReadToEndAsync().ConfigureAwait(false);
                var request = JsonConvert.DeserializeObject<DropboxOAuthCallbackRequest>(body);

                if (request == null || string.IsNullOrEmpty(request.Code) || string.IsNullOrEmpty(request.RedirectUri))
                {
                    return new BadRequestObjectResult("code and redirectUri are required.");
                }

                log.LogInformation("Exchanging Dropbox OAuth code for token");

                var tokenResponse = await DropboxUtility.ExchangeCodeForTokenAsync(request.Code, request.RedirectUri)
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
                log.LogError(ex, $"Error in {Constants.DropboxOAuthCallback}");
                return new StatusCodeResult(StatusCodes.Status500InternalServerError);
            }
        }

        [Function(Constants.DropboxFileList)]
        public static async Task<IActionResult> DropboxFileList(
            [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "dropbox/files/list")] HttpRequest req,
            FunctionContext executionContext)
        {
            var log = executionContext.GetLogger(nameof(DropboxFileList));
            try
            {
                var accessToken = DropboxUtility.VerifyDropboxHeaderTokenIsValid(req);

                string path = req.Query["path"];
                if (path == null) path = "";

                var utility = DropboxUtility.Create(accessToken);
                log.LogInformation($"{Constants.DropboxFileList}: listing path='{path}'");

                var result = await utility.ListFolderAsync(path).ConfigureAwait(false);
                return new OkObjectResult(result);
            }
            catch (UnauthorizedAccessException ex)
            {
                log.LogError(ex.Message);
                return new StatusCodeResult(StatusCodes.Status401Unauthorized);
            }
            catch (InvalidOperationException ex)
            {
                log.LogError(ex, $"Dropbox API error in {Constants.DropboxFileList}");
                return new BadRequestObjectResult(ex.Message);
            }
            catch (Exception ex)
            {
                log.LogError(ex, $"Unexpected error in {Constants.DropboxFileList}");
                return new StatusCodeResult(StatusCodes.Status500InternalServerError);
            }
        }

        [Function(Constants.DropboxFileListContinue)]
        public static async Task<IActionResult> DropboxFileListContinue(
            [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "dropbox/files/list/continue")] HttpRequest req,
            FunctionContext executionContext)
        {
            var log = executionContext.GetLogger(nameof(DropboxFileListContinue));
            try
            {
                var accessToken = DropboxUtility.VerifyDropboxHeaderTokenIsValid(req);

                string cursor = req.Query["cursor"];
                if (string.IsNullOrEmpty(cursor))
                {
                    return new BadRequestObjectResult("cursor query parameter is required.");
                }

                var utility = DropboxUtility.Create(accessToken);
                log.LogInformation($"{Constants.DropboxFileListContinue}: continuing with cursor");

                var result = await utility.ListFolderContinueAsync(cursor).ConfigureAwait(false);
                return new OkObjectResult(result);
            }
            catch (UnauthorizedAccessException ex)
            {
                log.LogError(ex.Message);
                return new StatusCodeResult(StatusCodes.Status401Unauthorized);
            }
            catch (InvalidOperationException ex)
            {
                log.LogError(ex, $"Dropbox API error in {Constants.DropboxFileListContinue}");
                return new BadRequestObjectResult(ex.Message);
            }
            catch (Exception ex)
            {
                log.LogError(ex, $"Unexpected error in {Constants.DropboxFileListContinue}");
                return new StatusCodeResult(StatusCodes.Status500InternalServerError);
            }
        }

        [Function(Constants.DropboxDownloadFile)]
        public static async Task<IActionResult> DropboxDownloadFile(
            [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "dropbox/files/download")] HttpRequest req,
            FunctionContext executionContext)
        {
            var log = executionContext.GetLogger(nameof(DropboxDownloadFile));
            try
            {
                var accessToken = DropboxUtility.VerifyDropboxHeaderTokenIsValid(req);

                string path = req.Query["path"];
                if (string.IsNullOrEmpty(path))
                {
                    return new BadRequestObjectResult("path query parameter is required.");
                }

                var utility = DropboxUtility.Create(accessToken);
                log.LogInformation($"{Constants.DropboxDownloadFile}: downloading path='{path}'");

                var (data, contentType, filename) = await utility.DownloadFileAsync(path).ConfigureAwait(false);
                return new FileContentResult(data, contentType)
                {
                    FileDownloadName = filename
                };
            }
            catch (UnauthorizedAccessException ex)
            {
                log.LogError(ex.Message);
                return new StatusCodeResult(StatusCodes.Status401Unauthorized);
            }
            catch (InvalidOperationException ex)
            {
                log.LogError(ex, $"Dropbox API error in {Constants.DropboxDownloadFile}");
                return new BadRequestObjectResult(ex.Message);
            }
            catch (Exception ex)
            {
                log.LogError(ex, $"Unexpected error in {Constants.DropboxDownloadFile}");
                return new StatusCodeResult(StatusCodes.Status500InternalServerError);
            }
        }

        [Function(Constants.DropboxUploadFile)]
        public static async Task<IActionResult> DropboxUploadFile(
            [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "dropbox/files/upload")] HttpRequest req,
            FunctionContext executionContext)
        {
            var log = executionContext.GetLogger(nameof(DropboxUploadFile));
            try
            {
                var accessToken = DropboxUtility.VerifyDropboxHeaderTokenIsValid(req);

                string path = req.Query["path"];
                if (string.IsNullOrEmpty(path))
                {
                    return new BadRequestObjectResult("path query parameter is required.");
                }

                using var memoryStream = new MemoryStream();
                await req.Body.CopyToAsync(memoryStream).ConfigureAwait(false);
                var data = memoryStream.ToArray();

                var utility = DropboxUtility.Create(accessToken);
                log.LogInformation($"{Constants.DropboxUploadFile}: uploading to path='{path}' ({data.Length} bytes)");

                var result = await utility.UploadFileAsync(data, path).ConfigureAwait(false);
                return new OkObjectResult(result);
            }
            catch (UnauthorizedAccessException ex)
            {
                log.LogError(ex.Message);
                return new StatusCodeResult(StatusCodes.Status401Unauthorized);
            }
            catch (InvalidOperationException ex)
            {
                log.LogError(ex, $"Dropbox API error in {Constants.DropboxUploadFile}");
                return new BadRequestObjectResult(ex.Message);
            }
            catch (Exception ex)
            {
                log.LogError(ex, $"Unexpected error in {Constants.DropboxUploadFile}");
                return new StatusCodeResult(StatusCodes.Status500InternalServerError);
            }
        }
    }
}
