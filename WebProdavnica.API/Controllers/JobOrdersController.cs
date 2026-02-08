using Microsoft.AspNetCore.Mvc;
using WebProdavnica.Entities;
using WebProdavnica.DAL.Abstract;

namespace WebProdavnica.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class JobOrdersController : ControllerBase
    {
        private readonly IJobOrderRepository _jobOrderRepository;

        public JobOrdersController(IJobOrderRepository jobOrderRepository)
        {
            _jobOrderRepository = jobOrderRepository;
        }

        // GET: api/joborders
        [HttpGet]
        public IActionResult GetAllJobOrders()
        {
            var jobOrders = _jobOrderRepository.GetAll();
            return Ok(jobOrders);
        }

        // GET: api/joborders/5
        [HttpGet("{id}")]
        public IActionResult GetJobOrderById(int id)
        {
            var jobOrder = _jobOrderRepository.GetById(id);
            if (jobOrder == null)
                return NotFound(new { message = "Job order not found" });

            return Ok(jobOrder);
        }

        // GET: api/joborders/user/5
        [HttpGet("user/{userId}")]
        public IActionResult GetJobOrdersByUser(int userId)
        {
            var jobOrders = _jobOrderRepository.GetByUserId(userId);
            return Ok(jobOrders);
        }

        // GET: api/joborders/craftsman/5
        [HttpGet("craftsman/{craftsmanId}")]
        public IActionResult GetJobOrdersByCraftsman(int craftsmanId)
        {
            var jobOrders = _jobOrderRepository.GetByCraftsmanId(craftsmanId);
            return Ok(jobOrders);
        }

        // POST: api/joborders
        [HttpPost]
        public IActionResult CreateJobOrder([FromBody] JobOrder jobOrder)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var success = _jobOrderRepository.Add(jobOrder);
            if (success)
                return CreatedAtAction(nameof(GetJobOrderById), new { id = jobOrder.Id }, jobOrder);

            return BadRequest(new { message = "Failed to create job order" });
        }

        // PUT: api/joborders/5
        [HttpPut("{id}")]
        public IActionResult UpdateJobOrder(int id, [FromBody] JobOrder jobOrder)
        {
            if (id != jobOrder.Id)
                return BadRequest(new { message = "ID mismatch" });

            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var success = _jobOrderRepository.Update(jobOrder);
            if (success)
                return Ok(jobOrder);

            return NotFound(new { message = "Job order not found" });
        }

        // DELETE: api/joborders/5
        [HttpDelete("{id}")]
        public IActionResult DeleteJobOrder(int id)
        {
            var success = _jobOrderRepository.Delete(id);
            if (success)
                return NoContent();

            return NotFound(new { message = "Job order not found" });
        }
    }
}