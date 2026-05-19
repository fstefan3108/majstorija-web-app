using WebProdavnica.Entities;

namespace WebProdavnica.DAL.Abstract
{
    public interface ICraftsmanCardTokenRepository
    {
        CraftsmanCardToken? GetById(int id);
        CraftsmanCardToken? GetByCraftsmanId(int craftsmanId);
        IEnumerable<CraftsmanCardToken> GetAllByCraftsmanId(int craftsmanId);
        bool Add(CraftsmanCardToken token);
        bool Delete(int id);
    }
}
