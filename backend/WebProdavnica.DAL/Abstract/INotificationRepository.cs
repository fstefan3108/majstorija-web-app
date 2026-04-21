using WebProdavnica.Entities;

namespace WebProdavnica.DAL.Abstract
{
    public interface INotificationRepository
    {
        int Add(Notification notification);
        List<Notification> GetForRecipient(int recipientId, string recipientType, int limit = 50);
        int GetUnreadCount(int recipientId, string recipientType);
        bool MarkRead(int notificationId);
        bool MarkAllRead(int recipientId, string recipientType);
        bool Delete(int notificationId);
        bool ExistsForJob(int jobId, string type);
    }
}
