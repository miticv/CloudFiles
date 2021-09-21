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
    public static class BFF_AzureManagement
    {
        [OpenApiOperation(operationId: Constants.AzureSubscriptionList, tags: new[] { "Azure" }, Summary = "List Azure Subscriptions")]
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

        [OpenApiOperation(operationId: Constants.AzureResourceGroupList, tags: new[] { "Azure" }, Summary = "List Azure Resource Groups")]
        [OpenApiSecurity("Bearer token", SecuritySchemeType.ApiKey, Name = "Authorization", In = OpenApiSecurityLocationType.Header, Description = "Google bearer token")]
        [OpenApiParameter(name: "subscriptionId", In = ParameterLocation.Path, Required = true, Type = typeof(string), Summary = "Subscription Id")]
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

        [OpenApiOperation(operationId: Constants.AzureStorageAccountList, tags: new[] { "Azure" }, Summary = "List Azure Storage Accounts")]
        [OpenApiSecurity("Bearer token", SecuritySchemeType.ApiKey, Name = "Authorization", In = OpenApiSecurityLocationType.Header, Description = "Google bearer token")]
        [OpenApiParameter(name: "subscriptionId", In = ParameterLocation.Path, Required = true, Type = typeof(string), Summary = "Subscription Id")]
        [OpenApiParameter(name: "resourceGroupId", In = ParameterLocation.Path, Required = true, Type = typeof(string), Summary = "Resource Group Id")]
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

        [OpenApiOperation(operationId: Constants.AzureContainerList, tags: new[] { "Azure" }, Summary = "List Azure Storage Containers")]
        [OpenApiSecurity("Bearer token", SecuritySchemeType.ApiKey, Name = "Authorization", In = OpenApiSecurityLocationType.Header, Description = "Google bearer token")]
        [OpenApiParameter(name: "subscriptionId", In = ParameterLocation.Path, Required = true, Type = typeof(string), Summary = "Subscription Id")]
        [OpenApiParameter(name: "resourceGroupId", In = ParameterLocation.Path, Required = true, Type = typeof(string), Summary = "Resource Group Id")]
        [OpenApiParameter(name: "accountName", In = ParameterLocation.Path, Required = true, Type = typeof(string), Summary = "Account Name")]
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
    }
}
