using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.Functions.Worker;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using System.Collections.Generic;
using CloudFiles.Utilities;
using CloudFiles.Models;
using System.Linq;
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
        [Function(Constants.AzureCheckStorageRole)]
        public static async Task<IActionResult> CheckStorageRole(
            [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "azure/subscription/{subscriptionId}/ResourceGroup/{resourceGroupId}/accountName/{accountName}/checkRole")] HttpRequest req,
            string subscriptionId, string resourceGroupId, string accountName,
            FunctionContext executionContext)
        {
            var log = executionContext.GetLogger(nameof(CheckStorageRole));
            try
            {
                var azureAccessToken = await AzureUtility.VerifyAzureManagementHeaderTokenIsValid(req).ConfigureAwait(false);

                string? role = req.Query["role"];
                var roleId = AzureUtility.ResolveStorageRoleId(role);
                if (roleId == null)
                    return new BadRequestObjectResult(new { error = "Invalid role. Use 'reader' or 'contributor'." });

                var handler = new System.IdentityModel.Tokens.Jwt.JwtSecurityTokenHandler();
                var jwt = handler.ReadJwtToken(azureAccessToken);
                var principalId = jwt.Claims.FirstOrDefault(c => c.Type == "oid")?.Value
                    ?? throw new InvalidOperationException("Could not extract user object ID (oid) from Azure token.");

                var hasRole = await AzureUtility.CheckStorageBlobRoleAsync(
                    azureAccessToken, subscriptionId, resourceGroupId, accountName, principalId, roleId).ConfigureAwait(false);

                return new OkObjectResult(new { hasRole });
            }
            catch (UnauthorizedAccessException ex)
            {
                log.LogError(ex.Message);
                return new StatusCodeResult(StatusCodes.Status401Unauthorized);
            }
            catch (InvalidOperationException ex)
            {
                log.LogError(ex, "Error checking storage role");
                return new BadRequestObjectResult(new { error = ex.Message });
            }
        }

        [Function(Constants.AzureAssignStorageRole)]
        public static async Task<IActionResult> AssignStorageRole(
            [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "azure/subscription/{subscriptionId}/ResourceGroup/{resourceGroupId}/accountName/{accountName}/assignRole")] HttpRequest req,
            string subscriptionId, string resourceGroupId, string accountName,
            FunctionContext executionContext)
        {
            var log = executionContext.GetLogger(nameof(AssignStorageRole));
            try
            {
                var azureAccessToken = await AzureUtility.VerifyAzureManagementHeaderTokenIsValid(req).ConfigureAwait(false);

                string? role = req.Query["role"];
                var roleId = AzureUtility.ResolveStorageRoleId(role);
                if (roleId == null)
                    return new BadRequestObjectResult(new { error = "Invalid role. Use 'reader' or 'contributor'." });

                var handler = new System.IdentityModel.Tokens.Jwt.JwtSecurityTokenHandler();
                var jwt = handler.ReadJwtToken(azureAccessToken);
                var principalId = jwt.Claims.FirstOrDefault(c => c.Type == "oid")?.Value
                    ?? throw new InvalidOperationException("Could not extract user object ID (oid) from Azure token.");

                var roleName = role == "reader" ? "Storage Blob Data Reader" : "Storage Blob Data Contributor";
                log.LogInformation($"{Constants.AzureAssignStorageRole} assigning {roleName} on {accountName} to {principalId}");

                var (success, alreadyAssigned) = await AzureUtility.AssignStorageBlobRoleAsync(
                    azureAccessToken, subscriptionId, resourceGroupId, accountName, principalId, roleId).ConfigureAwait(false);

                return new OkObjectResult(new { success, alreadyAssigned });
            }
            catch (UnauthorizedAccessException ex)
            {
                log.LogError(ex.Message);
                return new StatusCodeResult(StatusCodes.Status401Unauthorized);
            }
            catch (InvalidOperationException ex)
            {
                log.LogError(ex, "Error assigning storage role");
                return new BadRequestObjectResult(new { error = ex.Message });
            }
        }
    }
}
