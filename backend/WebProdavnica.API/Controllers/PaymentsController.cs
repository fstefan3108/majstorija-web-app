using Microsoft.AspNetCore.Mvc;
using WebProdavnica.BusinessLayer.Abstract;
using WebProdavnica.Entities;
using WebProdavnica.Entities.DTOs;

namespace WebProdavnica.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class PaymentsController : ControllerBase
    {
        private readonly IPaymentService _paymentService;
        private readonly ICardTokenService _cardTokenService;
        private readonly IJobOrderService _jobOrderService;
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly IConfiguration _config;

        public PaymentsController(
            IPaymentService paymentService,
            ICardTokenService cardTokenService,
            IJobOrderService jobOrderService,
            IHttpClientFactory httpClientFactory,
            IConfiguration config)
        {
            _paymentService = paymentService;
            _cardTokenService = cardTokenService;
            _jobOrderService = jobOrderService;
            _httpClientFactory = httpClientFactory;
            _config = config;
        }

        // GET /api/payments/card-token/{userId}
        // Frontend calls this on Checkout load to check if the user has a saved card.
        [HttpGet("card-token/{userId}")]
        public IActionResult GetCardToken(int userId)
        {
            var token = _cardTokenService.GetByUserId(userId);
            if (token == null)
                return Ok(new { hasToken = false });

            return Ok(new
            {
                hasToken = true,
                cardBrand = token.CardBrand,
                maskedNumber = token.MaskedNumber,
            });
        }

        // POST /api/payments/initiate
        // Phase 1+2: tokenize card (first time) + pre-authorize with 50% buffer.
        [HttpPost("initiate")]
        public async Task<IActionResult> Initiate([FromBody] InitiatePaymentRequest request)
        {
            var isMock = _config.GetValue<bool>("AllSecure:MockPayments");
            var preauthAmount = request.Amount * 1.5m;  // 50% buffer

            if (isMock)
            {
                // Save a mock card token if user doesn't have one yet
                var existing = _cardTokenService.GetByUserId(request.UserId);
                if (existing == null && request.CardNumber != null)
                {
                    var masked = "************" + request.CardNumber.Replace(" ", "")[^4..];
                    _cardTokenService.Save(request.UserId, Guid.NewGuid().ToString("N"), request.CardBrand, masked);
                }

                var mockTransactionId = Guid.NewGuid().ToString("N");
                _paymentService.Add(new Payment
                {
                    JobId = request.JobId,
                    Amount = request.Amount,
                    PreauthorizedAmount = preauthAmount,
                    Currency = "RSD",
                    PaymentMethod = request.CardBrand,
                    PaymentStatus = "Preauthorized",
                    TransactionId = mockTransactionId,
                });
                return Ok(new { status = "preauthorized", transactionId = mockTransactionId, preauthAmount });
            }

            // ── Real AllSecure call ───────────────────────────────────────────
            var entityId = _config["AllSecure:EntityId"];
            var shopperResultUrl = _config["AllSecure:ShopperResultUrl"];
            var existingToken = _cardTokenService.GetByUserId(request.UserId);

            var formParams = new Dictionary<string, string>
            {
                ["entityId"] = entityId,
                ["amount"] = preauthAmount.ToString("F2", System.Globalization.CultureInfo.InvariantCulture),
                ["currency"] = "RSD",
                ["paymentType"] = "PA",   // Pre-Authorization — reserves funds, does not capture
                ["merchantTransactionId"] = Guid.NewGuid().ToString("N"),
                ["shopperResultUrl"] = shopperResultUrl,
                ["threeDSecure.channel"] = "BROWSER",
            };

            if (existingToken != null)
            {
                // Returning user — charge via stored token, no card form needed
                formParams["registrations[0].id"] = existingToken.RegistrationId;
            }
            else
            {
                // First-time user — send card data and ask AllSecure to tokenize
                formParams["paymentBrand"] = request.CardBrand!.ToUpper();
                formParams["card.number"] = request.CardNumber!;
                formParams["card.expiryMonth"] = request.CardExpiryMonth!;
                formParams["card.expiryYear"] = request.CardExpiryYear!;
                formParams["card.cvv"] = request.CardCvv!;
                formParams["createRegistration"] = "true";
            }

            var client = _httpClientFactory.CreateClient("AllSecure");
            var response = await client.PostAsync("/v1/payments", new FormUrlEncodedContent(formParams));
            var body = await response.Content.ReadAsStringAsync();
            var json = System.Text.Json.JsonDocument.Parse(body).RootElement;

            var resultCode = json.GetProperty("result").GetProperty("code").GetString();
            var transactionId = json.GetProperty("id").GetString();

            if (resultCode == "000.000.000")
            {
                // Save token if this was a first-time card registration
                if (existingToken == null && json.TryGetProperty("registrationId", out var regEl))
                {
                    var masked = "************" + request.CardNumber![^4..];
                    _cardTokenService.Save(request.UserId, regEl.GetString()!, request.CardBrand, masked);
                }

                _paymentService.Add(new Payment
                {
                    JobId = request.JobId,
                    Amount = request.Amount,
                    PreauthorizedAmount = preauthAmount,
                    Currency = "RSD",
                    PaymentMethod = request.CardBrand ?? existingToken?.CardBrand,
                    PaymentStatus = "Preauthorized",
                    TransactionId = transactionId,
                });

                return Ok(new { status = "preauthorized", transactionId, preauthAmount });
            }
            else if (resultCode == "000.200.000")
            {
                var redirectUrl = json.GetProperty("redirect").GetProperty("url").GetString();
                _paymentService.Add(new Payment
                {
                    JobId = request.JobId,
                    Amount = request.Amount,
                    PreauthorizedAmount = preauthAmount,
                    Currency = "RSD",
                    PaymentMethod = request.CardBrand ?? existingToken?.CardBrand,
                    PaymentStatus = "Pending",
                    TransactionId = transactionId,
                    RedirectUrl = redirectUrl,
                });
                return Ok(new { status = "redirect", redirectUrl, transactionId });
            }
            else
            {
                var description = json.GetProperty("result").GetProperty("description").GetString();
                return BadRequest(new { status = "failed", code = resultCode, description });
            }
        }

        // GET /api/payments/status/{transactionId}
        [HttpGet("status/{transactionId}")]
        public async Task<IActionResult> CheckStatus(string transactionId)
        {
            var isMock = _config.GetValue<bool>("AllSecure:MockPayments");
            if (isMock)
                return Ok(new { success = true, code = "000.000.000" });

            var entityId = _config["AllSecure:EntityId"];
            var client = _httpClientFactory.CreateClient("AllSecure");
            var response = await client.GetAsync($"/v1/payments/{transactionId}?entityId={entityId}");
            var body = await response.Content.ReadAsStringAsync();
            var json = System.Text.Json.JsonDocument.Parse(body).RootElement;
            var resultCode = json.GetProperty("result").GetProperty("code").GetString();

            return Ok(new { success = resultCode == "000.000.000", code = resultCode });
        }

        // GET /api/payments/job/{jobId}
        [HttpGet("job/{jobId}")]
        public IActionResult GetByJob(int jobId)
        {
            return Ok(_paymentService.GetByJob(jobId));
        }

        // POST /api/payments/{jobId}/capture
        // Phase 4: Client confirms the job is done → capture the pre-authorized amount.
        [HttpPost("{jobId}/capture")]
        public async Task<IActionResult> Capture(int jobId)
        {
            var isMock = _config.GetValue<bool>("AllSecure:MockPayments");

            var payments = _paymentService.GetByJob(jobId);
            var payment = payments.LastOrDefault();
            if (payment == null)
                return NotFound(new { success = false, message = "Plaćanje nije pronađeno" });

            var job = _jobOrderService.Get(jobId);
            if (job == null)
                return NotFound(new { success = false, message = "Posao nije pronađen" });

            if (!isMock)
            {
                var entityId = _config["AllSecure:EntityId"];
                var formParams = new Dictionary<string, string>
                {
                    ["entityId"] = entityId,
                    ["amount"] = job.TotalPrice.ToString("F2", System.Globalization.CultureInfo.InvariantCulture),
                    ["currency"] = "RSD",
                    ["paymentType"] = "CP",
                };

                var client = _httpClientFactory.CreateClient("AllSecure");
                var response = await client.PostAsync(
                    $"/v1/payments/{payment.TransactionId}",
                    new FormUrlEncodedContent(formParams));
                var body = await response.Content.ReadAsStringAsync();
                var json = System.Text.Json.JsonDocument.Parse(body).RootElement;
                var resultCode = json.GetProperty("result").GetProperty("code").GetString();

                if (resultCode != "000.000.000")
                {
                    var description = json.GetProperty("result").GetProperty("description").GetString();
                    return BadRequest(new { success = false, code = resultCode, description });
                }
            }

            _paymentService.UpdateStatus(jobId, "Captured");

            job.Status = "Završeno";
            _jobOrderService.Update(job);

            return Ok(new { success = true, actualPrice = job.TotalPrice });
        }
    }
}