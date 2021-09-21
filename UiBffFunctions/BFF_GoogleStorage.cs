using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.WebJobs;
using Microsoft.Azure.WebJobs.Extensions.Http;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using System.Collections.Generic;
using CloudFiles.Utilities;
using CloudFiles.Models;
using Microsoft.Azure.WebJobs.Extensions.OpenApi.Core.Attributes;
using Microsoft.OpenApi.Models;
using Microsoft.Azure.WebJobs.Extensions.OpenApi.Core.Enums;
using System.Net;

namespace CloudFiles
{
    public static class BFF_GoogleStorage
    {
        [OpenApiOperation(operationId: Constants.GoogleFileList, tags: new[] { "Google" }, Summary = "Get list of items from google storage path")]
        [OpenApiSecurity("Bearer token", SecuritySchemeType.ApiKey, Name = "Authorization", In = OpenApiSecurityLocationType.Header, Description = "Google bearer token")]
        [OpenApiParameter(name: "path", In = ParameterLocation.Query, Required = false, Type = typeof(string), Summary = "path to the resource", Description = "example: `2011 PhotoShoot Feng`")]
        [OpenApiIgnore]

        [OpenApiResponseWithBody(statusCode: HttpStatusCode.OK, contentType: "application/json", bodyType: typeof(List<Item>))]
        // ?path=2011 PhotoShoot Feng
        [FunctionName(Constants.GoogleFileList)]
        public static async Task<IActionResult> GoogleFileList(
             [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "google/miticv/file/list")] HttpRequest req,
             ILogger log)
        {
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
        }

    }
}
