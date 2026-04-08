using WebProdavnica.Entities;

namespace WebProdavnica.BusinessLayer.Abstract
{
    public interface IJobRequestService
    {
        int Create(JobRequest request);
        JobRequest? Get(int id);
        List<JobRequest> GetByUser(int userId);
        List<JobRequest> GetByCraftsman(int craftsmanId);

        /// <summary>Majstor prihvata zahtev i postavlja procenu (sati + minuti, cena).</summary>
        bool Accept(int requestId, int estimatedMinutes, decimal hourlyRate);

        /// <summary>Majstor ili korisnik odbija zahtev.</summary>
        bool Decline(int requestId, string declinedBy); // "craftsman" | "user"

        /// <summary>Korisnik potvrdjuje ponudu majstora — poziva se pre checkout-a.</summary>
        bool Confirm(int requestId);

        /// <summary>Nakon uspesnog placanja — kreira JobOrder i linkuje ga na zahtev.</summary>
        int CreateJobOrderFromRequest(int requestId);

        void AddImage(int requestId, string filePath);
    }
}
