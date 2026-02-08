using Microsoft.AspNetCore.Mvc;
using WebProdavnica.Entities;
using WebProdavnica.DAL.Abstract;

namespace WebProdavnica.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class PaymentsController : ControllerBase
    {
        private readonly IPaymentRepository _paymentRepository;

        public PaymentsController(IPaymentRepository paymentRepository)
        {
            _paymentRepository = paymentRepository;
        }

        // GET: api/payments
        [HttpGet]
        public IActionResult GetAllPayments()
        {
            var payments = _paymentRepository.GetAll();
            return Ok(payments);
        }

        // GET: api/payments/5
        [HttpGet("{id}")]
        public IActionResult GetPaymentById(int id)
        {
            var payment = _paymentRepository.GetById(id);
            if (payment == null)
                return NotFound(new { message = "Payment not found" });

            return Ok(payment);
        }

        // GET: api/payments/user/5
        [HttpGet("user/{userId}")]
        public IActionResult GetPaymentsByUser(int userId)
        {
            var payments = _paymentRepository.GetByUserId(userId);
            return Ok(payments);
        }

        // POST: api/payments
        [HttpPost]
        public IActionResult CreatePayment([FromBody] Payment payment)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var success = _paymentRepository.Add(payment);
            if (success)
                return CreatedAtAction(nameof(GetPaymentById), new { id = payment.Id }, payment);

            return BadRequest(new { message = "Failed to create payment" });
        }

        // PUT: api/payments/5
        [HttpPut("{id}")]
        public IActionResult UpdatePayment(int id, [FromBody] Payment payment)
        {
            if (id != payment.Id)
                return BadRequest(new { message = "ID mismatch" });

            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var success = _paymentRepository.Update(payment);
            if (success)
                return Ok(payment);

            return NotFound(new { message = "Payment not found" });
        }

        // DELETE: api/payments/5
        [HttpDelete("{id}")]
        public IActionResult DeletePayment(int id)
        {
            var success = _paymentRepository.Delete(id);
            if (success)
                return NoContent();

            return NotFound(new { message = "Payment not found" });
        }
    }
}