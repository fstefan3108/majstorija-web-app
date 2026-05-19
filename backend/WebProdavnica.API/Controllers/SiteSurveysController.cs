using Microsoft.AspNetCore.Mvc;
using WebProdavnica.API.Services;
using WebProdavnica.BusinessLayer.Abstract;
using WebProdavnica.Entities;
using WebProdavnica.Entities.DTOs;

namespace WebProdavnica.API.Controllers
{
    [ApiController]
    [Route("api/site-surveys")]
    public class SiteSurveysController : ControllerBase
    {
        private readonly ISiteSurveyService _surveyService;
        private readonly IPaymentService _paymentService;
        private readonly IUserService _userService;
        private readonly ICraftsmanService _craftsmanService;
        private readonly IJobRequestService _jobRequestService;
        private readonly INotificationService _notificationService;
        private readonly AllSecureClient _allSecure;

        public SiteSurveysController(
            ISiteSurveyService surveyService,
            IPaymentService paymentService,
            IUserService userService,
            ICraftsmanService craftsmanService,
            IJobRequestService jobRequestService,
            INotificationService notificationService,
            AllSecureClient allSecure)
        {
            _surveyService       = surveyService;
            _paymentService      = paymentService;
            _userService         = userService;
            _craftsmanService    = craftsmanService;
            _jobRequestService   = jobRequestService;
            _notificationService = notificationService;
            _allSecure           = allSecure;
        }

        // GET /api/site-surveys/{id}
        [HttpGet("{id}")]
        public IActionResult Get(int id)
        {
            var survey = _surveyService.Get(id);
            if (survey == null) return NotFound(new { success = false });
            return Ok(new { success = true, data = MapSurvey(survey) });
        }

        // GET /api/site-surveys/by-user/{userId}
        [HttpGet("by-user/{userId}")]
        public IActionResult GetByUser(int userId)
        {
            var list = _surveyService.GetByUser(userId).Select(MapSurvey);
            return Ok(new { success = true, data = list });
        }

        // GET /api/site-surveys/by-craftsman/{craftsmanId}
        [HttpGet("by-craftsman/{craftsmanId}")]
        public IActionResult GetByCraftsman(int craftsmanId)
        {
            var list = _surveyService.GetByCraftsman(craftsmanId).Select(MapSurvey);
            return Ok(new { success = true, data = list });
        }

        // GET /api/site-surveys/by-job-request/{jobRequestId}
        [HttpGet("by-job-request/{jobRequestId}")]
        public IActionResult GetByJobRequest(int jobRequestId)
        {
            var survey = _surveyService.GetByJobRequest(jobRequestId);
            if (survey == null) return NotFound(new { success = false });
            return Ok(new { success = true, data = MapSurvey(survey) });
        }

        // ── PROPOSE (iz JobRequestsController-a) ──────────────────────────────

        // POST /api/site-surveys/propose/{jobRequestId}
        // Majstor predlaže izviđanje
        [HttpPost("propose/{jobRequestId}")]
        public async Task<IActionResult> Propose(int jobRequestId, [FromBody] ProposeSurveyDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(new { success = false, errors = ModelState });

            if (dto.ScheduledDate < DateTime.UtcNow.Date)
                return BadRequest(new { success = false, message = "Datum izviđanja ne može biti u prošlosti." });

            try
            {
                var survey = await _surveyService.ProposeSurveyAsync(
                    jobRequestId, dto.ScheduledDate, dto.ScheduledTime, dto.SurveyPrice);

                return Ok(new
                {
                    success  = true,
                    surveyId = survey.SurveyId,
                    message  = "Predlog za izviđanje je poslat korisniku.",
                });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
        }

        // ── USER ACTIONS ──────────────────────────────────────────────────────

        // POST /api/site-surveys/{surveyId}/decline-proposal
        // Korisnik odbija predlog za izviđanje (pre plaćanja)
        [HttpPost("{surveyId}/decline-proposal")]
        public async Task<IActionResult> DeclineProposal(int surveyId)
        {
            var survey = _surveyService.Get(surveyId);
            if (survey == null) return NotFound(new { success = false });

            try
            {
                await _surveyService.DeclineSurveyProposalAsync(survey.JobRequestId);
                return Ok(new { success = true });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
        }

        // POST /api/site-surveys/{surveyId}/activate
        // Frontend poziva ovo nakon uspešne preautorizacije plaćanja
        // (idempotentno — sigurno za poziv više puta)
        [HttpPost("{surveyId}/activate")]
        public async Task<IActionResult> Activate(int surveyId)
        {
            var survey = _surveyService.Get(surveyId);
            if (survey == null) return NotFound(new { success = false });

            // Proveravamo da je plaćanje zaista preautorizovano
            var payments = _paymentService.GetBySurvey(surveyId);
            var payment  = payments.LastOrDefault();

            if (payment == null)
                return BadRequest(new { success = false, message = "Plaćanje nije pronađeno." });

            var alreadyActive = survey.Status == "zakazano";
            if (!alreadyActive && payment.PaymentStatus != "Preauthorized" && payment.PaymentStatus != "Pending")
                return BadRequest(new { success = false, message = "Plaćanje nije preautorizovano." });

            if (!alreadyActive)
                await _surveyService.ActivateSurveyAsync(surveyId);

            return Ok(new { success = true, surveyId, alreadyActive });
        }

        // POST /api/site-surveys/{surveyId}/cancel
        // Korisnik ili majstor otkazuje zakazano izviđanje (uz refund unutar 24h)
        [HttpPost("{surveyId}/cancel")]
        public async Task<IActionResult> Cancel(int surveyId, [FromQuery] string by)
        {
            if (by != "user" && by != "craftsman")
                return BadRequest(new { success = false, message = "Parametar 'by' mora biti 'user' ili 'craftsman'." });

            var survey = _surveyService.Get(surveyId);
            if (survey == null) return NotFound(new { success = false });

            if (survey.Status != "zakazano")
                return BadRequest(new { success = false, message = "Samo zakazana izviđanja mogu biti otkazana." });

            // 24h provera (od CreatedAt izviđanja)
            var elapsed = DateTime.UtcNow - survey.CreatedAt;
            if (elapsed.TotalHours > 24)
                return BadRequest(new { success = false, message = "Otkazivanje je moguće samo u roku od 24h od zakazivanja." });

            // Refund
            var payments = _paymentService.GetBySurvey(surveyId);
            var payment  = payments.LastOrDefault();

            if (payment == null)
                return NotFound(new { success = false, message = "Plaćanje nije pronađeno." });

            AllSecureResult result;
            if (payment.PaymentStatus == "Captured" && payment.CaptureTransactionId != null)
            {
                result = await _allSecure.RefundAsync(
                    Guid.NewGuid().ToString("N"),
                    payment.CaptureTransactionId,
                    payment.Amount,
                    payment.Currency ?? "RSD");
            }
            else if ((payment.PaymentStatus == "Preauthorized" || payment.PaymentStatus == "Pending")
                     && payment.TransactionId != null)
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
                return BadRequest(new { success = false, message = result.ErrorMessage ?? "Povraćaj novca nije uspeo." });

            var newPaymentStatus = payment.PaymentStatus == "Captured" ? "Refunded" : "Voided";
            _paymentService.UpdateStatusBySurvey(surveyId, newPaymentStatus);

            await _surveyService.CancelSurveyAsync(surveyId, by);

            return Ok(new { success = true, message = "Izviđanje otkazano, novac će biti vraćen.", refundedAmount = payment.Amount });
        }

        // ── RESCHEDULE ────────────────────────────────────────────────────────

        // POST /api/site-surveys/{surveyId}/propose-reschedule
        [HttpPost("{surveyId}/propose-reschedule")]
        public async Task<IActionResult> ProposeReschedule(int surveyId, [FromBody] ProposeRescheduleSurveyDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(new { success = false, errors = ModelState });

            if (dto.ProposedBy != "user" && dto.ProposedBy != "craftsman")
                return BadRequest(new { success = false, message = "ProposedBy mora biti 'user' ili 'craftsman'." });

            try
            {
                var time = dto.NewTime ?? TimeSpan.Zero;
                await _surveyService.ProposeRescheduleAsync(surveyId, dto.NewDate, time, dto.ProposedBy);
                return Ok(new { success = true });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
        }

        // POST /api/site-surveys/{surveyId}/accept-reschedule
        [HttpPost("{surveyId}/accept-reschedule")]
        public async Task<IActionResult> AcceptReschedule(int surveyId)
        {
            try
            {
                await _surveyService.AcceptRescheduleAsync(surveyId);
                return Ok(new { success = true });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
        }

        // POST /api/site-surveys/{surveyId}/decline-reschedule
        // Odbijanje pomeranja → otkazivanje izviđanja + refund
        [HttpPost("{surveyId}/decline-reschedule")]
        public async Task<IActionResult> DeclineReschedule(int surveyId)
        {
            var survey = _surveyService.Get(surveyId);
            if (survey == null) return NotFound(new { success = false });

            // Refund
            var payments = _paymentService.GetBySurvey(surveyId);
            var payment  = payments.LastOrDefault();
            if (payment != null && payment.TransactionId != null &&
                (payment.PaymentStatus == "Preauthorized" || payment.PaymentStatus == "Pending"))
            {
                var result = await _allSecure.VoidAsync(
                    Guid.NewGuid().ToString("N"), payment.TransactionId);

                if (result.ReturnType == "FINISHED" && result.IsSuccess)
                    _paymentService.UpdateStatusBySurvey(surveyId, "Voided");
            }

            try
            {
                await _surveyService.DeclineRescheduleAsync(surveyId);
                return Ok(new { success = true });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
        }

        // ── CRAFTSMAN ACTIONS ─────────────────────────────────────────────────

        // POST /api/site-surveys/{surveyId}/complete
        // Majstor završava izviđanje i unosi procenu
        [HttpPost("{surveyId}/complete")]
        public async Task<IActionResult> Complete(int surveyId, [FromBody] CompleteSurveyDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(new { success = false, errors = ModelState });

            var survey = _surveyService.Get(surveyId);
            if (survey == null) return NotFound(new { success = false });

            // Capture plaćanja za izviđanje
            var payments = _paymentService.GetBySurvey(surveyId);
            var payment  = payments.LastOrDefault();

            if (payment != null && (payment.PaymentStatus == "Preauthorized" || payment.PaymentStatus == "Pending")
                && payment.TransactionId != null)
            {
                var captureResult = await _allSecure.CaptureAsync(
                    Guid.NewGuid().ToString("N"),
                    payment.TransactionId,
                    survey.SurveyPrice,
                    "RSD",
                    0); // jobId = 0 za survey capture (koristimo surveyId)

                if (captureResult.ReturnType == "FINISHED" && captureResult.IsSuccess)
                    _paymentService.UpdateCaptureBySurvey(surveyId, captureResult.ReferenceId!);
            }

            try
            {
                await _surveyService.CompleteSurveyAsync(surveyId, dto.EstimatedMinutes);
                return Ok(new { success = true, message = "Izviđanje završeno. Korisnik je obavešten da potvrdi ponudu." });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
        }

        // ── HELPERS ───────────────────────────────────────────────────────────

        private static object MapSurvey(SiteSurvey s) => new
        {
            surveyId               = s.SurveyId,
            jobRequestId           = s.JobRequestId,
            userId                 = s.UserId,
            craftsmanId            = s.CraftsmanId,
            scheduledDate          = s.ScheduledDate,
            scheduledTime          = s.ScheduledTime,
            surveyPrice            = s.SurveyPrice,
            status                 = s.Status,
            rescheduleProposedDate = s.RescheduleProposedDate,
            rescheduleProposedTime = s.RescheduleProposedTime,
            rescheduleProposedBy   = s.RescheduleProposedBy,
            createdAt              = s.CreatedAt,
            jobRequest             = s.JobRequest == null ? null : new
            {
                requestId   = s.JobRequest.RequestId,
                title       = s.JobRequest.Title,
                description = s.JobRequest.Description,
            },
        };
    }
}
