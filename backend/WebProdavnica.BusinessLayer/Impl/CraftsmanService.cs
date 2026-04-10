using WebProdavnica.DAL.Abstract;
using WebProdavnica.Entities;

namespace WebProdavnica.BusinessLayer.Impl
{
    public class CraftsmanService : Abstract.ICraftsmanService
    {
        private readonly ICraftsmanRepository _craftsmanRepository;
        private readonly Abstract.IReviewService _reviewService;

        public CraftsmanService(ICraftsmanRepository craftsmanRepository, Abstract.IReviewService reviewService)
        {
            _craftsmanRepository = craftsmanRepository;
            _reviewService = reviewService;
        }

        public bool Add(Craftsman craftsman) => _craftsmanRepository.Add(craftsman);

        public bool Update(Craftsman craftsman) => _craftsmanRepository.Update(craftsman);

        public bool UpdatePassword(int id, string newPasswordHash) =>
            _craftsmanRepository.UpdatePassword(id, newPasswordHash);

        public bool Delete(int id) => _craftsmanRepository.Delete(id);

        public Craftsman? Get(int id) => _craftsmanRepository.Get(id);

        public List<Craftsman> GetAll() => _craftsmanRepository.GetAll();

        public List<Craftsman> GetByProfession(string profession) =>
            _craftsmanRepository.GetAll()
                .Where(c => c.Professions.Any(p => p.ToLower().Contains(profession.ToLower()))
                            || (c.Profession != null && c.Profession.ToLower().Contains(profession.ToLower())))
                .ToList();

        public List<Craftsman> GetByLocation(string location) =>
            _craftsmanRepository.GetAll()
                .Where(c => c.Location != null && c.Location.ToLower().Contains(location.ToLower()))
                .ToList();

        private decimal? GetAverageRating(int craftsmanId)
        {
            var reviews = _reviewService.GetReviewsByCraftsmanId(craftsmanId);
            if (!reviews.Any()) return null;
            return (decimal)reviews.Average(r => r.Rating);
        }

        public List<Craftsman> Search(string? profession, string? location, decimal? maxRate, decimal? minRating)
        {
            var all = _craftsmanRepository.GetAll();

            if (!string.IsNullOrEmpty(profession))
                all = all.Where(c =>
                    c.Professions.Any(p => p.ToLower().Contains(profession.ToLower()))
                    || (c.Profession != null && c.Profession.ToLower().Contains(profession.ToLower()))
                ).ToList();

            if (!string.IsNullOrEmpty(location))
                all = all.Where(c => c.Location != null && c.Location.ToLower().Contains(location.ToLower())).ToList();

            if (maxRate.HasValue)
                all = all.Where(c => c.HourlyRate <= maxRate.Value).ToList();

            if (minRating.HasValue)
                all = all.Where(c => GetAverageRating(c.CraftsmanId) >= minRating.Value).ToList();

            return all.OrderByDescending(c => GetAverageRating(c.CraftsmanId) ?? 0).ToList();
        }
    }
}
