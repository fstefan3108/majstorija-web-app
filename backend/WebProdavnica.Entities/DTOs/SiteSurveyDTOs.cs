using System.ComponentModel.DataAnnotations;

namespace WebProdavnica.Entities.DTOs
{
    public class ProposeSurveyDto
    {
        [Required]
        public DateTime ScheduledDate { get; set; }

        public TimeSpan? ScheduledTime { get; set; }

        [Required]
        [Range(1, 1000000)]
        public decimal SurveyPrice { get; set; }
    }

    public class ProposeRescheduleSurveyDto
    {
        [Required]
        public DateTime NewDate { get; set; }

        public TimeSpan? NewTime { get; set; }

        [Required]
        public string ProposedBy { get; set; } = string.Empty; // "user" | "craftsman"
    }

    public class CompleteSurveyDto
    {
        [Required]
        [Range(15, 99999)]
        public int EstimatedMinutes { get; set; }
    }
}
