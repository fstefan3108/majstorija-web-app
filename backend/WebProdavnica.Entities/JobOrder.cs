using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace WebProdavnica.Entities
{
    public class JobOrder
    {
        public int JobId { get; set; }
        public DateTime ScheduledDate { get; set; }
        public string? JobDescription { get; set; }
        public string? Status { get; set; }
        public decimal TotalPrice { get; set; }
        public decimal HourlyRate { get; set; }     
        public int EstimatedHours { get; set; }
        public DateTime? StartedAt { get; set; }     
        public DateTime? EndedAt { get; set; }       
        public int? ActualSeconds { get; set; }
        public int? EstimatedMinutes { get; set; }  // procena majstora u minutima
        public int? JobRequestId { get; set; }      // FK na job_requests

        public int UserId { get; set; }
        public int CraftsmanId { get; set; }

        
        public User? User { get; set; }
        public Craftsman? Craftsman { get; set; }
        public ICollection<Payment> Payments { get; set; } = new List<Payment>();
        public Review? Review { get; set; }
    }
}
