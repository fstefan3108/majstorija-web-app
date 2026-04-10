using WebProdavnica.Entities;

namespace WebProdavnica.DAL.Abstract
{
    public interface ICraftsmanRepository
    {
        bool Add(Craftsman craftsman);
        Craftsman? Get(int id);
        Craftsman? GetByEmail(string email);
        Craftsman? GetByGoogleId(string googleId);
        Craftsman? GetByResetToken(string token);
        List<Craftsman> GetAll();
        bool Update(Craftsman craftsman);
        bool UpdatePassword(int craftsmanId, string newPasswordHash);
        bool Delete(int id);
        bool UpdateRating(int craftsmanId);
    }
}
