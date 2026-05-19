using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace WebProdavnica.Entities
{
    public class Payment
    {
        public int PaymentID { get; set; }
        public decimal Amount { get; set; }
        public DateTime PaymentDate { get; set; }
        public string PaymentMethod { get; set; }
        public string PaymentStatus { get; set; }
        public string TransactionId { get; set; }
        public string RedirectUrl { get; set; }
        public string Currency { get; set; } = "RSD";
        public decimal? PreauthorizedAmount { get; set; }
        public string? CaptureTransactionId { get; set; }
        public int? JobId { get; set; }       // FK ka job_orders (null za survey uplate)
        public int? SurveyId { get; set; }    // FK ka site_surveys (null za job uplate)
        public JobOrder? JobOrder { get; set; }
    }
}
