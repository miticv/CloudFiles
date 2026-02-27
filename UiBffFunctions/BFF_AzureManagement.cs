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
    public static class BFF_AzureManagement
    {
        [Function(Constants.AzureSubscriptionList)]
        public static async Task<IActionResult> AzureSubscriptionList(
            [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "azure/subscription/list")] HttpRequest req,
            FunctionContext executionContext)
        {
            var log = executionContext.GetLogger(nameof(AzureSubscriptionList));
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

        [Function(Constants.AzureResourceGroupList)]
        public static async Task<IActionResult> AzureResourceGroupList(
            [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "azure/subscription/{subscriptionId}/list")] HttpRequest req,
            string subscriptionId,
            FunctionContext executionContext)
        {
            var log = executionContext.GetLogger(nameof(AzureResourceGroupList));
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

        [Function(Constants.AzureStorageAccountList)]
        public static async Task<IActionResult> AzureListStorageAccountList(
            [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "azure/subscription/{subscriptionId}/ResourceGroup/{resourceGroupId}/list")] HttpRequest req,
            string subscriptionId, string resourceGroupId,
            FunctionContext executionContext)
        {
            var log = executionContext.GetLogger(nameof(AzureListStorageAccountList));
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

        [Function(Constants.AzureContainerList)]
        public static async Task<IActionResult> AzureContainerList(
            [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "azure/subscription/{subscriptionId}/ResourceGroup/{resourceGroupId}/accountName/{accountName}/list")] HttpRequest req,
            string subscriptionId, string resourceGroupId, string accountName,
            FunctionContext executionContext)
        {
            var log = executionContext.GetLogger(nameof(AzureContainerList));
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
