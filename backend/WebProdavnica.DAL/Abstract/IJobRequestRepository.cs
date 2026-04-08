using WebProdavnica.Entities;

namespace WebProdavnica.DAL.Abstract
{
    public interface IJobRequestRepository
    {
        int Add(JobRequest request);                        // vraca novi request_id
        JobRequest? Get(int id);
        List<JobRequest> GetByUser(int userId);
        List<JobRequest> GetByCraftsman(int craftsmanId);
        bool UpdateStatus(int requestId, string status);
        bool SetEstimate(int requestId, int estimatedMinutes, decimal estimatedPrice);
        bool SetJobOrderId(int requestId, int jobOrderId);
        void AddImage(int requestId, string filePath);
        List<string> GetImages(int requestId);
    }
}
