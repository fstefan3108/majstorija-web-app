using WebProdavnica.Entities;

namespace WebProdavnica.BusinessLayer.Abstract
{
    public interface ICardTokenService
    {
        CardToken? GetByUserId(int userId);
        bool Save(int userId, string registrationId, string? cardBrand, string? maskedNumber);
    }
}