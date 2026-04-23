using WebProdavnica.Entities;

namespace WebProdavnica.BusinessLayer.Abstract
{
    public interface IPaymentService
    {
        bool Add(Payment payment);
        List<Payment> GetByJob(int jobId);
        List<Payment> GetBySurvey(int surveyId);
        Payment? GetByTransactionId(string transactionId);
        bool UpdateStatus(int jobId, string newStatus);
        bool UpdateStatusBySurvey(int surveyId, string newStatus);
        bool UpdateCapture(int jobId, string captureTransactionId);
        bool UpdateCaptureBySurvey(int surveyId, string captureTransactionId);
    }
}
