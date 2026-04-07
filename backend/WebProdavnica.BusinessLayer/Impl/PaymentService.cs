using WebProdavnica.BusinessLayer.Abstract;
using WebProdavnica.DAL.Abstract;
using WebProdavnica.Entities;

namespace WebProdavnica.BusinessLayer.Impl
{
    public class PaymentService : IPaymentService
    {
        private readonly IPaymentRepository _paymentRepository;
        public PaymentService(IPaymentRepository paymentRepository)
            => _paymentRepository = paymentRepository;

        public bool Add(Payment payment)
        {
            payment.PaymentDate = DateTime.Now;
            return _paymentRepository.Add(payment);
        }

        public List<Payment> GetByJob(int jobId)
            => _paymentRepository.GetByJob(jobId);

        public Payment? GetByTransactionId(string transactionId)
            => _paymentRepository.GetByTransactionId(transactionId);

        public bool UpdateStatus(int jobId, string newStatus)
            => _paymentRepository.UpdateStatus(jobId, newStatus);

        public bool UpdateCapture(int jobId, string captureTransactionId)
            => _paymentRepository.UpdateCapture(jobId, captureTransactionId);
    }
}