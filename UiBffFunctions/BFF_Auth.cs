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
    public static class BFF_Auth
    {
        [Function(Constants.AuthOAuthLogin)]
        public static async Task<IActionResult> OAuthLogin(
            [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "auth/oauth/login")] HttpRequest req,
            FunctionContext executionContext)
        {
            var log = executionContext.GetLogger(nameof(OAuthLogin));
            try
            {
                var body = await new StreamReader(req.Body).ReadToEndAsync().ConfigureAwait(false);
                var request = JsonConvert.DeserializeObject<OAuthLoginRequest>(body);

                if (request == null || string.IsNullOrEmpty(request.AccessToken) || string.IsNullOrEmpty(request.Provider))
                {
                    return new BadRequestObjectResult("accessToken and provider are required.");
                }

                string email;
                string displayName;

                if (request.Provider == "google")
                {
                    var tokenInfo = await GoogleUtility.VerifyAccessToken(request.AccessToken).ConfigureAwait(false);
                    email = tokenInfo.Email;
                    displayName = email;
                }
                else if (request.Provider == "azure")
                {
                    var handler = new System.IdentityModel.Tokens.Jwt.JwtSecurityTokenHandler();
                    var jwt = handler.ReadJwtToken(request.AccessToken);
                    email = jwt.Claims.FirstOrDefault(c => c.Type == "preferred_username")?.Value
                         ?? jwt.Claims.FirstOrDefault(c => c.Type == "email")?.Value
                         ?? jwt.Claims.FirstOrDefault(c => c.Type == "upn")?.Value
                         ?? throw new UnauthorizedAccessException("Could not extract email from Azure token.");
                    displayName = jwt.Claims.FirstOrDefault(c => c.Type == "name")?.Value ?? email;
                }
                else if (request.Provider == "dropbox")
                {
                    var account = await DropboxUtility.GetAccountInfoAsync(request.AccessToken).ConfigureAwait(false);
                    email = account.Email;
                    displayName = account.Name?.DisplayName ?? email;
                }
                else
                {
                    return new BadRequestObjectResult("Provider must be 'google', 'azure', or 'dropbox'.");
                }

                var user = await UserTableUtility.GetOrCreateOAuthUserAsync(email, displayName, request.Provider).ConfigureAwait(false);

                if (!user.IsActive || !user.IsApproved)
                {
                    return new ObjectResult(new { error = "Account is not active or approved." })
                    {
                        StatusCode = StatusCodes.Status403Forbidden
                    };
                }

                var isAdmin = UserTableUtility.IsAdmin(email);
                var token = UserTableUtility.GenerateJwt(user, isAdmin);

                log.LogInformation($"OAuth login successful for {email} via {request.Provider}");

                return new OkObjectResult(new AuthResponse
                {
                    Token = token,
                    Email = user.Email,
                    DisplayName = user.DisplayName,
                    AuthProvider = user.AuthProvider,
                    IsAdmin = isAdmin
                });
            }
            catch (UnauthorizedAccessException ex)
            {
                log.LogError(ex.Message);
                return new StatusCodeResult(StatusCodes.Status401Unauthorized);
            }
            catch (Exception ex)
            {
                log.LogError(ex, "Error in OAuth login");
                return new ObjectResult(new { error = ex.Message })
                {
                    StatusCode = StatusCodes.Status500InternalServerError
                };
            }
        }

        [Function(Constants.AuthLocalRegister)]
        public static async Task<IActionResult> LocalRegister(
            [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "auth/local/register")] HttpRequest req,
            FunctionContext executionContext)
        {
            var log = executionContext.GetLogger(nameof(LocalRegister));
            try
            {
                var body = await new StreamReader(req.Body).ReadToEndAsync().ConfigureAwait(false);
                var request = JsonConvert.DeserializeObject<LocalRegisterRequest>(body);

                if (request == null || string.IsNullOrEmpty(request.Email) || string.IsNullOrEmpty(request.Password) || string.IsNullOrEmpty(request.DisplayName))
                {
                    return new BadRequestObjectResult("email, displayName, and password are required.");
                }

                if (request.Password.Length < 6)
                {
                    return new BadRequestObjectResult("Password must be at least 6 characters.");
                }

                var user = await UserTableUtility.CreateLocalUserAsync(request.Email, request.DisplayName, request.Password).ConfigureAwait(false);

                log.LogInformation($"Local registration successful for {request.Email}");

                var isAdmin = UserTableUtility.IsAdmin(user.Email);
                var token = UserTableUtility.GenerateJwt(user, isAdmin);

                return new ObjectResult(new AuthResponse
                {
                    Token = token,
                    Email = user.Email,
                    DisplayName = user.DisplayName,
                    AuthProvider = user.AuthProvider,
                    IsAdmin = isAdmin
                })
                {
                    StatusCode = StatusCodes.Status201Created
                };
            }
            catch (InvalidOperationException ex)
            {
                return new ObjectResult(new { error = ex.Message })
                {
                    StatusCode = StatusCodes.Status409Conflict
                };
            }
            catch (Exception ex)
            {
                log.LogError(ex, "Error in local registration");
                return new ObjectResult(new { error = ex.Message })
                {
                    StatusCode = StatusCodes.Status500InternalServerError
                };
            }
        }

        [Function(Constants.AuthLocalLogin)]
        public static async Task<IActionResult> LocalLogin(
            [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "auth/local/login")] HttpRequest req,
            FunctionContext executionContext)
        {
            var log = executionContext.GetLogger(nameof(LocalLogin));
            try
            {
                var body = await new StreamReader(req.Body).ReadToEndAsync().ConfigureAwait(false);
                var request = JsonConvert.DeserializeObject<LocalLoginRequest>(body);

                if (request == null || string.IsNullOrEmpty(request.Email) || string.IsNullOrEmpty(request.Password))
                {
                    return new BadRequestObjectResult("email and password are required.");
                }

                var user = await UserTableUtility.ValidateLocalUserAsync(request.Email, request.Password).ConfigureAwait(false);

                if (!user.IsActive || !user.IsApproved)
                {
                    return new ObjectResult(new { error = "Account is not active or approved." })
                    {
                        StatusCode = StatusCodes.Status403Forbidden
                    };
                }

                var isAdmin = UserTableUtility.IsAdmin(user.Email);
                var token = UserTableUtility.GenerateJwt(user, isAdmin);

                log.LogInformation($"Local login successful for {request.Email}");

                return new OkObjectResult(new AuthResponse
                {
                    Token = token,
                    Email = user.Email,
                    DisplayName = user.DisplayName,
                    AuthProvider = user.AuthProvider,
                    IsAdmin = isAdmin
                });
            }
            catch (UnauthorizedAccessException ex)
            {
                log.LogError(ex.Message);
                return new StatusCodeResult(StatusCodes.Status401Unauthorized);
            }
            catch (Exception ex)
            {
                log.LogError(ex, "Error in local login");
                return new ObjectResult(new { error = ex.Message })
                {
                    StatusCode = StatusCodes.Status500InternalServerError
                };
            }
        }

        [Function(Constants.AuthGetCurrentUser)]
        public static IActionResult GetCurrentUser(
            [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "auth/me")] HttpRequest req,
            FunctionContext executionContext)
        {
            var log = executionContext.GetLogger(nameof(GetCurrentUser));
            try
            {
                var token = CommonUtility.GetTokenFromHeaders(req);
                var (email, isAdmin) = UserTableUtility.ValidateJwtAndGetClaims(token);
                var principal = UserTableUtility.ValidateJwt(token);

                return new OkObjectResult(new AuthResponse
                {
                    Token = token,
                    Email = email,
                    DisplayName = principal.FindFirst("displayName")?.Value ?? email,
                    AuthProvider = principal.FindFirst("authProvider")?.Value ?? "unknown",
                    IsAdmin = isAdmin
                });
            }
            catch (UnauthorizedAccessException ex)
            {
                log.LogError(ex.Message);
                return new StatusCodeResult(StatusCodes.Status401Unauthorized);
            }
            catch (Exception ex)
            {
                log.LogError(ex, "Error getting current user");
                return new StatusCodeResult(StatusCodes.Status401Unauthorized);
            }
        }
    }
}
