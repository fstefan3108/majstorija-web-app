using WebProdavnica.Entities;

namespace WebProdavnica.BusinessLayer.Abstract
{
    public interface ICraftsmanService
    {
        bool Add(Craftsman craftsman);
        bool Update(Craftsman craftsman);
        bool UpdatePassword(int id, string newPasswordHash);
        bool Delete(int id);
        Craftsman? Get(int id);
        List<Craftsman> GetAll();
        List<Craftsman> GetByProfession(string profession);
        List<Craftsman> GetByLocation(string location);
        List<Craftsman> Search(string? profession, string? location, decimal? maxRate, decimal? minRating);

        // Podkategorije
        bool SaveSubcategories(int craftsmanId, List<string> subcategoryIds);
        List<string> GetSubcategories(int craftsmanId);
        List<string> GetCategories(int craftsmanId);
        List<Craftsman> GetBySubcategorySlug(string slug);
    }
}
