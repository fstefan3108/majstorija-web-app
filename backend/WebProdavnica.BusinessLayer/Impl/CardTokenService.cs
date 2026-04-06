using WebProdavnica.BusinessLayer.Abstract;
using WebProdavnica.DAL.Abstract;
using WebProdavnica.Entities;

namespace WebProdavnica.BusinessLayer.Impl
{
    public class CardTokenService : ICardTokenService
    {
        private readonly ICardTokenRepository _repo;
        public CardTokenService(ICardTokenRepository repo) => _repo = repo;

        public CardToken? GetByUserId(int userId) => _repo.GetByUserId(userId);

        public bool Save(int userId, string registrationId, string? cardBrand, string? maskedNumber)
        {
            return _repo.Add(new CardToken
            {
                UserId = userId,
                RegistrationId = registrationId,
                CardBrand = cardBrand,
                MaskedNumber = maskedNumber,
                CreatedAt = DateTime.Now,
            });
        }
    }
}