using WebProdavnica.Entities;

namespace WebProdavnica.DAL.Abstract
{
    public interface ICardTokenRepository
    {
        CardToken? GetByUserId(int userId);
        bool Add(CardToken token);
    }
}