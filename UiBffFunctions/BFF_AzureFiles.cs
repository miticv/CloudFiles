using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.Functions.Worker;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using CloudFiles.Utilities;
using CloudFiles.Models;
using Azure;
using System.Net;
using System.Collections.Generic;
using System.Linq;

namespace CloudFiles
{
    public static class BFF_AzureFiles
    {
        private static IActionResult? ValidatePath(string? path)
        {
            if (!string.IsNullOrEmpty(path) && (path.Contains("..") || path.Contains("\\") || path.StartsWith("/")))
                return new BadRequestObjectResult("Invalid path");
            return null;
        }

        private static IActionResult? ValidateAccountAndContainer(string? account, string? container)
        {
            if (string.IsNullOrEmpty(account) || string.IsNullOrEmpty(container))
                return new BadRequestObjectResult("You must include `account` and `container` query parameters");
            if (!IsValidAccountName(account))
                return new BadRequestObjectResult("Invalid storage account name");
            if (!IsValidContainerName(container))
                return new BadRequestObjectResult("Invalid container name");
            return null;
        }

        private static bool IsValidAccountName(string name)
        {
            return name.Length >= 3 && name.Length <= 24
                && name.All(c => char.IsAsciiLetterLower(c) || char.IsAsciiDigit(c));
        }

        private static bool IsValidContainerName(string name)
        {
            return name.Length >= 3 && name.Length <= 63
                && name.All(c => char.IsAsciiLetterLower(c) || char.IsAsciiDigit(c) || c == '-')
                && !name.StartsWith('-') && !name.EndsWith('-')
                && !name.Contains("--");
        }

        /********************************************************************************************************************************************/

        [Function(Constants.AzureProbeContainerAccess)]
        public static async Task<IActionResult> ProbeContainerAccess(
            [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "azure/files/probe")] HttpRequest req,
            FunctionContext executionContext)
        {
            var log = executionContext.GetLogger(nameof(ProbeContainerAccess));
            try
            {
                var accessToken = await AzureUtility.VerifyAzureStorageHeaderTokenIsValid(req).ConfigureAwait(false);
                string? account = req.Query["account"];
                string? container = req.Query["container"];

                var acError = ValidateAccountAndContainer(account, container);
                if (acError != null) return acError;

                var hasAccess = await AzureUtility.ProbeContainerAccessAsync(account!, container!, accessToken).ConfigureAwait(false);
                return new OkObjectResult(new { hasAccess });
            }
            catch (UnauthorizedAccessException ex)
            {
                log.LogError(ex.Message);
                return new StatusCodeResult(StatusCodes.Status401Unauthorized);
            }
            catch (Exception ex)
            {
                log.LogError(ex, "Error probing container access");
                return new OkObjectResult(new { hasAccess = false });
            }
        }

        // ?path=2011 PhotoShoot Feng/Feng-2.jpg&account=myaccount&container=mycontainer
        [Function(Constants.AzureFileGetItem)]
        public static async Task<IActionResult> GetItem(
            [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "azure/files/item")] HttpRequest req,
            FunctionContext executionContext)
        {
            var log = executionContext.GetLogger(nameof(GetItem));
            string? path = req.Query["path"];
            string? account = req.Query["account"];
            string? container = req.Query["container"];
            try
            {
                var accessToken = await AzureUtility.VerifyAzureStorageHeaderTokenIsValid(req).ConfigureAwait(false);
                var acError = ValidateAccountAndContainer(account, container);
                if (acError != null) return acError;
                var pathError = ValidatePath(path);
                if (pathError != null) return pathError;
                if (string.IsNullOrEmpty(path))
                    return new BadRequestObjectResult("You must include `path` in the query parameter");

                var azureUtility = new AzureUtility(account!, container!, accessToken);
                log.LogInformation($"{Constants.AzureFileGetItem} call for account=`{account}`, container=`{container}`, path=`{path}`.");
                return await azureUtility.GetHttpItemAsync(path!).ConfigureAwait(false);
            }
            catch (UnauthorizedAccessException ex) {
                log.LogError(ex.Message);
                return new StatusCodeResult(StatusCodes.Status401Unauthorized);
            }
            catch (RequestFailedException ex) when (ex.Status == StatusCodes.Status403Forbidden)
            {
                log.LogWarning(ex, $"Access denied to {account}/{container}/{path}");
                return new ObjectResult(CommonUtility.FormatErrorMessage(
                    "Access denied. You need 'Storage Blob Data Reader' role on this storage account."))
                { StatusCode = StatusCodes.Status403Forbidden };
            }
            catch (RequestFailedException ex) when (ex.Status == StatusCodes.Status404NotFound)
            {
                log.LogWarning(ex, $"{Constants.AzureFileGetItem} not found for path=`{path}`.");
                return new NotFoundObjectResult(CommonUtility.FormatErrorMessage("The specified blob does not exist."));
            }
            catch (RequestFailedException ex)
            {
                log.LogError(ex, $"{Constants.AzureFileGetItem} error for path=`{path}`.");
                return new StatusCodeResult(StatusCodes.Status500InternalServerError);
            }
            catch (Exception ex)
            {
                log.LogError(ex, $"Unexpected error in {Constants.AzureFileGetItem}");
                return new StatusCodeResult(StatusCodes.Status500InternalServerError);
            }
        }

        // ?path=2011 PhotoShoot Feng/Feng-2.jpg&account=myaccount&container=mycontainer
        [Function(Constants.AzureFileGetItemJson)]
        public static async Task<IActionResult> GetItemJson(
            [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "azure/files/json")] HttpRequest req,
            FunctionContext executionContext)
        {
            var log = executionContext.GetLogger(nameof(GetItemJson));
            string? path = req.Query["path"];
            string? account = req.Query["account"];
            string? container = req.Query["container"];
            try
            {
                var accessToken = await AzureUtility.VerifyAzureStorageHeaderTokenIsValid(req).ConfigureAwait(false);
                var acError = ValidateAccountAndContainer(account, container);
                if (acError != null) return acError;
                var pathError = ValidatePath(path);
                if (pathError != null) return pathError;
                if (string.IsNullOrEmpty(path))
                    return new BadRequestObjectResult("You must include `path` in the query parameter");

                var azureUtility = new AzureUtility(account!, container!, accessToken);
                log.LogInformation($"{Constants.AzureFileGetItemJson} call for account=`{account}`, container=`{container}`, path=`{path}`.");
                return await azureUtility.GetHttpItemJsonAsync(path!).ConfigureAwait(false);
            }
            catch (UnauthorizedAccessException ex)
            {
                log.LogError(ex.Message);
                return new StatusCodeResult(StatusCodes.Status401Unauthorized);
            }
            catch (RequestFailedException ex) when (ex.Status == StatusCodes.Status403Forbidden)
            {
                log.LogWarning(ex, $"Access denied to {account}/{container}/{path}");
                return new ObjectResult(CommonUtility.FormatErrorMessage(
                    "Access denied. You need 'Storage Blob Data Reader' role on this storage account."))
                { StatusCode = StatusCodes.Status403Forbidden };
            }
            catch (RequestFailedException ex) when (ex.Status == StatusCodes.Status404NotFound)
            {
                log.LogWarning(ex, $"{Constants.AzureFileGetItemJson} not found for path=`{path}`.");
                return new NotFoundObjectResult(CommonUtility.FormatErrorMessage("The specified blob does not exist."));
            }
            catch (RequestFailedException ex)
            {
                log.LogError(ex, $"{Constants.AzureFileGetItemJson} error for path=`{path}`.");
                return new StatusCodeResult(StatusCodes.Status500InternalServerError);
            }
            catch (Exception ex)
            {
                log.LogError(ex, $"Unexpected error in {Constants.AzureFileGetItemJson}");
                return new StatusCodeResult(StatusCodes.Status500InternalServerError);
            }
        }

        // ?account=myaccount&container=mycontainer&path=2011 PhotoShoot Feng
        [Function(Constants.AzureFileList)]
        public static async Task<IActionResult> List(
            [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "azure/files/list")] HttpRequest req,
            FunctionContext executionContext)
        {
            var log = executionContext.GetLogger(nameof(List));
            try
            {
                var accessToken = await AzureUtility.VerifyAzureStorageHeaderTokenIsValid(req).ConfigureAwait(false);
                string? account = req.Query["account"];
                string? container = req.Query["container"];
                string? path = req.Query["path"];

                var acError = ValidateAccountAndContainer(account!, container!);
                if (acError != null) return acError;
                var pathError = ValidatePath(path!);
                if (pathError != null) return pathError;

                var azureUtility = new AzureUtility(account!, container!, accessToken);
                log.LogInformation($"{Constants.AzureFileList} request for account=`{account}`, container=`{container}`, path=`{path}`");
                var fileList = await azureUtility.ItemShallowListingAsync(path!, 5000).ConfigureAwait(false);

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
            catch (RequestFailedException ex) when (ex.Status == StatusCodes.Status403Forbidden)
            {
                log.LogWarning(ex, "Access denied to storage account");
                return new ObjectResult(CommonUtility.FormatErrorMessage(
                    "Access denied. You need 'Storage Blob Data Reader' role on this storage account."))
                { StatusCode = StatusCodes.Status403Forbidden };
            }
            catch (Exception ex)
            {
                log.LogError(ex, $"Unexpected error in {Constants.AzureFileList}");
                return new StatusCodeResult(StatusCodes.Status500InternalServerError);
            }
        }
    }
}
