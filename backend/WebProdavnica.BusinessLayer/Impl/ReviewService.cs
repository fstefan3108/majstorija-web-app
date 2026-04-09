using WebProdavnica.BusinessLayer.Abstract;
using WebProdavnica.DAL.Abstract;
using WebProdavnica.Entities;

namespace WebProdavnica.BusinessLayer.Impl
{
    public class ReviewService : IReviewService
    {
        private readonly IReviewRepository _reviewRepository;
        private readonly ICraftsmanRepository _craftsmanRepository;
        private readonly IJobOrderRepository _jobOrderRepository;
        private readonly INotificationService _notificationService;

        public ReviewService(
            IReviewRepository reviewRepository,
            ICraftsmanRepository craftsmanRepository,
            IJobOrderRepository jobOrderRepository,
            INotificationService notificationService)
        {
            _reviewRepository = reviewRepository;
            _craftsmanRepository = craftsmanRepository;
            _jobOrderRepository = jobOrderRepository;
            _notificationService = notificationService;
        }

        public bool AddReview(Review review)
        {
            if (review == null) return false;
            if (review.Rating < 1 || review.Rating > 5) return false;

            review.CreatedAt = DateTime.UtcNow;
            bool added = _reviewRepository.Add(review);
            if (!added) return false;

            var job = _jobOrderRepository.Get(review.JobId);
            if (job != null)
            {
                _craftsmanRepository.UpdateRating(job.CraftsmanId);

                // Notifikacija za majstora
                var craftsman = _craftsmanRepository.Get(job.CraftsmanId);
                if (craftsman != null)
                {
                    var commentPreview = string.IsNullOrWhiteSpace(review.Comment)
                        ? ""
                        : $": \"{(review.Comment.Length > 60 ? review.Comment[..60] + "…" : review.Comment)}\"";

                    _ = _notificationService.SendAsync(new Notification
                    {
                        RecipientId = job.CraftsmanId,
                        RecipientType = "craftsman",
                        Type = "review_received",
                        Title = "Nova ocena",
                        Message = $"Korisnik Vas je ocenio sa {review.Rating}/5 zvezda{commentPreview}.",
                        RelatedEntityId = job.CraftsmanId, // koristimo za navigaciju na profil
                    }, craftsman.Email ?? "");
                }
            }

            return true;
        }

        // Ostale metode ostaju nepromenjene
        public Review? GetReviewByJobId(int jobId)
            => _reviewRepository.GetByJobId(jobId);

        public List<Review> GetReviewsByCraftsmanId(int craftsmanId)
            => _reviewRepository.GetByCraftsmanId(craftsmanId);

        public List<Review> GetReviewsByUserId(int userId)
            => _reviewRepository.GetByUserId(userId);

        public bool UpdateReview(Review review)
        {
            if (review == null) return false;
            if (review.Rating < 1 || review.Rating > 5) return false;
            bool updated = _reviewRepository.Update(review);
            if (!updated) return false;
            var job = _jobOrderRepository.Get(review.JobId);
            if (job != null)
                _craftsmanRepository.UpdateRating(job.CraftsmanId);
            return true;
        }

        public bool DeleteReview(int reviewId)
        {
            var review = _reviewRepository.GetByJobId(reviewId);
            bool deleted = _reviewRepository.Delete(reviewId);
            if (!deleted) return false;
            if (review != null)
            {
                var job = _jobOrderRepository.Get(review.JobId);
                if (job != null)
                    _craftsmanRepository.UpdateRating(job.CraftsmanId);
            }
            return true;
        }
    }
}