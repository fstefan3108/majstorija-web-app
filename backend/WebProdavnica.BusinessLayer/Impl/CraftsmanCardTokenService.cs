using WebProdavnica.BusinessLayer.Abstract;
using WebProdavnica.DAL.Abstract;
using WebProdavnica.Entities;

namespace WebProdavnica.BusinessLayer.Impl
{
    public class CraftsmanCardTokenService : ICraftsmanCardTokenService
    {
        private readonly ICraftsmanCardTokenRepository _repo;
        public CraftsmanCardTokenService(ICraftsmanCardTokenRepository repo) => _repo = repo;

        public CraftsmanCardToken? GetById(int id) => _repo.GetById(id);

        public CraftsmanCardToken? GetByCraftsmanId(int craftsmanId) =>
            _repo.GetByCraftsmanId(craftsmanId);

        public IEnumerable<CraftsmanCardToken> GetAllByCraftsmanId(int craftsmanId) =>
            _repo.GetAllByCraftsmanId(craftsmanId);

        public void Save(int craftsmanId, string registrationId, string? cardBrand, string? maskedNumber)
        {
            _repo.Add(new CraftsmanCardToken
            {
                CraftsmanId    = craftsmanId,
                RegistrationId = registrationId,
                CardBrand      = cardBrand,
                MaskedNumber   = maskedNumber,
                CreatedAt      = DateTime.UtcNow,
            });
        }

        public bool Delete(int id) => _repo.Delete(id);
    }
}
