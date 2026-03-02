using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Threading.Tasks;
using System.Web;
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
                    // Validate Azure JWT signature before trusting claims
                    await AzureUtility.ValidateAzureManagementTokenAsync(request.AccessToken).ConfigureAwait(false);
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

                var (user, _) = await UserTableUtility.GetOrCreateOAuthUserAsync(email, displayName, request.Provider, log).ConfigureAwait(false);

                if (!user.IsApproved)
                {
                    return new ObjectResult(new { error = "Please confirm your email address.", code = "email_not_confirmed" })
                    {
                        StatusCode = StatusCodes.Status403Forbidden
                    };
                }

                if (!user.IsActive)
                {
                    return new ObjectResult(new { error = "Your account is pending admin activation.", code = "pending_approval" })
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
                return new ObjectResult(new { error = "An unexpected error occurred." })
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

                if (request.Password.Length < 8)
                {
                    return new BadRequestObjectResult("Password must be at least 8 characters.");
                }

                var (user, isAdmin) = await UserTableUtility.CreateLocalUserAsync(request.Email, request.DisplayName, request.Password, log).ConfigureAwait(false);

                log.LogInformation($"Local registration successful for {request.Email}");

                if (!isAdmin)
                {
                    // Non-admin users must confirm email before logging in
                    return new ObjectResult(new { message = "Please check your email to confirm your account." })
                    {
                        StatusCode = StatusCodes.Status202Accepted
                    };
                }

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
                return new ObjectResult(new { error = "An unexpected error occurred." })
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

                if (!user.IsApproved)
                {
                    return new ObjectResult(new { error = "Please confirm your email address.", code = "email_not_confirmed" })
                    {
                        StatusCode = StatusCodes.Status403Forbidden
                    };
                }

                if (!user.IsActive)
                {
                    return new ObjectResult(new { error = "Your account is pending admin activation.", code = "pending_approval" })
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
                return new ObjectResult(new { error = "An unexpected error occurred." })
                {
                    StatusCode = StatusCodes.Status500InternalServerError
                };
            }
        }

        [Function(Constants.GoogleOAuthToken)]
        public static async Task<IActionResult> GoogleOAuthToken(
            [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "google/oauth/token")] HttpRequest req,
            FunctionContext executionContext)
        {
            var log = executionContext.GetLogger(nameof(GoogleOAuthToken));
            try
            {
                var clientSecret = Environment.GetEnvironmentVariable("GoogleClientSecret");
                if (string.IsNullOrEmpty(clientSecret))
                {
                    log.LogError("GoogleClientSecret environment variable is not configured");
                    return new StatusCodeResult(StatusCodes.Status500InternalServerError);
                }

                // Read the form-encoded body from oidc-client-ts
                var body = await new StreamReader(req.Body).ReadToEndAsync().ConfigureAwait(false);
                var formParams = HttpUtility.ParseQueryString(body);

                // Add client_secret and forward to Google
                formParams["client_secret"] = clientSecret;

                using var client = new HttpClient();
                var content = new FormUrlEncodedContent(
                    formParams.AllKeys
                        .Where(k => k != null)
                        .Select(k => new KeyValuePair<string, string>(k!, formParams[k!] ?? ""))
                );

                var response = await client.PostAsync("https://oauth2.googleapis.com/token", content).ConfigureAwait(false);
                var responseBody = await response.Content.ReadAsStringAsync().ConfigureAwait(false);

                return new ContentResult
                {
                    Content = responseBody,
                    ContentType = "application/json",
                    StatusCode = (int)response.StatusCode
                };
            }
            catch (Exception ex)
            {
                log.LogError(ex, "Error proxying Google OAuth token exchange");
                return new StatusCodeResult(StatusCodes.Status500InternalServerError);
            }
        }

        [Function(Constants.AuthConfirmEmail)]
        public static async Task<IActionResult> ConfirmEmail(
            [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "auth/confirm-email")] HttpRequest req,
            FunctionContext executionContext)
        {
            var log = executionContext.GetLogger(nameof(ConfirmEmail));
            var baseUrl = (Environment.GetEnvironmentVariable("APP_BASE_URL") ?? "http://localhost:4200").TrimEnd('/');

            try
            {
                var token = req.Query["token"].FirstOrDefault();
                if (string.IsNullOrEmpty(token))
                {
                    return new RedirectResult($"{baseUrl}/sessions/login?status=token_expired");
                }

                await UserTableUtility.ConfirmEmailAsync(token, log).ConfigureAwait(false);
                log.LogInformation("Email confirmed for token");

                return new RedirectResult($"{baseUrl}/sessions/login?status=email_confirmed");
            }
            catch (InvalidOperationException ex)
            {
                log.LogWarning(ex, "Email confirmation failed");
                return new RedirectResult($"{baseUrl}/sessions/login?status=token_expired");
            }
            catch (Exception ex)
            {
                log.LogError(ex, "Error confirming email");
                return new RedirectResult($"{baseUrl}/sessions/login?status=token_expired");
            }
        }

        [Function(Constants.AuthResendConfirmation)]
        public static async Task<IActionResult> ResendConfirmation(
            [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "auth/resend-confirmation")] HttpRequest req,
            FunctionContext executionContext)
        {
            var log = executionContext.GetLogger(nameof(ResendConfirmation));
            try
            {
                var body = await new StreamReader(req.Body).ReadToEndAsync().ConfigureAwait(false);
                var request = JsonConvert.DeserializeObject<ResendConfirmationRequest>(body);

                if (request == null || string.IsNullOrEmpty(request.Email))
                {
                    return new BadRequestObjectResult("email is required.");
                }

                await UserTableUtility.RegenerateConfirmationTokenAsync(request.Email, log).ConfigureAwait(false);

                // Always return 200 — don't leak whether user exists
                return new OkObjectResult(new { message = "If an account exists with that email, a confirmation link has been sent." });
            }
            catch (Exception ex)
            {
                log.LogError(ex, "Error resending confirmation email");
                // Still return 200 to avoid leaking info
                return new OkObjectResult(new { message = "If an account exists with that email, a confirmation link has been sent." });
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
