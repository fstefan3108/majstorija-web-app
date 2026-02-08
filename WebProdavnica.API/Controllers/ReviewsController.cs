using Microsoft.AspNetCore.Mvc;
using WebProdavnica.Entities;
using WebProdavnica.DAL.Abstract;

namespace WebProdavnica.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ReviewsController : ControllerBase
    {
        private readonly IReviewRepository _reviewRepository;

        public ReviewsController(IReviewRepository reviewRepository)
        {
            _reviewRepository = reviewRepository;
        }

        // GET: api/reviews
        [HttpGet]
        public IActionResult GetAllReviews()
        {
            var reviews = _reviewRepository.GetAll();
            return Ok(reviews);
        }

        // GET: api/reviews/5
        [HttpGet("{id}")]
        public IActionResult GetReviewById(int id)
        {
            var review = _reviewRepository.GetById(id);
            if (review == null)
                return NotFound(new { message = "Review not found" });

            return Ok(review);
        }

        // GET: api/reviews/craftsman/5
        [HttpGet("craftsman/{craftsmanId}")]
        public IActionResult GetReviewsByCraftsman(int craftsmanId)
        {
            var reviews = _reviewRepository.GetByCraftsmanId(craftsmanId);
            return Ok(reviews);
        }

        // POST: api/reviews
        [HttpPost]
        public IActionResult CreateReview([FromBody] Review review)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var success = _reviewRepository.Add(review);
            if (success)
                return CreatedAtAction(nameof(GetReviewById), new { id = review.Id }, review);

            return BadRequest(new { message = "Failed to create review" });
        }

        // PUT: api/reviews/5
        [HttpPut("{id}")]
        public IActionResult UpdateReview(int id, [FromBody] Review review)
        {
            if (id != review.Id)
                return BadRequest(new { message = "ID mismatch" });

            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var success = _reviewRepository.Update(review);
            if (success)
                return Ok(review);

            return NotFound(new { message = "Review not found" });
        }

        // DELETE: api/reviews/5
        [HttpDelete("{id}")]
        public IActionResult DeleteReview(int id)
        {
            var success = _reviewRepository.Delete(id);
            if (success)
                return NoContent();

            return NotFound(new { message = "Review not found" });
        }
    }
}