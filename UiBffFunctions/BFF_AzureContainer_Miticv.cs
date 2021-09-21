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
using System.Linq;

namespace CloudFiles
{
    public static class BFF_AzureContainer
    {
        [FunctionName(Constants.GoogleGetServiceToken)]
        public static async Task<IActionResult> GetServiceToken(
            [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "google/miticv/getServiceToken")] HttpRequest req,
            ILogger log)
        {
            if (Environment.GetEnvironmentVariable("IS_RUNNING_LOCALLY") != "true")
            {
                return new BadRequestObjectResult("This API is only allowed for local debugging");
            }

            log.LogInformation($"{Constants.GoogleGetServiceToken} call {req.Path}");

            var googleUtility = await GoogleUtility.CreateAsync().ConfigureAwait(false);

            var token  = googleUtility.GetServiceToken();
            return new OkObjectResult(token);
        }

        /********************************************************************************************************************************************/

        [OpenApiOperation(operationId: Constants.AzureFileGetItem, tags: new[] { "Azure" }, Summary = "Get item from azure storage")]
        [OpenApiSecurity("Bearer token", SecuritySchemeType.ApiKey, Name = "Authorization", In = OpenApiSecurityLocationType.Header, Description = "Google bearer token")]
        [OpenApiParameter(name: "path", In = ParameterLocation.Query, Required = true, Type = typeof(string), Summary = "path to the resource", Description = "example: `2011 PhotoShoot Feng/Feng-1.jpg`")]
        [OpenApiResponseWithBody(statusCode: HttpStatusCode.OK, contentType: "application/pdf", bodyType: typeof(string), Description = "It will return image with proper media type to show on the browser")]

        // ?path=2011 PhotoShoot Feng/Feng-2.jpg
        [FunctionName(Constants.AzureFileGetItem)]
        public static async Task<IActionResult> GetItem(
            [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "azure/miticv/file/item")] HttpRequest req,
            ILogger log)
        {
            string path = req.Query["path"];
            try
            {
                await GoogleUtility.VerifyGoogleHeaderTokenIsValid(req).ConfigureAwait(false);
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
            catch (UnauthorizedAccessException ex) {
                log.LogError(ex.Message);
                return new StatusCodeResult(StatusCodes.Status401Unauthorized);
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

        [OpenApiOperation(operationId: Constants.AzureFileGetItemJson, tags: new[] { "Azure" }, Summary = "Get item from azure storage as json")]
        [OpenApiSecurity("Bearer token", SecuritySchemeType.ApiKey, Name = "Authorization", In = OpenApiSecurityLocationType.Header, Description = "Google bearer token")]
        [OpenApiParameter(name: "path", In = ParameterLocation.Query, Required = true, Type = typeof(string), Summary = "path to the resource", Description = "example: `2011 PhotoShoot Feng/Feng-1.jpg`")]
        [OpenApiResponseWithBody(statusCode: HttpStatusCode.OK, contentType: "application/json", bodyType: typeof(ItemJsonUI))]

        // ?path=2011 PhotoShoot Feng/Feng-2.jpg
        [FunctionName(Constants.AzureFileGetItemJson)]
        public static async Task<IActionResult> GetItemJson(
            [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "azure/miticv/json/item")] HttpRequest req,
            ILogger log)
        {
            string path = req.Query["path"];
            try
            {
                await GoogleUtility.VerifyGoogleHeaderTokenIsValid(req).ConfigureAwait(false);

                if (string.IsNullOrEmpty(path))
                {
                    return new BadRequestObjectResult("You must include `path` in the query parameter");
                }
                var connectionString = Environment.GetEnvironmentVariable("AzureWebJobsStorage");
                var containerName = Environment.GetEnvironmentVariable("AzureContainer");
                var azureUtility = new AzureUtility(connectionString, containerName);
                log.LogInformation($"{Constants.AzureFileGetItem} call for path=`{path}`.");
                return await azureUtility.GetHttpItemJsonAsync(path).ConfigureAwait(false);
            }
            catch (UnauthorizedAccessException ex)
            {
                log.LogError(ex.Message);
                return new StatusCodeResult(StatusCodes.Status401Unauthorized);
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

        [OpenApiOperation(operationId: Constants.AzureFileList, tags: new[] { "Azure" }, Summary = "Get list of items from azure storage path", Description = "It will display the list of items contained in ths path")]
        [OpenApiSecurity("Bearer token", SecuritySchemeType.ApiKey, Name = "Authorization", In = OpenApiSecurityLocationType.Header, Description = "Google bearer token")]
        [OpenApiParameter(name: "path", In = ParameterLocation.Query, Required = false, Type = typeof(string), Summary = "path to the resource", Description = "example: `2011 PhotoShoot Feng`")]
        [OpenApiResponseWithBody(statusCode: HttpStatusCode.OK, contentType: "application/json", bodyType: typeof(List<ItemUI>))]

        // ?path=2011 PhotoShoot Feng
        [FunctionName(Constants.AzureFileList)]
        public static async Task<IActionResult> List(
            [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "azure/miticv/file/list")] HttpRequest req,
            ILogger log)
        {
            try
            {
                await GoogleUtility.VerifyGoogleHeaderTokenIsValid(req).ConfigureAwait(false);
                string path = req.Query["path"];

                var connectionString = Environment.GetEnvironmentVariable("AzureWebJobsStorage");
                var containerName = Environment.GetEnvironmentVariable("AzureContainer");
                var azureUtility = new AzureUtility(connectionString, containerName);
                log.LogInformation($"{Constants.AzureFileList} function processing a request for path=`{path}`");
                var fileList = await azureUtility.ItemShallowListingAsync(path, 5000).ConfigureAwait(false);

                var UIObject = fileList.Select(s => new ItemUI{
                    IsFolder = s.IsFolder,
                    ItemPath = s.ItemPath,
                    ItemName = s.ItemPath.GetItemNameFromPath(),
                    ItemType = s.ItemPath.GetItemTypeFromPath()
                });
                return new OkObjectResult(UIObject);
            }
            catch (UnauthorizedAccessException ex)
            {
                log.LogError(ex.Message);
                return new StatusCodeResult(StatusCodes.Status401Unauthorized);
            }
        }
    }
}
