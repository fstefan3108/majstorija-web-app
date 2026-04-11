using WebProdavnica.Entities;

namespace WebProdavnica.DAL.Abstract
{
    public interface IUserRepository
    {
        bool Add(User user);
        User? Get(int id);
        User? GetByEmail(string email);
        User? GetByGoogleId(string googleId);
        User? GetByResetToken(string token);
        User? GetByVerificationToken(string token);
        List<User> GetAll();
        bool Update(User user);
        bool UpdatePassword(int userId, string newPasswordHash);
        bool SetVerified(int userId);
        bool UpdateVerificationToken(int userId, string token, DateTime expiry);
        bool Delete(int id);
    }
}
