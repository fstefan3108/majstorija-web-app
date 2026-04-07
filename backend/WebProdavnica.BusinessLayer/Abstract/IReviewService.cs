using WebProdavnica.Entities;

namespace WebProdavnica.BusinessLayer.Abstract
{
    public interface IReviewService
    {
        bool AddReview(Review review);
        Review? GetReviewByJobId(int jobId);
        List<Review> GetReviewsByCraftsmanId(int craftsmanId);
        List<Review> GetReviewsByUserId(int userId);
        bool UpdateReview(Review review);
        bool DeleteReview(int reviewId);
    }
}