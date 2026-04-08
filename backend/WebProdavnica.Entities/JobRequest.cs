namespace WebProdavnica.Entities
{
    public class JobRequest
    {
        public int RequestId { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public DateTime ScheduledDate { get; set; }
        public string Status { get; set; } = "pending";
        public bool Urgent { get; set; }

        public int UserId { get; set; }
        public int CraftsmanId { get; set; }

        // Popunjava majstor pri prihvatanju
        public int? EstimatedMinutes { get; set; }
        public decimal? EstimatedPrice { get; set; }

        // Popunjava sistem nakon potvrde i placanja
        public int? JobOrderId { get; set; }

        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }

        // Navigation (opciono, za join-ove)
        public User? User { get; set; }
        public Craftsman? Craftsman { get; set; }
        public List<string> ImagePaths { get; set; } = new();
    }
}
