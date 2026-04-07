using WebProdavnica.Entities;

namespace WebProdavnica.DAL.Abstract
{
    public interface IUserRepository
    {
        bool Add(User user);
        User? Get(int id);          
        User? GetByEmail(string email);
        List<User> GetAll();
        bool Update(User user);
        bool UpdatePassword(int userId, string newPasswordHash);
        bool Delete(int id);
    }
}