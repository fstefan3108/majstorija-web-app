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
        Craftsman? GetByVerificationToken(string token);
        List<Craftsman> GetAll();
        bool Update(Craftsman craftsman);
        bool UpdatePassword(int craftsmanId, string newPasswordHash);
        bool SetVerified(int craftsmanId);
        bool UpdateVerificationToken(int craftsmanId, string token, DateTime expiry);
        bool Delete(int id);
        bool UpdateRating(int craftsmanId);

        // Podkategorije
        bool SaveSubcategories(int craftsmanId, List<string> subcategoryIds);
        List<string> GetSubcategories(int craftsmanId);
        List<string> GetCategories(int craftsmanId);
        List<Craftsman> GetBySubcategorySlug(string slug);
    }
}
