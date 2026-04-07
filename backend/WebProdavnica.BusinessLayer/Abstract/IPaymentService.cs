using WebProdavnica.Entities;

namespace WebProdavnica.BusinessLayer.Abstract
{
    public interface IPaymentService
    {
        bool Add(Payment payment);
        List<Payment> GetByJob(int jobId);
        Payment? GetByTransactionId(string transactionId);
        bool UpdateStatus(int jobId, string newStatus);
        bool UpdateCapture(int jobId, string captureTransactionId);
    }
}