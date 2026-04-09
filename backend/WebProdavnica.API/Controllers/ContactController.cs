using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.AspNetCore.Mvc;
using MimeKit;
using WebProdavnica.Entities.Configuration;

namespace YourApp.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ContactController : ControllerBase
    {
        private readonly SmtpSettings _smtp;
        private readonly ILogger<ContactController> _logger;

        public ContactController(SmtpSettings smtp, ILogger<ContactController> logger)
        {
            _smtp = smtp;
            _logger = logger;
        }

        [HttpPost]
        public async Task<IActionResult> SendContactEmail([FromBody] ContactRequest request)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            try
            {
                var email = new MimeMessage();

                email.From.Add(new MailboxAddress(_smtp.FromName, _smtp.User));
                email.To.Add(new MailboxAddress(_smtp.FromName, _smtp.User));
                email.ReplyTo.Add(new MailboxAddress(request.Name, request.Email));

                email.Subject = $"[Kontakt] {request.Subject}";

                var body = new BodyBuilder
                {
                    HtmlBody = $"""
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                            <h2 style="color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 8px;">
                                Nova poruka putem kontakt forme
                            </h2>
                            <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
                                <tr>
                                    <td style="padding: 8px; font-weight: bold; color: #6b7280; width: 120px;">Ime:</td>
                                    <td style="padding: 8px;">{request.Name}</td>
                                </tr>
                                <tr style="background: #f9fafb;">
                                    <td style="padding: 8px; font-weight: bold; color: #6b7280;">Email:</td>
                                    <td style="padding: 8px;">
                                        <a href="mailto:{request.Email}" style="color: #2563eb;">{request.Email}</a>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px; font-weight: bold; color: #6b7280;">Naslov:</td>
                                    <td style="padding: 8px;">{request.Subject}</td>
                                </tr>
                            </table>
                            <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin-top: 16px;">
                                <p style="font-weight: bold; color: #374151; margin-bottom: 8px;">Poruka:</p>
                                <p style="color: #4b5563; white-space: pre-line; margin: 0;">{request.Message}</p>
                            </div>
                            <p style="color: #9ca3af; font-size: 12px; margin-top: 24px;">
                                Poslato putem Majstorija kontakt forme
                            </p>
                        </div>
                    """
                };

                email.Body = body.ToMessageBody();

                using var client = new SmtpClient();
                await client.ConnectAsync(_smtp.Host, _smtp.Port, SecureSocketOptions.StartTls);
                await client.AuthenticateAsync(_smtp.User, _smtp.Pass);
                await client.SendAsync(email);
                await client.DisconnectAsync(true);

                _logger.LogInformation("Kontakt email uspješno poslat od {Email}", request.Email);
                return Ok(new { message = "Poruka je uspješno poslata." });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Greška pri slanju kontakt emaila");
                return StatusCode(500, new { message = "Greška pri slanju poruke. Pokušajte ponovo." });
            }
        }
    }

    public class ContactRequest
    {
        [System.ComponentModel.DataAnnotations.Required]
        public string Name { get; set; } = string.Empty;

        [System.ComponentModel.DataAnnotations.Required]
        [System.ComponentModel.DataAnnotations.EmailAddress]
        public string Email { get; set; } = string.Empty;

        [System.ComponentModel.DataAnnotations.Required]
        public string Subject { get; set; } = string.Empty;

        [System.ComponentModel.DataAnnotations.Required]
        public string Message { get; set; } = string.Empty;
    }
}