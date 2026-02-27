using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.Functions.Worker;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using System.Collections.Generic;
using CloudFiles.Utilities;
using CloudFiles.Models;
using System.Net;

namespace CloudFiles
{
    public static class BFF_GoogleStorage
    {
        // ?path=2011 PhotoShoot Feng
        [Function(Constants.GoogleFileList)]
        public static async Task<IActionResult> GoogleFileList(
             [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "google/files/list")] HttpRequest req,
             FunctionContext executionContext)
        {
            var log = executionContext.GetLogger(nameof(GoogleFileList));
            try
            {
                await GoogleUtility.VerifyGoogleHeaderTokenIsValid(req).ConfigureAwait(false);
                string path = req.Query["path"];

                var googleUtility = await GoogleUtility.CreateAsync().ConfigureAwait(false);
                log.LogInformation($"{Constants.GoogleFileList} function processing a request for path=`{path}`.");
                var fileList = await googleUtility.ItemShallowListingAsync(path).ConfigureAwait(false);

                return new OkObjectResult(fileList);
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

    }
}
