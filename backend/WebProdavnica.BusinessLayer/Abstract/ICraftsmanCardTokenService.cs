using WebProdavnica.Entities;

namespace WebProdavnica.BusinessLayer.Abstract
{
    public interface ICraftsmanCardTokenService
    {
        CraftsmanCardToken? GetById(int id);
        CraftsmanCardToken? GetByCraftsmanId(int craftsmanId);
        IEnumerable<CraftsmanCardToken> GetAllByCraftsmanId(int craftsmanId);
        void Save(int craftsmanId, string registrationId, string? cardBrand, string? maskedNumber);
        bool Delete(int id);
    }
}
