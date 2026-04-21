using System.Text.Json;
using MailKit.Net.Smtp;
using MailKit.Security;
using MimeKit;
using WebProdavnica.BusinessLayer.Abstract;
using WebProdavnica.DAL.Abstract;
using WebProdavnica.Entities;
using WebProdavnica.Entities.Configuration;

namespace WebProdavnica.BusinessLayer.Impl
{
    public class NotificationService : INotificationService
    {
        private readonly INotificationRepository _repo;
        private readonly SmtpSettings _smtp;
        private readonly ISsePusher _sse;

        public NotificationService(INotificationRepository repo, SmtpSettings smtp, ISsePusher sse)
        {
            _repo = repo;
            _smtp = smtp;
            _sse = sse;
        }

        public async Task SendAsync(Notification notification, string recipientEmail)
        {
            // 1. Sacuvaj u bazi
            int savedId = _repo.Add(notification);
            notification.NotificationId = savedId;

            // 2. Push via SSE ako je korisnik online
            try
            {
                var json = JsonSerializer.Serialize(new
                {
                    notificationId  = notification.NotificationId,
                    type            = notification.Type,
                    title           = notification.Title,
                    message         = notification.Message,
                    relatedEntityId = notification.RelatedEntityId,
                    isRead          = false,
                    createdAt       = DateTime.UtcNow,
                });
                await _sse.PushAsync(notification.RecipientId, notification.RecipientType, json);
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"[SSE] Push greška: {ex.Message}");
            }

            // 3. Posalji email (ne blokira u slucaju greske)
            try
            {
                await SendEmailAsync(recipientEmail, notification.Title, notification.Message);
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"[Email] Greška pri slanju na {recipientEmail}: {ex.Message}");
            }
        }

        public List<Notification> GetForRecipient(int recipientId, string recipientType, int limit = 50)
            => _repo.GetForRecipient(recipientId, recipientType, limit);

        public int GetUnreadCount(int recipientId, string recipientType)
            => _repo.GetUnreadCount(recipientId, recipientType);

        public bool MarkRead(int notificationId)
            => _repo.MarkRead(notificationId);

        public bool MarkAllRead(int recipientId, string recipientType)
            => _repo.MarkAllRead(recipientId, recipientType);
        public bool Delete(int notificationId)
            => _repo.Delete(notificationId);

        public bool JobAlreadyNotified(int jobId, string type = "job_confirmed")
            => _repo.ExistsForJob(jobId, type);

        // ── Private ────────────────────────────────────────────────────────────

        private async Task SendEmailAsync(string toEmail, string subject, string bodyText)
        {
            var message = new MimeMessage();
            message.From.Add(new MailboxAddress(_smtp.FromName, _smtp.User));
            message.To.Add(MailboxAddress.Parse(toEmail));
            message.Subject = subject;

            // Jednostavan text/html email
            var builder = new BodyBuilder
            {
                HtmlBody = $@"
                    <div style='font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px'>
                        <h2 style='color:#2324fe'>{System.Net.WebUtility.HtmlEncode(subject)}</h2>
                        <p style='color:#333;line-height:1.6'>{System.Net.WebUtility.HtmlEncode(bodyText)}</p>
                        <hr style='border:none;border-top:1px solid #eee;margin:24px 0'/>
                        <p style='color:#999;font-size:12px'>Majstorija — platforma za pronalazenje majstora</p>
                    </div>",
                TextBody = bodyText
            };
            message.Body = builder.ToMessageBody();

            using var client = new SmtpClient();
            await client.ConnectAsync(_smtp.Host, _smtp.Port, SecureSocketOptions.StartTls);
            await client.AuthenticateAsync(_smtp.User, _smtp.Pass);
            await client.SendAsync(message);
            await client.DisconnectAsync(true);
        }


    }
}
