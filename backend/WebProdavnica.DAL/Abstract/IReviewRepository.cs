using WebProdavnica.Entities;

namespace WebProdavnica.DAL.Abstract
{
    public interface IReviewRepository
    {
        bool Add(Review review);
        Review? GetByJobId(int jobId);
        List<Review> GetByCraftsmanId(int craftsmanId);
        List<Review> GetByUserId(int userId);
        bool Update(Review review);
        bool Delete(int reviewId);
    }
}