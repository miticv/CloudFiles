using System;
using System.IO;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.WebJobs;
using Microsoft.Azure.WebJobs.Extensions.Http;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json;
using System.Collections.Generic;
using CloudFiles.Utilities;
using Microsoft.Extensions.Primitives;
using System.Linq;
using CloudFiles.Models.Google;
using CloudFiles.Models;
using Azure;

namespace Ada.File
{
    public static class BFF
    {
        // azure/file/item?path=2011 PhotoShoot Feng/Feng-2.jpg
        [FunctionName(Constants.azureFileGetItem)]
        public static async Task<IActionResult> GetItem(
            [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "azure/file/item")] HttpRequest req,
            ILogger log)
        {
            string path = req.Query["path"];
            if (string.IsNullOrEmpty(path))
            {
                return new BadRequestObjectResult("You must include `path` in the query parameter");
            }
            var connectionString = Environment.GetEnvironmentVariable("AzureWebJobsStorage");
            var containerName = Environment.GetEnvironmentVariable("AzureContainer");
            var azureUtility = new AzureUtility(connectionString, containerName);
            log.LogInformation($"{Constants.azureFileGetItem} function processing a request for path=`{path}`.");
            try {
                return await azureUtility.GetHttpItemAsync(path).ConfigureAwait(false);
            }
            catch (RequestFailedException ex)
            {
                if (ex.Status == StatusCodes.Status404NotFound)
                {
                    log.LogWarning(ex, $"{Constants.azureFileGetItem} function not found for path=`{path}`.");
                    return new NotFoundObjectResult(ErrorUtility.FormatErrorMessage("The specified blob does not exist."));
                }
                else {
                    log.LogError(ex, $"{Constants.azureFileGetItem} function error for path=`{path}`.");
                    return new StatusCodeResult(StatusCodes.Status500InternalServerError);
                }
            }
        }

        // azure/file/list?path=2011 PhotoShoot Feng
        [FunctionName(Constants.azureFileList)]
        public static async Task<IActionResult> List(
            [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "azure/file/list")] HttpRequest req,
            ILogger log)
        {
            string path = req.Query["path"];

            string pagesizestring = req.Query["pagesize"];
            bool success = int.TryParse(pagesizestring, out int trypagesize);
            if (!string.IsNullOrEmpty(pagesizestring) && !success)
            {
                return new BadRequestObjectResult("Query parameter `pagesize` must me integer");
            }
            int? pagesize = trypagesize == 0 ? 5000 : trypagesize;

            var connectionString = Environment.GetEnvironmentVariable("AzureWebJobsStorage");
            var containerName = Environment.GetEnvironmentVariable("AzureContainer");
            var azureUtility = new AzureUtility(connectionString, containerName);
            log.LogInformation($"{Constants.azureFileList} function processing a request for path=`{path}` and pagesize of {pagesize}.");
            var fileList = await azureUtility.ItemShallowListingAsync(path, pagesize).ConfigureAwait(false);

            return new OkObjectResult(fileList);
        }

        //[FunctionName(Constants.googleToken)]
        //public static async Task<IActionResult> GoogleToken(
        //    [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "google/token")] HttpRequest req,
        //    ILogger log)
        //{
        //    var clientId = Environment.GetEnvironmentVariable("GooglePhotoClientId");
        //    var clientSecret = Environment.GetEnvironmentVariable("GooglePhotoClientSecret");
        //    var uiRedirectUrl = Environment.GetEnvironmentVariable("UiRedirectUrl");

        //    string code = req.Query["code"];
        //    if (string.IsNullOrEmpty(code))
        //    {
        //        return new BadRequestObjectResult("Please include `code` in the query parameter: ?code=yourauthcode");
        //    }
        //    log.LogInformation($"{Constants.googleToken} function processing a request for UiRedirectUrl=`{uiRedirectUrl}`.");
        //    try
        //    {
        //        var result = await GoogleUtility.GetGoogleAccessTokenAsync(clientId, clientSecret, WebUtility.UrlDecode(code), uiRedirectUrl).ConfigureAwait(false);
        //        return new OkObjectResult(result);
        //    }
        //    catch (Exception ex) {
        //        log.LogError(ex, $"{Constants.googleToken} function error.");
        //        throw;
        //        // return new ObjectResult(ex.Message) { StatusCode = StatusCodes.Status500InternalServerError };
        //    }
        //}

        [FunctionName(Constants.googleAlbumList)]
        public static async Task<IActionResult> GoogleAlbumList(
            [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "google/album/list")] HttpRequest req,
            ILogger log)
        {
            try
            {
                var accessToken = GetTokenFromHeaders(req);

                var response = new AlbumListResponse
                {
                    Albums = new List<Album>()
                };

                log.LogInformation($"{Constants.googleAlbumList} function processing {nameof(GoogleUtility.ListAlbumsAsync)}.");
                // loop until nextPageToken is null:
                var result = new AlbumListResponse();
                do
                {
                    result = await GoogleUtility.ListAlbumsAsync(accessToken, result.NextPageToken).ConfigureAwait(false);
                    if (result.Albums?.Count > 0)
                    {
                        response.Albums.AddRange(result.Albums);
                    }
                } while (result.NextPageToken != null);

                return new OkObjectResult(response);
            }
            catch(InvalidOperationException ex) {
                return new BadRequestObjectResult(ex.Message);
            }
        }

        [FunctionName(Constants.googleAlbumAdd)]
        public static async Task<IActionResult> GoogleAlbumAdd(
            [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "google/album")] HttpRequest req,
            ILogger log)
        {
            try {
                string accessToken = GetTokenFromHeaders(req);

                string requestBody = await new StreamReader(req.Body).ReadToEndAsync().ConfigureAwait(false);
                var data = JsonConvert.DeserializeObject<AlbumCreate>(requestBody);
                if (data?.Title == null)
                {
                    return new BadRequestObjectResult("Please include Title in the body of the post");
                }

                log.LogInformation($"{Constants.googleAlbumAdd} function processing {nameof(GoogleUtility.AddAlbumAsync)}.");
                var created = await GoogleUtility.AddAlbumAsync(accessToken, data.Title).ConfigureAwait(false);
                return new OkObjectResult(created);
            }
            catch(InvalidOperationException ex) {
                return new BadRequestObjectResult(ex.Message);
            }
        }

        private static string GetTokenFromHeaders(HttpRequest req) {
            var success = req.Headers.TryGetValue("Authorization", out StringValues values);
            if (!success)
            {
               throw new InvalidOperationException("Please include Authorization header with bearer token");
            }
            return values.FirstOrDefault()?.Replace("Bearer ", "").Replace("bearer ", "");
        }
    }
}
