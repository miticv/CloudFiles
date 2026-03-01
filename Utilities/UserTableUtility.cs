using System;
using System.Collections.Generic;
using System.IdentityModel.Tokens.Jwt;
using System.Linq;
using System.Security.Claims;
using System.Text;
using System.Threading.Tasks;
using Azure.Data.Tables;
using CloudFiles.Models;
using Microsoft.IdentityModel.Tokens;

namespace CloudFiles.Utilities
{
    public static class UserTableUtility
    {
        private const string TableName = "Users";

        private static TableClient GetTableClient()
        {
            var connectionString = Environment.GetEnvironmentVariable("AzureWebJobsStorage");
            var client = new TableClient(connectionString, TableName);
            client.CreateIfNotExists();
            return client;
        }

        public static string EmailToRowKey(string email)
        {
            var bytes = Encoding.UTF8.GetBytes(email.ToLowerInvariant());
            return Convert.ToBase64String(bytes)
                .Replace('+', '-')
                .Replace('/', '_')
                .TrimEnd('=');
        }

        public static async Task<UserEntity> GetOrCreateOAuthUserAsync(string email, string displayName, string provider)
        {
            var client = GetTableClient();
            var rowKey = EmailToRowKey(email);

            try
            {
                var response = await client.GetEntityAsync<UserEntity>(provider, rowKey).ConfigureAwait(false);
                var user = response.Value;
                user.LastLoginAt = DateTimeOffset.UtcNow;
                await client.UpdateEntityAsync(user, user.ETag).ConfigureAwait(false);
                return user;
            }
            catch (Azure.RequestFailedException ex) when (ex.Status == 404)
            {
                var user = new UserEntity
                {
                    PartitionKey = provider,
                    RowKey = rowKey,
                    Email = email.ToLowerInvariant(),
                    DisplayName = displayName ?? email,
                    AuthProvider = provider,
                    CreatedAt = DateTimeOffset.UtcNow,
                    LastLoginAt = DateTimeOffset.UtcNow,
                    IsApproved = true,
                    IsActive = true
                };
                await client.AddEntityAsync(user).ConfigureAwait(false);
                return user;
            }
        }

        public static async Task<UserEntity> CreateLocalUserAsync(string email, string displayName, string password)
        {
            var client = GetTableClient();
            var rowKey = EmailToRowKey(email);

            try
            {
                await client.GetEntityAsync<UserEntity>("local", rowKey).ConfigureAwait(false);
                throw new InvalidOperationException("A user with this email already exists.");
            }
            catch (Azure.RequestFailedException ex) when (ex.Status == 404)
            {
                // User does not exist, proceed with creation
            }

            var user = new UserEntity
            {
                PartitionKey = "local",
                RowKey = rowKey,
                Email = email.ToLowerInvariant(),
                DisplayName = displayName,
                AuthProvider = "local",
                HashedPassword = BCrypt.Net.BCrypt.HashPassword(password),
                CreatedAt = DateTimeOffset.UtcNow,
                LastLoginAt = DateTimeOffset.UtcNow,
                IsApproved = true,
                IsActive = true
            };
            await client.AddEntityAsync(user).ConfigureAwait(false);
            return user;
        }

        public static async Task<UserEntity> ValidateLocalUserAsync(string email, string password)
        {
            var client = GetTableClient();
            var rowKey = EmailToRowKey(email);

            try
            {
                var response = await client.GetEntityAsync<UserEntity>("local", rowKey).ConfigureAwait(false);
                var user = response.Value;

                if (string.IsNullOrEmpty(user.HashedPassword) || !BCrypt.Net.BCrypt.Verify(password, user.HashedPassword))
                {
                    throw new UnauthorizedAccessException("Invalid email or password.");
                }

                user.LastLoginAt = DateTimeOffset.UtcNow;
                await client.UpdateEntityAsync(user, user.ETag).ConfigureAwait(false);
                return user;
            }
            catch (Azure.RequestFailedException ex) when (ex.Status == 404)
            {
                throw new UnauthorizedAccessException("Invalid email or password.");
            }
        }

        public static async Task<List<UserDto>> ListAllUsersAsync()
        {
            var client = GetTableClient();
            var users = new List<UserDto>();

            await foreach (var entity in client.QueryAsync<UserEntity>())
            {
                users.Add(new UserDto
                {
                    Email = entity.Email,
                    DisplayName = entity.DisplayName,
                    AuthProvider = entity.AuthProvider,
                    CreatedAt = entity.CreatedAt,
                    LastLoginAt = entity.LastLoginAt,
                    IsApproved = entity.IsApproved,
                    IsActive = entity.IsActive,
                    PartitionKey = entity.PartitionKey,
                    RowKey = entity.RowKey
                });
            }

            return users;
        }

        public static async Task UpdateUserAsync(string partitionKey, string rowKey, bool isActive, bool isApproved)
        {
            var client = GetTableClient();
            var response = await client.GetEntityAsync<UserEntity>(partitionKey, rowKey).ConfigureAwait(false);
            var user = response.Value;
            user.IsActive = isActive;
            user.IsApproved = isApproved;
            await client.UpdateEntityAsync(user, user.ETag).ConfigureAwait(false);
        }

        public static string GenerateJwt(UserEntity user, bool isAdmin)
        {
            var secret = Environment.GetEnvironmentVariable("JWT_SECRET")
                ?? throw new InvalidOperationException("JWT_SECRET environment variable is not configured.");

            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));
            var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var claims = new[]
            {
                new Claim("email", user.Email),
                new Claim("displayName", user.DisplayName),
                new Claim("authProvider", user.AuthProvider),
                new Claim("isAdmin", isAdmin.ToString().ToLowerInvariant())
            };

            var token = new JwtSecurityToken(
                issuer: "CloudFiles",
                audience: "CloudFiles",
                claims: claims,
                expires: DateTime.UtcNow.AddHours(24),
                signingCredentials: credentials
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }

        public static ClaimsPrincipal ValidateJwt(string token)
        {
            var secret = Environment.GetEnvironmentVariable("JWT_SECRET")
                ?? throw new InvalidOperationException("JWT_SECRET environment variable is not configured.");

            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));

            var handler = new JwtSecurityTokenHandler();
            var principal = handler.ValidateToken(token, new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidIssuer = "CloudFiles",
                ValidateAudience = true,
                ValidAudience = "CloudFiles",
                ValidateLifetime = true,
                IssuerSigningKey = key,
                ClockSkew = TimeSpan.FromMinutes(5)
            }, out _);

            return principal;
        }

        public static bool IsAdmin(string email)
        {
            var adminEmails = (Environment.GetEnvironmentVariable("ADMIN_EMAILS") ?? "")
                .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
            return adminEmails.Any(e => string.Equals(e, email, StringComparison.OrdinalIgnoreCase));
        }

        public static (string email, bool isAdmin) ValidateJwtAndGetClaims(string token)
        {
            var principal = ValidateJwt(token);
            var email = principal.FindFirst("email")?.Value
                ?? throw new UnauthorizedAccessException("Invalid token: missing email claim.");
            var isAdmin = IsAdmin(email);
            return (email, isAdmin);
        }
    }
}
