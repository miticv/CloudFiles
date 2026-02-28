using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.Functions.Worker;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using CloudFiles.Utilities;
using CloudFiles.Models;

namespace CloudFiles
{
    public static class BFF_GoogleStorage
    {
        // ?bucket=my-bucket&path=2011 PhotoShoot Feng
        [Function(Constants.GoogleFileList)]
        public static async Task<IActionResult> GoogleFileList(
             [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "google/files/list")] HttpRequest req,
             FunctionContext executionContext)
        {
            var log = executionContext.GetLogger(nameof(GoogleFileList));
            try
            {
                var accessToken = await GoogleUtility.VerifyGoogleHeaderTokenIsValid(req).ConfigureAwait(false);
                string path = req.Query["path"];
                string bucket = req.Query["bucket"];

                if (string.IsNullOrEmpty(bucket))
                {
                    return new BadRequestObjectResult("bucket query parameter is required.");
                }

                var googleUtility = GoogleUtility.Create(accessToken, bucket);

                log.LogInformation($"{Constants.GoogleFileList} function processing a request for bucket=`{bucket}`, path=`{path}`.");
                var fileList = await googleUtility.ItemShallowListingAsync(path).ConfigureAwait(false);

                var uiObject = fileList.Select(s => new ItemUI
                {
                    IsFolder = s.IsFolder,
                    ItemPath = s.ItemPath,
                    ItemName = s.ItemPath.GetItemNameFromPath(),
                    ItemType = s.ItemPath.GetItemTypeFromPath()
                });
                return new OkObjectResult(uiObject);
            }
            catch (UnauthorizedAccessException ex)
            {
                log.LogError(ex.Message);
                return new StatusCodeResult(StatusCodes.Status401Unauthorized);
            }
            catch (Exception ex)
            {
                log.LogError(ex, $"Unexpected error in {Constants.GoogleFileList}");
                return new StatusCodeResult(StatusCodes.Status500InternalServerError);
            }
        }

        // ?projectId=my-gcp-project
        [Function(Constants.GoogleStorageBucketList)]
        public static async Task<IActionResult> GoogleStorageBucketList(
             [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "google/storage/buckets")] HttpRequest req,
             FunctionContext executionContext)
        {
            var log = executionContext.GetLogger(nameof(GoogleStorageBucketList));
            try
            {
                var accessToken = await GoogleUtility.VerifyGoogleHeaderTokenIsValid(req).ConfigureAwait(false);
                string projectId = req.Query["projectId"];

                if (string.IsNullOrEmpty(projectId))
                {
                    return new BadRequestObjectResult("projectId query parameter is required.");
                }

                var googleUtility = GoogleUtility.Create(accessToken);
                log.LogInformation($"{Constants.GoogleStorageBucketList} function listing buckets for project=`{projectId}`.");
                var buckets = await googleUtility.ListBucketsAsync(projectId).ConfigureAwait(false);

                return new OkObjectResult(buckets);
            }
            catch (UnauthorizedAccessException ex)
            {
                log.LogError(ex.Message);
                return new StatusCodeResult(StatusCodes.Status401Unauthorized);
            }
            catch (Exception ex)
            {
                log.LogError(ex, $"Unexpected error in {Constants.GoogleStorageBucketList}");
                return new StatusCodeResult(StatusCodes.Status500InternalServerError);
            }
        }
    }
}
