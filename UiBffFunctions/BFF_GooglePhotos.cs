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
using CloudFiles.Models.Google;
using CloudFiles.Models;
using Microsoft.Azure.WebJobs.Extensions.OpenApi.Core.Attributes;
using Microsoft.OpenApi.Models;
using Microsoft.Azure.WebJobs.Extensions.OpenApi.Core.Enums;
using System.Net;

namespace CloudFiles
{
    public static class BFF_GooglePhotos
    {
        [OpenApiOperation(operationId: Constants.GoogleAlbumList, tags: new[] { "Google" }, Summary = "List Google Albums")]
        [OpenApiSecurity("Bearer token", SecuritySchemeType.ApiKey, Name = "Authorization", In = OpenApiSecurityLocationType.Header, Description = "Google bearer token")]
        [OpenApiResponseWithBody(statusCode: HttpStatusCode.OK, contentType: "application/json", bodyType: typeof(List<AlbumListResponse>))]

        [FunctionName(Constants.GoogleAlbumList)]
        public static async Task<IActionResult> GoogleAlbumList(
            [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "google/album/list")] HttpRequest req,
            ILogger log)
        {
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

        [OpenApiOperation(operationId: Constants.GoogleAlbumAdd, tags: new[] { "Google" }, Summary = "Add Google Album")]
        [OpenApiSecurity("Bearer token", SecuritySchemeType.ApiKey, Name = "Authorization", In = OpenApiSecurityLocationType.Header, Description = "Google bearer token")]
        [OpenApiRequestBody("Album Create",  typeof(AlbumCreate))]
        [OpenApiResponseWithBody(statusCode: HttpStatusCode.OK, contentType: "application/json", bodyType: typeof(AlbumCreateResponse))]

        [FunctionName(Constants.GoogleAlbumAdd)]
        public static async Task<IActionResult> GoogleAlbumAdd(
            [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "google/album")] HttpRequest req,
            ILogger log)
        {
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
    }
}
