using Microsoft.AspNetCore.Mvc;
using WebProdavnica.BusinessLayer.Abstract;
using WebProdavnica.Entities;
using WebProdavnica.Entities.DTOs;

namespace WebProdavnica.API.Controllers
{
    [ApiController]
    [Route("api/job-requests")]
    public class JobRequestsController : ControllerBase
    {
        private readonly IJobRequestService _service;
        private readonly ICraftsmanService _craftsmanService;

        public JobRequestsController(IJobRequestService service, ICraftsmanService craftsmanService)
        {
            _service         = service;
            _craftsmanService = craftsmanService;
        }

        // ── GET ───────────────────────────────────────────────────────────────

        // GET /api/job-requests/{id}
        [HttpGet("{id}")]
        public IActionResult Get(int id)
        {
            var req = _service.Get(id);
            if (req == null) return NotFound(new { success = false });
            return Ok(new { success = true, data = Map(req) });
        }

        // GET /api/job-requests/user/{userId}
        [HttpGet("user/{userId}")]
        public IActionResult GetByUser(int userId)
        {
            var list = _service.GetByUser(userId).Select(Map);
            return Ok(new { success = true, data = list });
        }

        // GET /api/job-requests/craftsman/{craftsmanId}
        [HttpGet("craftsman/{craftsmanId}")]
        public IActionResult GetByCraftsman(int craftsmanId)
        {
            var list = _service.GetByCraftsman(craftsmanId).Select(Map);
            return Ok(new { success = true, data = list });
        }

        // ── CREATE ────────────────────────────────────────────────────────────

        // POST /api/job-requests
        // Kreira zahtev bez slika. Slike se upload-uju posebno na /upload-image.
        [HttpPost]
        public IActionResult Create([FromBody] CreateJobRequestDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(new { success = false, errors = ModelState });

            if (dto.ScheduledDate < DateTime.UtcNow)
                return BadRequest(new { success = false, message = "Datum ne može biti u prošlosti." });

            var req = new JobRequest
            {
                Title         = dto.Title,
                Description   = dto.Description,
                ScheduledDate = dto.ScheduledDate,
                UserId        = dto.UserId,
                CraftsmanId   = dto.CraftsmanId,
            };

            var id = _service.Create(req);
            return CreatedAtAction(nameof(Get), new { id }, new { success = true, requestId = id });
        }

        // POST /api/job-requests/{id}/upload-image
        // Multipart upload — max 5 slika, max 5 MB po slici
        [HttpPost("{id}/upload-image")]
        public async Task<IActionResult> UploadImage(int id, IFormFile file)
        {
            var req = _service.Get(id);
            if (req == null) return NotFound(new { success = false });

            if (req.ImagePaths.Count >= 5)
                return BadRequest(new { success = false, message = "Maksimalan broj slika je 5." });

            if (file == null || file.Length == 0)
                return BadRequest(new { success = false, message = "Fajl je prazan." });

            if (file.Length > 5 * 1024 * 1024)
                return BadRequest(new { success = false, message = "Maksimalna veličina slike je 5 MB." });

            var allowed = new[] { ".jpg", ".jpeg", ".png", ".webp" };
            var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
            if (!allowed.Contains(ext))
                return BadRequest(new { success = false, message = "Dozvoljeni formati: jpg, png, webp." });

            // Cuvamo u wwwroot/uploads/requests/{id}/
            var folder = Path.Combine(
                Directory.GetCurrentDirectory(), "wwwroot", "uploads", "requests", id.ToString());
            Directory.CreateDirectory(folder);

            var fileName = $"{Guid.NewGuid()}{ext}";
            var fullPath = Path.Combine(folder, fileName);
            await using var stream = new FileStream(fullPath, FileMode.Create);
            await file.CopyToAsync(stream);

            var relativePath = $"uploads/requests/{id}/{fileName}";
            _service.AddImage(id, relativePath);

            return Ok(new { success = true, path = relativePath });
        }

        // ── MAJSTOR AKCIJE ────────────────────────────────────────────────────

        // POST /api/job-requests/{id}/accept
        [HttpPost("{id}/accept")]
        public IActionResult Accept(int id, [FromBody] AcceptJobRequestDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(new { success = false, errors = ModelState });

            // Validacija: minimum 15 minuta
            int totalMinutes = dto.EstimatedHours * 60 + dto.EstimatedMinutes;
            if (totalMinutes < 15)
                return BadRequest(new { success = false, message = "Procena mora biti minimum 15 minuta." });

            var req = _service.Get(id);
            if (req == null) return NotFound(new { success = false });
            if (req.Status != "pending")
                return BadRequest(new { success = false, message = $"Zahtev je u statusu '{req.Status}' i ne može biti prihvaćen." });

            var craftsman = _craftsmanService.Get(req.CraftsmanId);
            if (craftsman == null) return NotFound(new { success = false, message = "Majstor nije pronađen." });

            var ok = _service.Accept(id, totalMinutes, craftsman.HourlyRate);
            if (!ok) return StatusCode(500, new { success = false, message = "Greška pri prihvatanju." });

            var updated = _service.Get(id);
            return Ok(new
            {
                success          = true,
                estimatedMinutes = updated?.EstimatedMinutes,
                estimatedPrice   = updated?.EstimatedPrice,
            });
        }

        // POST /api/job-requests/{id}/decline
        [HttpPost("{id}/decline")]
        public IActionResult Decline(int id, [FromQuery] string by)
        {
            if (by != "craftsman" && by != "user")
                return BadRequest(new { success = false, message = "Parametar 'by' mora biti 'craftsman' ili 'user'." });

            var req = _service.Get(id);
            if (req == null) return NotFound(new { success = false });

            if (req.Status != "pending" && req.Status != "accepted")
                return BadRequest(new { success = false, message = $"Zahtev je u statusu '{req.Status}' i ne može biti odbijen." });

            var ok = _service.Decline(id, by);
            return ok ? Ok(new { success = true }) : StatusCode(500, new { success = false });
        }

        // ── KORISNIK AKCIJE ───────────────────────────────────────────────────

        // POST /api/job-requests/{id}/confirm
        // Korisnik prihvata ponudu majstora → sledeci korak je Checkout
        [HttpPost("{id}/confirm")]
        public IActionResult Confirm(int id)
        {
            var req = _service.Get(id);
            if (req == null) return NotFound(new { success = false });

            if (req.Status != "accepted")
                return BadRequest(new { success = false, message = "Zahtev mora biti u statusu 'accepted' da bi mogao biti potvrđen." });

            var ok = _service.Confirm(id);
            if (!ok) return StatusCode(500, new { success = false });

            return Ok(new
            {
                success          = true,
                requestId        = id,
                estimatedMinutes = req.EstimatedMinutes,
                estimatedPrice   = req.EstimatedPrice,
                craftsmanId      = req.CraftsmanId,
                userId           = req.UserId,
                title            = req.Title,
            });
        }

        // POST /api/job-requests/{id}/create-job-order
        // Poziva se SAMO nakon uspesne preautorizacije placanja
        [HttpPost("{id}/create-job-order")]
        public IActionResult CreateJobOrder(int id)
        {
            var req = _service.Get(id);
            if (req == null) return NotFound(new { success = false });

            if (req.Status != "confirmed")
                return BadRequest(new { success = false, message = "Zahtev mora biti potvrđen pre kreiranja posla." });

            if (req.JobOrderId != null)
                return Ok(new { success = true, jobOrderId = req.JobOrderId, alreadyCreated = true });

            try
            {
                var jobOrderId = _service.CreateJobOrderFromRequest(id);
                return Ok(new { success = true, jobOrderId });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        // ── Helpers ───────────────────────────────────────────────────────────

        private static object Map(JobRequest r) => new
        {
            requestId        = r.RequestId,
            title            = r.Title,
            description      = r.Description,
            scheduledDate    = r.ScheduledDate,
            status           = r.Status,
            userId           = r.UserId,
            craftsmanId      = r.CraftsmanId,
            estimatedMinutes = r.EstimatedMinutes,
            estimatedPrice   = r.EstimatedPrice,
            jobOrderId       = r.JobOrderId,
            createdAt        = r.CreatedAt,
            imagePaths       = r.ImagePaths,
        };
    }
}
