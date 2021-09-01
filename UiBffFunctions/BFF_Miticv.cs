using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.WebJobs;
using Microsoft.Azure.WebJobs.Extensions.Http;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using CloudFiles.Utilities;
using CloudFiles.Models;
using Azure;
using Microsoft.Azure.WebJobs.Extensions.OpenApi.Core.Attributes;
using Microsoft.OpenApi.Models;
using Microsoft.Azure.WebJobs.Extensions.OpenApi.Core.Enums;
using System.Net;
using System.Collections.Generic;

namespace CloudFiles
{
    public static class BFF_miticv
    {
        [FunctionName(Constants.GoogleGetServiceToken)]
        public static async Task<IActionResult> GetServiceToken(
            [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "google/miticv/getServiceToken")] HttpRequest req,
            ILogger log)
        {
            if (string.IsNullOrEmpty(Environment.GetEnvironmentVariable("IS_RUNNING_LOCALLY"))) {
                return new BadRequestObjectResult("This API is only allowed for local debugging");
            }

            log.LogInformation($"{Constants.GoogleGetServiceToken} call {req.Path}");

            var googleUtility = await GoogleUtility.CreateAsync().ConfigureAwait(false);

            var token  = googleUtility.GetServiceToken();
            return new OkObjectResult(token);
        }

        /********************************************************************************************************************************************/

        [OpenApiOperation(operationId: Constants.AzureFileGetItem, tags: new[] { "Azure" }, Summary = "Get item from azure storage", Description = "It will display the image to the browser", Visibility = OpenApiVisibilityType.Important)]
        [OpenApiSecurity("Bearer token", SecuritySchemeType.ApiKey, Name = "Authorization", In = OpenApiSecurityLocationType.Header, Description = "Google bearer token")]
        [OpenApiParameter(name: "path", In = ParameterLocation.Query, Required = true, Type = typeof(string), Summary = "path to the resource", Description = "example: '2011 PhotoShoot Feng/Feng-1.jpg'", Visibility = OpenApiVisibilityType.Important)]
        [OpenApiResponseWithBody(statusCode: HttpStatusCode.OK, contentType: "application/pdf", bodyType: typeof(byte[]), Description = "It will return image with proper media type to show on the browser")]

        // azure/file/item?path=2011 PhotoShoot Feng/Feng-2.jpg
        [FunctionName(Constants.AzureFileGetItem)]
        public static async Task<IActionResult> GetItem(
            [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "azure/miticv/file/item")] HttpRequest req,
            ILogger log)
        {
            await GoogleUtility.VerifyGoogleHeaderTokenIsValid(req).ConfigureAwait(false);
            string path = req.Query["path"];
            try
            {
                if (string.IsNullOrEmpty(path))
                {
                    return new BadRequestObjectResult("You must include `path` in the query parameter");
                }
                var connectionString = Environment.GetEnvironmentVariable("AzureWebJobsStorage");
                var containerName = Environment.GetEnvironmentVariable("AzureContainer");
                var azureUtility = new AzureUtility(connectionString, containerName);
                log.LogInformation($"{Constants.AzureFileGetItem} call for path=`{path}`.");
                return await azureUtility.GetHttpItemAsync(path).ConfigureAwait(false);
            }
            catch (RequestFailedException ex)
            {
                if (ex.Status == StatusCodes.Status404NotFound)
                {
                    log.LogWarning(ex, $"{Constants.AzureFileGetItem} call for path=``{path}`.");
                    return new NotFoundObjectResult(CommonUtility.FormatErrorMessage("The specified blob does not exist."));
                }
                else
                {
                    log.LogError(ex, $"{Constants.AzureFileGetItem} error for path=`{path}`.");
                    return new StatusCodeResult(StatusCodes.Status500InternalServerError);
                }
            }
        }

        [OpenApiOperation(operationId: Constants.AzureFileList, tags: new[] { "Azure" }, Summary = "Get list of items from azure storage path", Description = "It will display the list of items contained in ths path", Visibility = OpenApiVisibilityType.Important)]
        [OpenApiSecurity("Bearer token", SecuritySchemeType.ApiKey, Name = "Authorization", In = OpenApiSecurityLocationType.Header, Description = "Google bearer token")]
        [OpenApiParameter(name: "path", In = ParameterLocation.Query, Required = false, Type = typeof(string), Summary = "path to the resource", Description = "example: '2011 PhotoShoot Feng'", Visibility = OpenApiVisibilityType.Important)]
        [OpenApiParameter(name: "pagesize", In = ParameterLocation.Query, Required = false, Type = typeof(int), Summary = "page size if needed", Visibility = OpenApiVisibilityType.Advanced)]
        [OpenApiResponseWithBody(statusCode: HttpStatusCode.OK, contentType: "application/json", bodyType: typeof(List<Item>))]

        // azure/file/list?path=2011 PhotoShoot Feng
        [FunctionName(Constants.AzureFileList)]
        public static async Task<IActionResult> List(
            [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "azure/miticv/file/list")] HttpRequest req,
            ILogger log)
        {
            await GoogleUtility.VerifyGoogleHeaderTokenIsValid(req).ConfigureAwait(false);
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
            log.LogInformation($"{Constants.AzureFileList} function processing a request for path=`{path}` and pagesize of {pagesize}.");
            var fileList = await azureUtility.ItemShallowListingAsync(path, pagesize).ConfigureAwait(false);

            return new OkObjectResult(fileList);
        }

        [OpenApiOperation(operationId: Constants.GoogleFileList, tags: new[] { "Google" }, Summary = "Get list of items from google storage path", Description = "It will display the list of items contained in ths path", Visibility = OpenApiVisibilityType.Important)]
        [OpenApiSecurity("Bearer token", SecuritySchemeType.ApiKey, Name = "Authorization", In = OpenApiSecurityLocationType.Header, Description = "Google bearer token")]
        [OpenApiParameter(name: "path", In = ParameterLocation.Query, Required = false, Type = typeof(string), Summary = "path to the resource", Description = "example: '2011 PhotoShoot Feng'", Visibility = OpenApiVisibilityType.Important)]
        [OpenApiIgnore]

        [OpenApiResponseWithBody(statusCode: HttpStatusCode.OK, contentType: "application/json", bodyType: typeof(List<Item>))]
        // azure/file/list?path=2011 PhotoShoot Feng
        [FunctionName(Constants.GoogleFileList)]
        public static async Task<IActionResult> GoogleFileList(
            [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "google/miticv/file/list")] HttpRequest req,
            ILogger log)
        {
            await GoogleUtility.VerifyGoogleHeaderTokenIsValid(req).ConfigureAwait(false);
            string path = req.Query["path"];

            var googleUtility = await GoogleUtility.CreateAsync().ConfigureAwait(false);
            log.LogInformation($"{Constants.GoogleFileList} function processing a request for path=`{path}`.");
            var fileList = await googleUtility.ItemShallowListingAsync(path).ConfigureAwait(false);

            return new OkObjectResult(fileList);
        }
    }
}
