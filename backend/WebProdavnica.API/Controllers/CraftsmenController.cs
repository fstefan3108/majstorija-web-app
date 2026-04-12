using Microsoft.AspNetCore.Mvc;
using WebProdavnica.BusinessLayer.Abstract;
using WebProdavnica.Entities;
using WebProdavnica.Entities.DTOs;

namespace WebProdavnica.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class CraftsmenController : ControllerBase
    {
        private readonly ICraftsmanService _craftsmanService;
        private readonly IReviewService _reviewService;

        public CraftsmenController(ICraftsmanService craftsmanService, IReviewService reviewService)
        {
            _craftsmanService = craftsmanService;
            _reviewService = reviewService;
        }

        [HttpGet]
        public IActionResult GetAll()
        {
            try
            {
                var craftsmen = _craftsmanService.GetAll();
                return Ok(new { success = true, data = craftsmen, count = craftsmen.Count });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, error = ex.Message });
            }
        }

        [HttpGet("{id}")]
        public IActionResult GetById(int id)
        {
            try
            {
                var craftsman = _craftsmanService.Get(id);
                if (craftsman == null)
                    return NotFound(new { success = false, message = $"Zanatlija sa ID {id} nije pronađen" });

                return Ok(new { success = true, data = craftsman });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, error = ex.Message });
            }
        }

        [HttpGet("profession/{profession}")]
        public IActionResult GetByProfession(string profession)
        {
            try
            {
                var craftsmen = _craftsmanService.GetByProfession(profession);
                return Ok(new { success = true, profession, data = craftsmen, count = craftsmen.Count });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, error = ex.Message });
            }
        }

        [HttpGet("location/{location}")]
        public IActionResult GetByLocation(string location)
        {
            try
            {
                var craftsmen = _craftsmanService.GetByLocation(location);
                return Ok(new { success = true, location, data = craftsmen, count = craftsmen.Count });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, error = ex.Message });
            }
        }

        // PUT /api/craftsmen/{id}/profile — azuriranje licnih i profesionalnih podataka
        [HttpPut("{id}/profile")]
        public IActionResult UpdateProfile(int id, [FromBody] UpdateCraftsmanProfileRequest request)
        {
            try
            {
                var craftsman = _craftsmanService.Get(id);
                if (craftsman == null)
                    return NotFound(new { success = false, message = "Majstor nije pronađen" });

                if (request.Professions.Count < 1 || request.Professions.Count > 3)
                    return BadRequest(new { success = false, message = "Morate izabrati između 1 i 3 profesije." });

                craftsman.FirstName = request.FirstName;
                craftsman.LastName = request.LastName;
                craftsman.Email = request.Email;
                craftsman.Phone = request.Phone;
                craftsman.Location = request.Location;
                craftsman.Professions = request.Professions;
                craftsman.Profession = request.Professions.FirstOrDefault();
                craftsman.Experience = request.Experience;
                craftsman.HourlyRate = request.HourlyRate;
                craftsman.WorkingHours = request.WorkingHours;
                craftsman.WorkExperienceDescription = request.WorkExperienceDescription;

                bool success = _craftsmanService.Update(craftsman);
                if (success)
                    return Ok(new { success = true, message = "Profil uspešno ažuriran" });

                return BadRequest(new { success = false, message = "Ažuriranje nije uspelo" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, error = ex.Message });
            }
        }

        // PUT /api/craftsmen/{id}/password — promena lozinke
        [HttpPut("{id}/password")]
        public IActionResult UpdatePassword(int id, [FromBody] UpdatePasswordRequest request)
        {
            try
            {
                var craftsman = _craftsmanService.Get(id);
                if (craftsman == null)
                    return NotFound(new { success = false, message = "Majstor nije pronađen" });

                if (!BCrypt.Net.BCrypt.Verify(request.OldPassword, craftsman.PasswordHash))
                    return BadRequest(new { success = false, message = "Stara lozinka nije ispravna" });

                string newHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
                bool success = _craftsmanService.UpdatePassword(id, newHash);

                if (success)
                    return Ok(new { success = true, message = "Lozinka uspešno promenjena" });

                return BadRequest(new { success = false, message = "Promena lozinke nije uspela" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        // POST /api/craftsmen/{id}/profile-image — upload profilne slike
        [HttpPost("{id}/profile-image")]
        public async Task<IActionResult> UploadProfileImage(int id, IFormFile image)
        {
            try
            {
                if (image == null || image.Length == 0)
                    return BadRequest(new { success = false, message = "Slika nije priložena" });

                if (image.Length > 5 * 1024 * 1024)
                    return BadRequest(new { success = false, message = "Slika ne sme biti veća od 5MB" });

                var allowed = new[] { ".jpg", ".jpeg", ".png", ".webp" };
                var ext = Path.GetExtension(image.FileName).ToLowerInvariant();
                if (!allowed.Contains(ext))
                    return BadRequest(new { success = false, message = "Dozvoljeni formati: JPG, PNG, WEBP" });

                var craftsman = _craftsmanService.Get(id);
                if (craftsman == null)
                    return NotFound(new { success = false, message = "Majstor nije pronađen" });

                var uploadsFolder = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads", "profiles");
                Directory.CreateDirectory(uploadsFolder);

                var fileName = $"craftsman_{id}{ext}";
                var filePath = Path.Combine(uploadsFolder, fileName);

                using (var stream = new FileStream(filePath, FileMode.Create))
                    await image.CopyToAsync(stream);

                craftsman.ProfileImagePath = $"/uploads/profiles/{fileName}";
                _craftsmanService.Update(craftsman);

                return Ok(new { success = true, imagePath = craftsman.ProfileImagePath });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, error = ex.Message });
            }
        }

        [HttpPut("{id}")]
        public IActionResult Update(int id, [FromBody] Craftsman craftsman)
        {
            try
            {
                if (id != craftsman.CraftsmanId)
                    return BadRequest(new { success = false, message = "ID se ne poklapa" });

                bool success = _craftsmanService.Update(craftsman);
                if (success)
                    return Ok(new { success = true, message = "Zanatlija uspešno ažuriran" });

                return BadRequest(new { success = false, message = "Ažuriranje nije uspelo" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, error = ex.Message });
            }
        }

        [HttpDelete("{id}")]
        public IActionResult Delete(int id)
        {
            try
            {
                bool success = _craftsmanService.Delete(id);
                if (success)
                    return Ok(new { success = true, message = "Zanatlija uspešno obrisan" });

                return NotFound(new { success = false, message = "Zanatlija nije pronađen" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, error = ex.Message });
            }
        }

        [HttpGet("{id}/reviews")]
        public IActionResult GetReviews(int id)
        {
            try
            {
                var reviews = _reviewService.GetReviewsByCraftsmanId(id);
                return Ok(new
                {
                    success = true,
                    craftsmanId = id,
                    data = reviews,
                    count = reviews.Count,
                    averageRating = reviews.Any() ? reviews.Average(r => r.Rating) : 0
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, error = ex.Message });
            }
        }
    }
}
