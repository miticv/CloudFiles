using System;
using System.IO;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.Functions.Worker;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using CloudFiles.Utilities;
using CloudFiles.Models;
using Newtonsoft.Json;

namespace CloudFiles
{
    public static class BFF_Admin
    {
        [Function(Constants.AdminUserList)]
        public static async Task<IActionResult> ListUsers(
            [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "manage/users")] HttpRequest req,
            FunctionContext executionContext)
        {
            var log = executionContext.GetLogger(nameof(ListUsers));
            try
            {
                var token = CommonUtility.GetTokenFromHeaders(req);
                var (email, isAdmin) = UserTableUtility.ValidateJwtAndGetClaims(token);

                if (!isAdmin)
                {
                    return new ObjectResult(new { error = "Admin access required." })
                    {
                        StatusCode = StatusCodes.Status403Forbidden
                    };
                }

                var users = await UserTableUtility.ListAllUsersAsync().ConfigureAwait(false);
                log.LogInformation($"Admin {email} listed {users.Count} users");

                return new OkObjectResult(users);
            }
            catch (UnauthorizedAccessException ex)
            {
                log.LogError(ex.Message);
                return new StatusCodeResult(StatusCodes.Status401Unauthorized);
            }
            catch (Exception ex)
            {
                log.LogError(ex, "Error listing users");
                return new ObjectResult(new { error = ex.Message })
                {
                    StatusCode = StatusCodes.Status500InternalServerError
                };
            }
        }

        [Function(Constants.AdminUserUpdate)]
        public static async Task<IActionResult> UpdateUser(
            [HttpTrigger(AuthorizationLevel.Anonymous, "put", Route = "manage/users/{partitionKey}/{rowKey}")] HttpRequest req,
            string partitionKey,
            string rowKey,
            FunctionContext executionContext)
        {
            var log = executionContext.GetLogger(nameof(UpdateUser));
            try
            {
                var token = CommonUtility.GetTokenFromHeaders(req);
                var (email, isAdmin) = UserTableUtility.ValidateJwtAndGetClaims(token);

                if (!isAdmin)
                {
                    return new ObjectResult(new { error = "Admin access required." })
                    {
                        StatusCode = StatusCodes.Status403Forbidden
                    };
                }

                var body = await new StreamReader(req.Body).ReadToEndAsync().ConfigureAwait(false);
                var update = JsonConvert.DeserializeAnonymousType(body, new { isActive = true, isApproved = true });

                if (update == null)
                {
                    return new BadRequestObjectResult("Request body is required.");
                }

                await UserTableUtility.UpdateUserAsync(partitionKey, rowKey, update.isActive, update.isApproved).ConfigureAwait(false);

                log.LogInformation($"Admin {email} updated user {partitionKey}/{rowKey}");

                return new OkObjectResult(new { success = true });
            }
            catch (UnauthorizedAccessException ex)
            {
                log.LogError(ex.Message);
                return new StatusCodeResult(StatusCodes.Status401Unauthorized);
            }
            catch (Azure.RequestFailedException ex) when (ex.Status == 404)
            {
                return new NotFoundObjectResult(new { error = "User not found." });
            }
            catch (Exception ex)
            {
                log.LogError(ex, "Error updating user");
                return new ObjectResult(new { error = ex.Message })
                {
                    StatusCode = StatusCodes.Status500InternalServerError
                };
            }
        }
    }
}
