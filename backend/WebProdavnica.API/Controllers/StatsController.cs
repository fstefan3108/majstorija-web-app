using Microsoft.AspNetCore.Mvc;
using WebProdavnica.BusinessLayer.Abstract;

namespace WebProdavnica.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class StatsController : ControllerBase
    {
        private readonly IUserService _userService;
        private readonly ICraftsmanService _craftsmanService;
        private readonly IJobOrderService _jobOrderService;
        private readonly IReviewService _reviewService;

        public StatsController(
            IUserService userService,
            ICraftsmanService craftsmanService,
            IJobOrderService jobOrderService,
            IReviewService reviewService)
        {
            _userService = userService;
            _craftsmanService = craftsmanService;
            _jobOrderService = jobOrderService;
            _reviewService = reviewService;
        }

        // GET /api/stats
        [HttpGet]
        public IActionResult GetStats()
        {
            try
            {
                var userCount = _userService.GetAll().Count;
                var craftsmanCount = _craftsmanService.GetAll().Count;

                var completedJobs = _jobOrderService.GetAll()
                    .Where(j => (j.Status ?? "").ToLower() == "završeno")
                    .ToList();

                var completedJobsCount = completedJobs.Count;

                var reviewsCount = completedJobs
                    .Count(j => _reviewService.GetReviewByJobId(j.JobId) != null);

                return Ok(new
                {
                    success = true,
                    totalUsers = userCount + craftsmanCount,
                    completedJobs = completedJobsCount,
                    reviews = reviewsCount
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, error = ex.Message });
            }
        }
    }
}
