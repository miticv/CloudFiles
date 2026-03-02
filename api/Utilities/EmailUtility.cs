using System;
using System.Linq;
using System.Threading.Tasks;
using Azure.Communication.Email;
using Microsoft.Extensions.Logging;

namespace CloudFiles.Utilities
{
    public static class EmailUtility
    {
        private static EmailClient? _client;

        private static EmailClient GetClient()
        {
            if (_client != null) return _client;

            var connectionString = Environment.GetEnvironmentVariable("ACS_CONNECTION_STRING")
                ?? throw new InvalidOperationException("ACS_CONNECTION_STRING environment variable is not configured.");
            _client = new EmailClient(connectionString);
            return _client;
        }

        private static string GetSenderAddress()
        {
            return Environment.GetEnvironmentVariable("ACS_SENDER_ADDRESS")
                ?? throw new InvalidOperationException("ACS_SENDER_ADDRESS environment variable is not configured.");
        }

        private static string GetBaseUrl()
        {
            return (Environment.GetEnvironmentVariable("APP_BASE_URL") ?? "http://localhost:4200").TrimEnd('/');
        }

        public static async Task SendConfirmationEmailAsync(string toEmail, string displayName, string token, ILogger? log = null)
        {
            try
            {
                var baseUrl = GetBaseUrl();
                var confirmUrl = $"{baseUrl}/sessions/login?status=confirm&token={Uri.EscapeDataString(token)}";

                var subject = "Confirm your CloudFiles account";
                var htmlBody = $@"
<div style=""font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 0;"">
  <h2 style=""color: #1e293b; margin-bottom: 16px;"">Welcome to CloudFiles!</h2>
  <p style=""color: #475569; font-size: 15px; line-height: 1.6;"">
    Hi {System.Net.WebUtility.HtmlEncode(displayName)},
  </p>
  <p style=""color: #475569; font-size: 15px; line-height: 1.6;"">
    Please confirm your email address by clicking the button below. This link expires in 24 hours.
  </p>
  <div style=""margin: 28px 0; text-align: center;"">
    <a href=""{confirmUrl}"" style=""display: inline-block; background-color: #4f46e5; color: #ffffff; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-weight: 600; font-size: 15px;"">
      Confirm Email
    </a>
  </div>
  <p style=""color: #94a3b8; font-size: 13px; line-height: 1.5;"">
    If you didn't create a CloudFiles account, you can safely ignore this email.
  </p>
  <hr style=""border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;"" />
  <p style=""color: #94a3b8; font-size: 12px;"">CloudFiles — Multi-cloud file manager</p>
</div>";

                var plainText = $"Hi {displayName},\n\nPlease confirm your email by visiting: {confirmUrl}\n\nThis link expires in 24 hours.\n\nIf you didn't create a CloudFiles account, you can safely ignore this email.";

                await SendEmailAsync(toEmail, subject, htmlBody, plainText, log).ConfigureAwait(false);
            }
            catch (Exception ex)
            {
                log?.LogError(ex, "Failed to send confirmation email to {Email}", toEmail);
            }
        }

        public static async Task SendAdminNotificationAsync(string newUserEmail, string displayName, string provider, ILogger? log = null)
        {
            try
            {
                var adminEmails = (Environment.GetEnvironmentVariable("ADMIN_EMAILS") ?? "")
                    .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

                if (adminEmails.Length == 0) return;

                var baseUrl = GetBaseUrl();
                var adminUrl = $"{baseUrl}/admin/users";

                var subject = $"New CloudFiles user: {newUserEmail}";
                var htmlBody = $@"
<div style=""font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 0;"">
  <h2 style=""color: #1e293b; margin-bottom: 16px;"">New User Registration</h2>
  <p style=""color: #475569; font-size: 15px; line-height: 1.6;"">
    A new user has registered and confirmed their email:
  </p>
  <table style=""margin: 16px 0; font-size: 14px; color: #334155;"">
    <tr><td style=""padding: 4px 16px 4px 0; font-weight: 600;"">Email:</td><td>{System.Net.WebUtility.HtmlEncode(newUserEmail)}</td></tr>
    <tr><td style=""padding: 4px 16px 4px 0; font-weight: 600;"">Name:</td><td>{System.Net.WebUtility.HtmlEncode(displayName)}</td></tr>
    <tr><td style=""padding: 4px 16px 4px 0; font-weight: 600;"">Provider:</td><td>{System.Net.WebUtility.HtmlEncode(provider)}</td></tr>
  </table>
  <p style=""color: #475569; font-size: 15px; line-height: 1.6;"">
    To activate this user, visit the admin panel:
  </p>
  <div style=""margin: 20px 0; text-align: center;"">
    <a href=""{adminUrl}"" style=""display: inline-block; background-color: #4f46e5; color: #ffffff; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-weight: 600; font-size: 15px;"">
      Open Admin Panel
    </a>
  </div>
  <hr style=""border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;"" />
  <p style=""color: #94a3b8; font-size: 12px;"">CloudFiles — Multi-cloud file manager</p>
</div>";

                var plainText = $"New user registration:\n\nEmail: {newUserEmail}\nName: {displayName}\nProvider: {provider}\n\nActivate this user at: {adminUrl}";

                foreach (var adminEmail in adminEmails)
                {
                    await SendEmailAsync(adminEmail.Trim(), subject, htmlBody, plainText, log).ConfigureAwait(false);
                }
            }
            catch (Exception ex)
            {
                log?.LogError(ex, "Failed to send admin notification for {Email}", newUserEmail);
            }
        }

        private static async Task SendEmailAsync(string toEmail, string subject, string htmlBody, string plainText, ILogger? log)
        {
            var client = GetClient();
            var sender = GetSenderAddress();

            var emailMessage = new EmailMessage(
                senderAddress: sender,
                recipientAddress: toEmail,
                content: new EmailContent(subject)
                {
                    Html = htmlBody,
                    PlainText = plainText
                }
            );

            var operation = await client.SendAsync(Azure.WaitUntil.Started, emailMessage).ConfigureAwait(false);
            log?.LogInformation("Email sent to {Email}, operation ID: {OperationId}", toEmail, operation.Id);
        }
    }
}
