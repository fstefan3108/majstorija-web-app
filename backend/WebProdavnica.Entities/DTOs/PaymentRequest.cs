using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace WebProdavnica.Entities.DTOs
{
    public class InitiatePaymentRequest
    {
        public int JobId { get; set; }
        public int UserId { get; set; }
        public int CraftsmanId { get; set; }
        public decimal Amount { get; set; }
        public string CardNumber { get; set; }
        public string CardExpiryMonth { get; set; }
        public string CardExpiryYear { get; set; }   
        public string CardCvv { get; set; }
        public string CardBrand { get; set; }      
        public string? MerchantTransactionId { get; set; } 
    }

    public class PaymentStatusRequest
    {
        public string TransactionId { get; set; }
        public int JobId { get; set; }
        public decimal Amount { get; set; }
    }
}
