using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.Functions.Worker;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using CloudFiles.Utilities;
using CloudFiles.Models;

namespace CloudFiles
{
    public static class BFF_GoogleDrive
    {
        [Function(Constants.GoogleDriveFileList)]
        public static async Task<IActionResult> GoogleDriveFileList(
            [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "google/drive/files")] HttpRequest req,
            FunctionContext executionContext)
        {
            var log = executionContext.GetLogger(nameof(GoogleDriveFileList));
            try
            {
                var accessToken = await GoogleUtility.VerifyGoogleHeaderTokenIsValid(req).ConfigureAwait(false);

                string folderId = req.Query["folderId"];
                string pageToken = req.Query["pageToken"];

                if (string.IsNullOrEmpty(folderId)) folderId = "root";

                var googleUtility = GoogleUtility.Create(accessToken);
                log.LogInformation($"{Constants.GoogleDriveFileList}: listing folderId='{folderId}'");

                var result = await googleUtility.ListDriveFilesAsync(folderId, pageToken).ConfigureAwait(false);
                return new OkObjectResult(result);
            }
            catch (UnauthorizedAccessException ex)
            {
                log.LogError(ex.Message);
                return new StatusCodeResult(StatusCodes.Status401Unauthorized);
            }
            catch (InvalidOperationException ex)
            {
                log.LogError(ex, $"Google Drive API error in {Constants.GoogleDriveFileList}");
                return new BadRequestObjectResult(ex.Message);
            }
            catch (Exception ex)
            {
                log.LogError(ex, $"Unexpected error in {Constants.GoogleDriveFileList}");
                return new StatusCodeResult(StatusCodes.Status500InternalServerError);
            }
        }
    }
}
