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
        public decimal? PreauthorizedAmount { get; set; }  // buffered amount (Amount * 1.5)
        public int JobId { get; set; }
        public JobOrder JobOrder { get; set; }
    }
}
