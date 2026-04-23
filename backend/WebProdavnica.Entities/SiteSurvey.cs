namespace WebProdavnica.Entities
{
    public class SiteSurvey
    {
        public int SurveyId { get; set; }
        public int JobRequestId { get; set; }
        public int UserId { get; set; }
        public int CraftsmanId { get; set; }
        public DateTime ScheduledDate { get; set; }
        public TimeSpan? ScheduledTime { get; set; }
        public decimal SurveyPrice { get; set; }

        // Status: "zakazano" | "završeno" | "otkazano"
        public string Status { get; set; } = "zakazano";

        // Reschedule proposal (isti pattern kao kod JobOrder)
        public DateTime? RescheduleProposedDate { get; set; }
        public TimeSpan? RescheduleProposedTime { get; set; }
        public string? RescheduleProposedBy { get; set; } // "user" | "craftsman"

        public DateTime CreatedAt { get; set; }

        public JobRequest? JobRequest { get; set; }
        public User? User { get; set; }
        public Craftsman? Craftsman { get; set; }
    }
}
