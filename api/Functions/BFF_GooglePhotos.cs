using System;
using System.IO;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.Functions.Worker;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json;
using System.Collections.Generic;
using CloudFiles.Utilities;
using CloudFiles.Models.Google;
using CloudFiles.Models;
using System.Net;

namespace CloudFiles
{
    public static class BFF_GooglePhotos
    {
        [Function(Constants.GoogleAlbumList)]
        public static async Task<IActionResult> GoogleAlbumList(
            [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "google/album/list")] HttpRequest req,
            FunctionContext executionContext)
        {
            var log = executionContext.GetLogger(nameof(GoogleAlbumList));
            try
            {
                var googleAccessToken = await GoogleUtility.VerifyGoogleHeaderTokenIsValid(req).ConfigureAwait(false);

                var response = new AlbumListResponse
                {
                    Albums = new List<Album>()
                };

                log.LogInformation($"{Constants.GoogleAlbumList} function processing {nameof(GoogleUtility.ListAlbumsAsync)}.");
                // loop until nextPageToken is null:
                var result = new AlbumListResponse();
                do
                {
                    result = await GoogleUtility.ListAlbumsAsync(googleAccessToken, result.NextPageToken).ConfigureAwait(false);
                    if (result.Albums?.Count > 0)
                    {
                        response.Albums.AddRange(result.Albums);
                    }
                } while (result.NextPageToken != null);

                return new OkObjectResult(response);
            }
            catch (UnauthorizedAccessException ex)
            {
                log.LogError(ex.Message);
                return new StatusCodeResult(StatusCodes.Status401Unauthorized);
            }
            catch (InvalidOperationException ex) {
                return new BadRequestObjectResult(ex.Message);
            }
        }

        [Function(Constants.GoogleAlbumAdd)]
        public static async Task<IActionResult> GoogleAlbumAdd(
            [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "google/album")] HttpRequest req,
            FunctionContext executionContext)
        {
            var log = executionContext.GetLogger(nameof(GoogleAlbumAdd));
            try {
                var googleAccessToken = await GoogleUtility.VerifyGoogleHeaderTokenIsValid(req).ConfigureAwait(false);

                string requestBody = await new StreamReader(req.Body).ReadToEndAsync().ConfigureAwait(false);
                var data = JsonConvert.DeserializeObject<AlbumCreate>(requestBody);
                if (data?.Title == null)
                {
                    return new BadRequestObjectResult("Please include Title in the body of the post");
                }

                log.LogInformation($"{Constants.GoogleAlbumAdd} function processing {nameof(GoogleUtility.AddAlbumAsync)}.");
                var created = await GoogleUtility.AddAlbumAsync(googleAccessToken, data.Title).ConfigureAwait(false);
                return new OkObjectResult(created);
            }
            catch (UnauthorizedAccessException ex)
            {
                log.LogError(ex.Message);
                return new StatusCodeResult(StatusCodes.Status401Unauthorized);
            }
            catch (InvalidOperationException ex)
            {
                return new BadRequestObjectResult(ex.Message);
            }
        }
        // --- Google Photos Picker API endpoints ---

        [Function(Constants.GooglePhotosCreateSession)]
        public static async Task<IActionResult> GooglePhotosCreateSession(
            [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "google/photos/sessions")] HttpRequest req,
            FunctionContext executionContext)
        {
            var log = executionContext.GetLogger(nameof(GooglePhotosCreateSession));
            try
            {
                var accessToken = await GoogleUtility.VerifyGoogleHeaderTokenIsValid(req).ConfigureAwait(false);
                log.LogInformation("Creating Google Photos Picker session.");
                var session = await GoogleUtility.CreatePickerSessionAsync(accessToken).ConfigureAwait(false);
                return new OkObjectResult(session);
            }
            catch (UnauthorizedAccessException ex)
            {
                log.LogError(ex.Message);
                return new StatusCodeResult(StatusCodes.Status401Unauthorized);
            }
            catch (InvalidOperationException ex)
            {
                return new BadRequestObjectResult(ex.Message);
            }
        }

        [Function(Constants.GooglePhotosGetSession)]
        public static async Task<IActionResult> GooglePhotosGetSession(
            [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "google/photos/sessions/{sessionId}")] HttpRequest req,
            string sessionId,
            FunctionContext executionContext)
        {
            var log = executionContext.GetLogger(nameof(GooglePhotosGetSession));
            try
            {
                var accessToken = await GoogleUtility.VerifyGoogleHeaderTokenIsValid(req).ConfigureAwait(false);
                var session = await GoogleUtility.GetPickerSessionAsync(accessToken, sessionId).ConfigureAwait(false);
                return new OkObjectResult(session);
            }
            catch (UnauthorizedAccessException ex)
            {
                log.LogError(ex.Message);
                return new StatusCodeResult(StatusCodes.Status401Unauthorized);
            }
            catch (InvalidOperationException ex)
            {
                return new BadRequestObjectResult(ex.Message);
            }
        }

        [Function(Constants.GooglePhotosSessionMedia)]
        public static async Task<IActionResult> GooglePhotosSessionMedia(
            [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "google/photos/sessions/{sessionId}/media")] HttpRequest req,
            string sessionId,
            FunctionContext executionContext)
        {
            var log = executionContext.GetLogger(nameof(GooglePhotosSessionMedia));
            try
            {
                var accessToken = await GoogleUtility.VerifyGoogleHeaderTokenIsValid(req).ConfigureAwait(false);

                var allItems = new List<PickedMediaItem>();
                var result = new PickedMediaItemsResponse();
                do
                {
                    result = await GoogleUtility.ListPickedMediaItemsAsync(accessToken, sessionId, result.NextPageToken).ConfigureAwait(false);
                    if (result.MediaItems?.Count > 0)
                    {
                        allItems.AddRange(result.MediaItems);
                    }
                } while (result.NextPageToken != null);

                return new OkObjectResult(new PickedMediaItemsResponse { MediaItems = allItems });
            }
            catch (UnauthorizedAccessException ex)
            {
                log.LogError(ex.Message);
                return new StatusCodeResult(StatusCodes.Status401Unauthorized);
            }
            catch (InvalidOperationException ex)
            {
                return new BadRequestObjectResult(ex.Message);
            }
        }

        [Function(Constants.GooglePhotosDeleteSession)]
        public static async Task<IActionResult> GooglePhotosDeleteSession(
            [HttpTrigger(AuthorizationLevel.Anonymous, "delete", Route = "google/photos/sessions/{sessionId}")] HttpRequest req,
            string sessionId,
            FunctionContext executionContext)
        {
            var log = executionContext.GetLogger(nameof(GooglePhotosDeleteSession));
            try
            {
                var accessToken = await GoogleUtility.VerifyGoogleHeaderTokenIsValid(req).ConfigureAwait(false);
                await GoogleUtility.DeletePickerSessionAsync(accessToken, sessionId).ConfigureAwait(false);
                return new OkResult();
            }
            catch (UnauthorizedAccessException ex)
            {
                log.LogError(ex.Message);
                return new StatusCodeResult(StatusCodes.Status401Unauthorized);
            }
            catch (InvalidOperationException ex)
            {
                return new BadRequestObjectResult(ex.Message);
            }
        }

        [Function(Constants.GooglePhotosImageProxy)]
        public static async Task<IActionResult> GooglePhotosImageProxy(
            [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "google/photos/image")] HttpRequest req,
            FunctionContext executionContext)
        {
            var log = executionContext.GetLogger(nameof(GooglePhotosImageProxy));
            try
            {
                var accessToken = await GoogleUtility.VerifyGoogleHeaderTokenIsValid(req).ConfigureAwait(false);

                var url = req.Query["url"].ToString();
                if (string.IsNullOrWhiteSpace(url))
                {
                    return new BadRequestObjectResult("url query parameter is required");
                }

                var (data, contentType) = await GoogleUtility.ProxyPickerImageAsync(url, accessToken).ConfigureAwait(false);
                return new FileContentResult(data, contentType);
            }
            catch (UnauthorizedAccessException ex)
            {
                log.LogError(ex.Message);
                return new StatusCodeResult(StatusCodes.Status401Unauthorized);
            }
            catch (InvalidOperationException ex)
            {
                return new BadRequestObjectResult(ex.Message);
            }
        }
    }
}
