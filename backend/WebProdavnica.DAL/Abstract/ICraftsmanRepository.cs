using WebProdavnica.Entities;

namespace WebProdavnica.DAL.Abstract
{
    public interface ICraftsmanRepository
    {
        bool Add(Craftsman craftsman);
        Craftsman? Get(int id);    
        Craftsman? GetByEmail(string email);
        List<Craftsman> GetAll();
        bool Update(Craftsman craftsman);
        bool Delete(int id);
        bool UpdateRating(int craftsmanId);
    }
}