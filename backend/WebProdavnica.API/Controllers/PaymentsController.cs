using System.Text;
using Microsoft.AspNetCore.Mvc;
using WebProdavnica.API.Services;
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
        private readonly IUserService _userService;
        private readonly ICraftsmanService _craftsmanService;
        private readonly INotificationService _notificationService;
        private readonly AllSecureClient _allSecure;

        public PaymentsController(
            IPaymentService paymentService,
            ICardTokenService cardTokenService,
            IJobOrderService jobOrderService,
            IUserService userService,
            ICraftsmanService craftsmanService,
            INotificationService notificationService,
            AllSecureClient allSecure)
        {
            _paymentService = paymentService;
            _cardTokenService = cardTokenService;
            _jobOrderService = jobOrderService;
            _userService = userService;
            _craftsmanService = craftsmanService;
            _notificationService = notificationService;
            _allSecure = allSecure;
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
        // Phase 1+2: preauthorize with 50% buffer.
        // First-time user  → AllSecure returns REDIRECT to hosted card entry page.
        //                     RegistrationId arrives later via callback (withRegister=true).
        // Returning user   → charge via saved token, typically FINISHED immediately.
        [HttpPost("initiate")]
        public async Task<IActionResult> Initiate([FromBody] InitiatePaymentRequest request)
        {
            var preauthAmount = request.Amount * 1.5m;  // 50% buffer
            var merchantTransactionId = Guid.NewGuid().ToString("N");
            var existingToken = _cardTokenService.GetByUserId(request.UserId);

            AllSecureResult result;

            if (existingToken != null)
            {
                // Returning user — charge via stored registration token, no card form needed.
                result = await _allSecure.PreauthorizeWithRegistrationAsync(
                    merchantTransactionId,
                    preauthAmount,
                    "RSD",
                    existingToken.RegistrationId,
                    request.JobId);
            }
            else
            {
                // First-time user — AllSecure returns REDIRECT to their hosted card entry page.
                // withRegister=true asks AllSecure to tokenize the card for future charges.
                // RegistrationId arrives in the callback after the user completes payment.
                var user = _userService.Get(request.UserId);
                var customerEmail = user?.Email ?? "customer@majstorija.rs";
                var customerIp = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "127.0.0.1";

                result = await _allSecure.PreauthorizeAsync(
                    merchantTransactionId,
                    preauthAmount,
                    "RSD",
                    customerEmail,
                    customerIp,
                    request.JobId,
                    withRegister: true);
            }

            return result.ReturnType switch
            {
                "FINISHED" => HandlePreauthFinished(request, preauthAmount, result, existingToken),
                "REDIRECT" => HandlePreauthRedirect(request, preauthAmount, result, existingToken),
                "PENDING"  => HandlePreauthPending(request, preauthAmount, result, existingToken),
                _          => BadRequest(new { status = "failed", message = result.ErrorMessage ?? "AllSecure error" }),
            };
        }

        // GET /api/payments/status/{transactionId}
        // Called by PaymentSuccess.jsx after returning from AllSecure's redirect page.
        // Polls until the callback updates the status from Pending to Preauthorized.
        [HttpGet("status/{transactionId}")]
        public IActionResult CheckStatus(string transactionId)
        {
            var payment = _paymentService.GetByTransactionId(transactionId);
            if (payment == null)
                return NotFound(new { success = false });

            var success = payment.PaymentStatus == "Preauthorized";
            return Ok(new { success, status = payment.PaymentStatus });
        }

        // GET /api/payments/job/{jobId}
        [HttpGet("job/{jobId}")]
        public IActionResult GetByJob(int jobId)
        {
            return Ok(_paymentService.GetByJob(jobId));
        }

        // POST /api/payments/{jobId}/capture
        // Phase 4: client confirms job is done → capture the pre-authorised amount.
        [HttpPost("{jobId}/capture")]
        public async Task<IActionResult> Capture(int jobId)
        {
            var payments = _paymentService.GetByJob(jobId);
            var payment = payments.LastOrDefault();
            if (payment == null)
                return NotFound(new { success = false, message = "Plaćanje nije pronađeno" });

            // Guard against double-capture (user double-click or race with AutoCaptureService)
            if (payment.PaymentStatus == "Captured")
                return Ok(new { success = true, actualPrice = payment.Amount, alreadyCaptured = true });

            if (payment.PaymentStatus != "Preauthorized")
                return BadRequest(new { success = false, message = $"Nije moguće naplatiti plaćanje u statusu '{payment.PaymentStatus}'." });

            var job = _jobOrderService.Get(jobId);
            if (job == null)
                return NotFound(new { success = false, message = "Posao nije pronađen" });

            var result = await _allSecure.CaptureAsync(
                Guid.NewGuid().ToString("N"),
                payment.TransactionId!,
                job.TotalPrice,
                "RSD",
                jobId);

            if (result.ReturnType != "FINISHED" || !result.IsSuccess)
                return BadRequest(new { success = false, message = result.ErrorMessage ?? "Capture nije uspeo" });

            _paymentService.UpdateCapture(jobId, result.ReferenceId!);

            job.Status = "Završeno";
            _jobOrderService.Update(job);

            return Ok(new { success = true, actualPrice = job.TotalPrice });
        }

        // POST /api/payments/{jobId}/refund
        // Dispute handling.
        // Captured payment     → refund via AllSecure's refund transaction.
        // Preauthorized only   → void the reservation instead.
        // Optional body: { "amount": 1234.56 } for partial refund (Captured only).
        [HttpPost("{jobId}/refund")]
        public async Task<IActionResult> Refund(int jobId, [FromBody] RefundRequest? request = null)
        {
            var payments = _paymentService.GetByJob(jobId);
            var payment = payments.LastOrDefault();
            if (payment == null)
                return NotFound(new { success = false, message = "Plaćanje nije pronađeno" });

            var job = _jobOrderService.Get(jobId);
            if (job == null)
                return NotFound(new { success = false, message = "Posao nije pronađen" });

            var refundAmount = (request?.Amount > 0) ? request.Amount!.Value : payment.Amount;

            AllSecureResult result;

            if (payment.PaymentStatus == "Captured" && payment.CaptureTransactionId != null)
            {
                result = await _allSecure.RefundAsync(
                    Guid.NewGuid().ToString("N"),
                    payment.CaptureTransactionId,
                    refundAmount,
                    payment.Currency ?? "RSD");
            }
            else if (payment.PaymentStatus == "Preauthorized" && payment.TransactionId != null)
            {
                result = await _allSecure.VoidAsync(
                    Guid.NewGuid().ToString("N"),
                    payment.TransactionId);
            }
            else
            {
                return BadRequest(new
                {
                    success = false,
                    message = $"Plaćanje u statusu '{payment.PaymentStatus}' ne može biti refundovano.",
                });
            }

            if (result.ReturnType != "FINISHED" || !result.IsSuccess)
                return BadRequest(new { success = false, message = result.ErrorMessage ?? "Refund nije uspeo" });

            var newPaymentStatus = payment.PaymentStatus == "Captured" ? "Refunded" : "Voided";
            _paymentService.UpdateStatus(jobId, newPaymentStatus);

            job.Status = "Otkazano";
            _jobOrderService.Update(job);

            return Ok(new { success = true, refundedAmount = refundAmount, newStatus = newPaymentStatus });
        }

        // POST /api/payments/callback/{jobId}
        // AllSecure calls this endpoint asynchronously after every transaction reaches its final state.
        // Must respond with HTTP 200 and body "OK" — otherwise AllSecure retries.
        [HttpPost("callback/{jobId}")]
        public async Task<IActionResult> Callback(int jobId)
        {
            string rawBody;
            using (var reader = new StreamReader(Request.Body, Encoding.UTF8))
                rawBody = await reader.ReadToEndAsync();

            var authHeader  = Request.Headers["Authorization"].FirstOrDefault();
            var contentType = Request.ContentType ?? "text/xml";
            var date        = Request.Headers["Date"].FirstOrDefault() ?? "";
            var requestUri  = Request.Path.ToString();

            if (!_allSecure.VerifyCallbackSignature("POST", rawBody, contentType, date, requestUri, authHeader))
                return Unauthorized();

            var cb = _allSecure.ParseCallback(rawBody);

            switch (cb.TransactionType?.ToUpper())
            {
                case "PREAUTHORIZE":
                    await HandlePreauthCallback(jobId, cb);
                    break;

                case "CAPTURE":
                    if (!cb.IsSuccess)
                        _paymentService.UpdateStatus(jobId, "CaptureFailed");
                    break;

                case "CHARGEBACK":
                    _paymentService.UpdateStatus(jobId, "Chargeback");
                    var cbJob = _jobOrderService.Get(jobId);
                    if (cbJob != null)
                    {
                        cbJob.Status = "Sporno";
                        _jobOrderService.Update(cbJob);
                    }
                    break;

                case "CHARGEBACK-REVERSAL":
                    _paymentService.UpdateStatus(jobId, "Captured");
                    break;
            }

            return Content("OK", "text/plain");
        }

        // ── Private helpers ───────────────────────────────────────────────────

        private async Task NotifyCraftsmanPaymentAsync(int jobId)
        {
            var job = _jobOrderService.Get(jobId);
            if (job == null) return;
            var craftsman = _craftsmanService.Get(job.CraftsmanId);
            if (craftsman == null) return;
            var dateStr = job.ScheduledDate.ToString("dd.MM.yyyy");
            await _notificationService.SendAsync(new Notification
            {
                RecipientId = job.CraftsmanId,
                RecipientType = "craftsman",
                Type = "job_confirmed",
                Title = "Posao zakazan!",
                Message = $"Korisnik je potvrdio i platio rezervaciju. Posao \"{job.JobDescription}\" zakazan za {dateStr}.",
                RelatedEntityId = jobId,
            }, craftsman.Email ?? "");
        }

        private async Task HandlePreauthCallback(int jobId, AllSecureCallbackResult cb)
        {
            if (cb.IsSuccess)
            {
                _paymentService.UpdateStatus(jobId, "Preauthorized");

                if (cb.RegistrationId != null)
                {
                    var job = _jobOrderService.Get(jobId);
                    if (job != null && _cardTokenService.GetByUserId(job.UserId) == null)
                    {
                        var masked = cb.CardFirstSix != null && cb.CardLastFour != null
                            ? cb.CardFirstSix + "******" + cb.CardLastFour
                            : "************" + (cb.CardLastFour ?? "????");

                        _cardTokenService.Save(job.UserId, cb.RegistrationId, cb.CardBrand, masked);
                    }
                }

                await NotifyCraftsmanPaymentAsync(jobId);
            }
            else
            {
                _paymentService.UpdateStatus(jobId, "Failed");
            }
        }

        private IActionResult HandlePreauthFinished(
            InitiatePaymentRequest request,
            decimal preauthAmount,
            AllSecureResult result,
            CardToken? existingToken)
        {
            if (existingToken == null && result.RegistrationId != null)
            {
                var masked = "************????";
                _cardTokenService.Save(request.UserId, result.RegistrationId, request.CardBrand, masked);
            }

            _paymentService.Add(new Payment
            {
                JobId = request.JobId,
                Amount = request.Amount,
                PreauthorizedAmount = preauthAmount,
                Currency = "RSD",
                PaymentMethod = request.CardBrand ?? existingToken?.CardBrand,
                PaymentStatus = "Preauthorized",
                TransactionId = result.ReferenceId!,
            });

            _ = NotifyCraftsmanPaymentAsync(request.JobId);

            return Ok(new { status = "preauthorized", transactionId = result.ReferenceId, preauthAmount });
        }

        private IActionResult HandlePreauthRedirect(
            InitiatePaymentRequest request,
            decimal preauthAmount,
            AllSecureResult result,
            CardToken? existingToken)
        {
            _paymentService.Add(new Payment
            {
                JobId = request.JobId,
                Amount = request.Amount,
                PreauthorizedAmount = preauthAmount,
                Currency = "RSD",
                PaymentMethod = request.CardBrand ?? existingToken?.CardBrand,
                PaymentStatus = "Pending",
                TransactionId = result.ReferenceId!,
                RedirectUrl = result.RedirectUrl,
            });

            return Ok(new { status = "redirect", redirectUrl = result.RedirectUrl, transactionId = result.ReferenceId });
        }

        private IActionResult HandlePreauthPending(
            InitiatePaymentRequest request,
            decimal preauthAmount,
            AllSecureResult result,
            CardToken? existingToken)
        {
            _paymentService.Add(new Payment
            {
                JobId = request.JobId,
                Amount = request.Amount,
                PreauthorizedAmount = preauthAmount,
                Currency = "RSD",
                PaymentMethod = request.CardBrand ?? existingToken?.CardBrand,
                PaymentStatus = "Pending",
                TransactionId = result.ReferenceId!,
            });

            return Ok(new { status = "pending", transactionId = result.ReferenceId });
        }
    }
}
