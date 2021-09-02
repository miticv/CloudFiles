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
    public static class BFF_MultiTenant
    {
        [OpenApiOperation(operationId: Constants.bffPing, tags: new[] { "Common" }, Summary = "Ping function", Description = "Simple ping function.", Visibility = OpenApiVisibilityType.Important)]
        [OpenApiResponseWithBody(statusCode: HttpStatusCode.OK, contentType: "text/plain", bodyType: typeof(string), Description = "This returns plain 'pong' response")]
        [FunctionName(Constants.bffPing)]
        public static IActionResult Ping(
            [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "ping")] HttpRequest req,
            ILogger log)
        {
            log.LogInformation($"{Constants.bffPing} call {req.Path}");
            return new OkObjectResult("pong");
        }

        /********************************************************************************************************************************************/

        [OpenApiOperation(operationId: Constants.AzureSubscriptionList, tags: new[] { "Azure" }, Summary = "List Azure Subscriptions", Description = "For now single tenant only", Visibility = OpenApiVisibilityType.Important)]
        // [OpenApiSecurity("function_key", SecuritySchemeType.ApiKey, Name = "code", In = OpenApiSecurityLocationType.Query)]
        [OpenApiSecurity("Bearer token", SecuritySchemeType.ApiKey, Name = "Authorization", In = OpenApiSecurityLocationType.Header, Description = "Google bearer token")]
        [OpenApiResponseWithBody(statusCode: HttpStatusCode.OK, contentType: "application/json", bodyType: typeof(List<Models.Azure.AzureSubscription>))]
        [OpenApiIgnore]

        [FunctionName(Constants.AzureSubscriptionList)]
        public static async Task<IActionResult> AzureSubscriptionList(
            [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "azure/subscription/list")] HttpRequest req,
            ILogger log)
        {
            try
            {
                var azureAccessToken = await AzureUtility.VerifyAzureManagementHeaderTokenIsValid(req).ConfigureAwait(false);
                log.LogInformation($"{Constants.AzureSubscriptionList} call");
                var list = await AzureUtility.ListSubscriptionsAsync(azureAccessToken).ConfigureAwait(false);
                return new OkObjectResult(list);
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

        [OpenApiOperation(operationId: Constants.AzureResourceGroupList, tags: new[] { "Azure" }, Summary = "List Azure Resource Groups", Description = "For now single tenant only", Visibility = OpenApiVisibilityType.Important)]
        [OpenApiSecurity("Bearer token", SecuritySchemeType.ApiKey, Name = "Authorization", In = OpenApiSecurityLocationType.Header, Description = "Google bearer token")]
        [OpenApiParameter(name: "subscriptionId", In = ParameterLocation.Path, Required = true, Type = typeof(string), Summary = "Subscription Id", Visibility = OpenApiVisibilityType.Important)]
        [OpenApiResponseWithBody(statusCode: HttpStatusCode.OK, contentType: "application/json", bodyType: typeof(List<Models.Azure.AzureResource>))]
        [OpenApiIgnore]

        [FunctionName(Constants.AzureResourceGroupList)]
        public static async Task<IActionResult> AzureResourceGroupList(
            [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "azure/subscription/{subscriptionId}/list")] HttpRequest req,
            string subscriptionId,
            ILogger log)
        {
            try
            {
                var azureAccessToken = await AzureUtility.VerifyAzureManagementHeaderTokenIsValid(req).ConfigureAwait(false);
                log.LogInformation($"{Constants.AzureResourceGroupList} call");
                var list = await AzureUtility.ListResourceGroupsAsync(azureAccessToken, subscriptionId).ConfigureAwait(false);
                return new OkObjectResult(list);
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

        [OpenApiOperation(operationId: Constants.AzureStorageAccountList, tags: new[] { "Azure" }, Summary = "List Azure Storage Accounts", Description = "For now single tenant only", Visibility = OpenApiVisibilityType.Important)]
        [OpenApiSecurity("Bearer token", SecuritySchemeType.ApiKey, Name = "Authorization", In = OpenApiSecurityLocationType.Header, Description = "Google bearer token")]
        [OpenApiParameter(name: "subscriptionId", In = ParameterLocation.Path, Required = true, Type = typeof(string), Summary = "Subscription Id", Visibility = OpenApiVisibilityType.Important)]
        [OpenApiParameter(name: "resourceGroupId", In = ParameterLocation.Path, Required = true, Type = typeof(string), Summary = "Resource Group Id", Visibility = OpenApiVisibilityType.Important)]
        [OpenApiResponseWithBody(statusCode: HttpStatusCode.OK, contentType: "application/json", bodyType: typeof(List<Models.Azure.AzureStorageAccount>))]
        [OpenApiIgnore]

        [FunctionName(Constants.AzureStorageAccountList)]
        public static async Task<IActionResult> AzureListStorageAccountList(
            [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "azure/subscription/{subscriptionId}/ResourceGroup/{resourceGroupId}/list")] HttpRequest req,
            string subscriptionId, string resourceGroupId,
            ILogger log)
        {
            try
            {
                var azureAccessToken = await AzureUtility.VerifyAzureManagementHeaderTokenIsValid(req).ConfigureAwait(false);
                log.LogInformation($"{Constants.AzureStorageAccountList} call");
                var list = await AzureUtility.ListStorageAccountsAsync(azureAccessToken, subscriptionId, resourceGroupId).ConfigureAwait(false);
                return new OkObjectResult(list);
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

        [OpenApiOperation(operationId: Constants.AzureContainerList, tags: new[] { "Azure" }, Summary = "List Azure Storage Containers", Description = "For now single tenant only", Visibility = OpenApiVisibilityType.Important)]
        [OpenApiSecurity("Bearer token", SecuritySchemeType.ApiKey, Name = "Authorization", In = OpenApiSecurityLocationType.Header, Description = "Google bearer token")]
        [OpenApiParameter(name: "subscriptionId", In = ParameterLocation.Path, Required = true, Type = typeof(string), Summary = "Subscription Id", Visibility = OpenApiVisibilityType.Important)]
        [OpenApiParameter(name: "resourceGroupId", In = ParameterLocation.Path, Required = true, Type = typeof(string), Summary = "Resource Group Id", Visibility = OpenApiVisibilityType.Important)]
        [OpenApiParameter(name: "accountName", In = ParameterLocation.Path, Required = true, Type = typeof(string), Summary = "Account Name", Visibility = OpenApiVisibilityType.Important)]
        [OpenApiResponseWithBody(statusCode: HttpStatusCode.OK, contentType: "application/json", bodyType: typeof(List<Models.Azure.AzureResource>))]
        [OpenApiIgnore]

        [FunctionName(Constants.AzureContainerList)]
        public static async Task<IActionResult> AzureContainerList(
            [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "azure/subscription/{subscriptionId}/ResourceGroup/{resourceGroupId}/accountName/{accountName}/list")] HttpRequest req,
            string subscriptionId, string resourceGroupId, string accountName,
            ILogger log)
        {
            try
            {
                var azureAccessToken = await AzureUtility.VerifyAzureManagementHeaderTokenIsValid(req).ConfigureAwait(false);
                log.LogInformation($"{Constants.AzureContainerList} call");
                var list = await AzureUtility.ListBlobContainersAsync(azureAccessToken, subscriptionId, resourceGroupId, accountName).ConfigureAwait(false);
                return new OkObjectResult(list);
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

        /********************************************************************************************************************************************/

        [OpenApiOperation(operationId: Constants.GoogleAlbumList, tags: new[] { "Google" }, Summary = "List Google Albums", Description = "Multi tenant", Visibility = OpenApiVisibilityType.Important)]
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

        [OpenApiOperation(operationId: Constants.GoogleAlbumAdd, tags: new[] { "Google" }, Summary = "Add Google Album", Description = "Multi tenant", Visibility = OpenApiVisibilityType.Important)]
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

        [OpenApiOperation(operationId: Constants.GoogleValidateToken, tags: new[] { "Google" }, Summary = "Verifies Google Bearer Token", Description = "Verifies it agains single tenant!", Visibility = OpenApiVisibilityType.Important)]
        [OpenApiSecurity("Bearer token", SecuritySchemeType.ApiKey, Name = "Authorization", In = OpenApiSecurityLocationType.Header, Description = "Google bearer token")]
        [OpenApiResponseWithBody(statusCode: HttpStatusCode.OK, contentType: "application/json", bodyType: typeof(string))]

        [FunctionName(Constants.GoogleValidateToken)]
        public static async Task<IActionResult> GoogleValidateToken(
            [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "google/tokenvalidate")] HttpRequest req,
            ILogger log)
        {
            try
            {
                log.LogInformation($"{Constants.GoogleValidateToken} call");
                await GoogleUtility.VerifyGoogleHeaderTokenIsValid(req).ConfigureAwait(false);

                return new OkResult();
            }
            catch (UnauthorizedAccessException ex)
            {
                log.LogError(ex.Message);
                return new StatusCodeResult(StatusCodes.Status401Unauthorized);
            }
        }

        /********************************************************************************************************************************************/
    }
}
