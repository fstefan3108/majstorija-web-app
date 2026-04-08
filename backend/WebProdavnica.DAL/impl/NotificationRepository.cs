using Microsoft.Data.SqlClient;
using WebProdavnica.Core.Constant;
using WebProdavnica.DAL.Abstract;
using WebProdavnica.Entities;

namespace WebProdavnica.DAL.Impl
{
    public class NotificationRepository : INotificationRepository
    {
        private static Notification Map(SqlDataReader r) => new Notification
        {
            NotificationId  = r.GetInt32(0),
            RecipientId     = r.GetInt32(1),
            RecipientType   = r.GetString(2),
            Type            = r.GetString(3),
            Title           = r.GetString(4),
            Message         = r.GetString(5),
            RelatedEntityId = r.IsDBNull(6) ? null : r.GetInt32(6),
            IsRead          = r.GetBoolean(7),
            CreatedAt       = r.GetDateTime(8),
        };

        public int Add(Notification n)
        {
            using var conn = new SqlConnection(DataBaseConstant.ConnectionString);
            conn.Open();
            var cmd = conn.CreateCommand();
            cmd.CommandText = @"
                INSERT INTO dbo.notifications
                    (recipient_id, recipient_type, type, title, message, related_entity_id, is_read)
                OUTPUT INSERTED.notification_id
                VALUES (@rid, @rt, @tp, @ti, @msg, @rel, 0)";
            cmd.Parameters.AddWithValue("@rid", n.RecipientId);
            cmd.Parameters.AddWithValue("@rt",  n.RecipientType);
            cmd.Parameters.AddWithValue("@tp",  n.Type);
            cmd.Parameters.AddWithValue("@ti",  n.Title);
            cmd.Parameters.AddWithValue("@msg", n.Message);
            cmd.Parameters.AddWithValue("@rel", n.RelatedEntityId.HasValue ? (object)n.RelatedEntityId.Value : DBNull.Value);
            return Convert.ToInt32(cmd.ExecuteScalar());
        }

        public List<Notification> GetForRecipient(int recipientId, string recipientType, int limit = 50)
        {
            using var conn = new SqlConnection(DataBaseConstant.ConnectionString);
            conn.Open();
            var cmd = conn.CreateCommand();
            cmd.CommandText = $@"
                SELECT TOP (@lim)
                    notification_id, recipient_id, recipient_type, type,
                    title, message, related_entity_id, is_read, created_at
                FROM dbo.notifications
                WHERE recipient_id = @rid AND recipient_type = @rt
                ORDER BY created_at DESC";
            cmd.Parameters.AddWithValue("@lim", limit);
            cmd.Parameters.AddWithValue("@rid", recipientId);
            cmd.Parameters.AddWithValue("@rt",  recipientType);
            using var r = cmd.ExecuteReader();
            var list = new List<Notification>();
            while (r.Read()) list.Add(Map(r));
            return list;
        }

        public int GetUnreadCount(int recipientId, string recipientType)
        {
            using var conn = new SqlConnection(DataBaseConstant.ConnectionString);
            conn.Open();
            var cmd = conn.CreateCommand();
            cmd.CommandText = @"
                SELECT COUNT(*)
                FROM dbo.notifications
                WHERE recipient_id = @rid AND recipient_type = @rt AND is_read = 0";
            cmd.Parameters.AddWithValue("@rid", recipientId);
            cmd.Parameters.AddWithValue("@rt",  recipientType);
            return (int)cmd.ExecuteScalar();
        }

        public bool MarkRead(int notificationId)
        {
            using var conn = new SqlConnection(DataBaseConstant.ConnectionString);
            conn.Open();
            var cmd = conn.CreateCommand();
            cmd.CommandText = "UPDATE dbo.notifications SET is_read = 1 WHERE notification_id = @id";
            cmd.Parameters.AddWithValue("@id", notificationId);
            return cmd.ExecuteNonQuery() > 0;
        }

        public bool MarkAllRead(int recipientId, string recipientType)
        {
            using var conn = new SqlConnection(DataBaseConstant.ConnectionString);
            conn.Open();
            var cmd = conn.CreateCommand();
            cmd.CommandText = @"
                UPDATE dbo.notifications
                SET is_read = 1
                WHERE recipient_id = @rid AND recipient_type = @rt AND is_read = 0";
            cmd.Parameters.AddWithValue("@rid", recipientId);
            cmd.Parameters.AddWithValue("@rt",  recipientType);
            return cmd.ExecuteNonQuery() > 0;
        }
    }
}
