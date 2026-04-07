using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using WebProdavnica.Entities;

namespace WebProdavnica.DAL.Abstract
{
    public interface IPaymentRepository
    {
        bool Add(Payment p);
        List<Payment> GetByJob(int jobId);
        Payment? GetByTransactionId(string transactionId);
        bool UpdateStatus(int jobId, string newStatus);
        bool UpdateCapture(int jobId, string captureTransactionId);
    }
}
