using WebProdavnica.Entities;

namespace WebProdavnica.BusinessLayer.Abstract
{
    public interface INotificationService
    {
        /// <summary>Kreira notifikaciju u bazi i šalje email primaocu.</summary>
        Task SendAsync(Notification notification, string recipientEmail);

        List<Notification> GetForRecipient(int recipientId, string recipientType, int limit = 50);
        int GetUnreadCount(int recipientId, string recipientType);
        bool MarkRead(int notificationId);
        bool MarkAllRead(int recipientId, string recipientType);
        bool Delete(int notificationId);
        bool JobAlreadyNotified(int jobId, string type = "job_confirmed");
    }
}
