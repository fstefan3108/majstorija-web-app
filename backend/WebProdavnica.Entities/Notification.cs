namespace WebProdavnica.Entities
{
    /// <summary>
    /// recipient_type: "user" | "craftsman"
    /// type: "job_request_received" | "job_request_accepted" | "job_request_declined"
    ///       | "job_confirmed" | "job_finished" | "payment_captured" | "general"
    /// </summary>
    public class Notification
    {
        public int NotificationId { get; set; }
        public int RecipientId { get; set; }
        public string RecipientType { get; set; } = string.Empty; // "user" | "craftsman"
        public string Type { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public string Message { get; set; } = string.Empty;
        public int? RelatedEntityId { get; set; }
        public bool IsRead { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}
