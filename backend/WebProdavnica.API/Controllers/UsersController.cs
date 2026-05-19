using Microsoft.AspNetCore.Mvc;
using WebProdavnica.BusinessLayer.Abstract;
using WebProdavnica.Entities;
using WebProdavnica.Entities.DTOs;

namespace WebProdavnica.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class UsersController : ControllerBase
    {
        private readonly IUserService _userService;

        public UsersController(IUserService userService)
        {
            _userService = userService;
        }

        // GET: api/users
        [HttpGet]
        public IActionResult GetAll()
        {
            try
            {
                var users = _userService.GetAll();
                return Ok(new { success = true, data = users, count = users.Count });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, error = ex.Message });
            }
        }

        // GET: api/users/5
        [HttpGet("{id}")]
        public IActionResult GetById(int id)
        {
            try
            {
                var user = _userService.Get(id);
                if (user == null)
                    return NotFound(new { success = false, message = $"Korisnik sa ID {id} nije pronađen" });

                return Ok(new
                {
                    success = true,
                    data = new
                    {
                        userId = user.UserId,
                        firstName = user.FirstName,
                        lastName = user.LastName,
                        email = user.Email,
                        phone = user.Phone,
                        location = user.Location,
                        profileImagePath = user.ProfileImagePath,
                        latitude = user.Latitude,
                        longitude = user.Longitude,
                        city = user.City,
                        createdAt = user.CreatedAt
                    }
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, error = ex.Message });
            }
        }

        // PUT: api/users/5/profile
        [HttpPut("{id}/profile")]
        public IActionResult UpdateProfile(int id, [FromBody] UpdateProfileRequest request)
        {
            try
            {
                var user = _userService.Get(id);
                if (user == null)
                    return NotFound(new { success = false, message = "Korisnik nije pronađen" });

                user.FirstName = request.FirstName;
                user.LastName = request.LastName;
                user.Email = request.Email;
                user.Phone = request.Phone;
                user.Location = request.Location;
                user.Latitude = request.Latitude;
                user.Longitude = request.Longitude;
                user.City = request.City;

                bool success = _userService.Update(user);
                if (success)
                    return Ok(new { success = true, message = "Profil uspešno ažuriran" });

                return BadRequest(new { success = false, message = "Ažuriranje nije uspelo" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, error = ex.Message });
            }
        }

        // POST: api/users/5/profile-image
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

                var user = _userService.Get(id);
                if (user == null)
                    return NotFound(new { success = false, message = "Korisnik nije pronađen" });

                var uploadsFolder = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads", "profiles");
                Directory.CreateDirectory(uploadsFolder);

                var fileName = $"user_{id}{ext}";
                var filePath = Path.Combine(uploadsFolder, fileName);

                using (var stream = new FileStream(filePath, FileMode.Create))
                    await image.CopyToAsync(stream);

                user.ProfileImagePath = $"/uploads/profiles/{fileName}";
                _userService.Update(user);

                return Ok(new { success = true, imagePath = user.ProfileImagePath });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, error = ex.Message });
            }
        }

        // PUT: api/users/5/password
        [HttpPut("{id}/password")]
        public IActionResult UpdatePassword(int id, [FromBody] UpdatePasswordRequest request)
        {
            try
            {
                var user = _userService.Get(id);
                if (user == null)
                    return NotFound(new { success = false, message = "Korisnik nije pronađen" });

                if (!BCrypt.Net.BCrypt.Verify(request.OldPassword, user.PasswordHash))
                    return BadRequest(new { success = false, message = "Stara lozinka nije ispravna" });

                string newHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
                bool success = _userService.UpdatePassword(id, newHash);

                if (success)
                    return Ok(new { success = true, message = "Lozinka uspešno promenjena" });

                return BadRequest(new { success = false, message = "Promena lozinke nije uspela" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message, inner = ex.InnerException?.Message });
            }
        }

        // DELETE: api/users/5
        [HttpDelete("{id}")]
        public IActionResult Delete(int id)
        {
            try
            {
                bool success = _userService.Delete(id);
                if (success)
                    return Ok(new { success = true, message = "Korisnik uspešno obrisan" });

                return NotFound(new { success = false, message = "Korisnik nije pronađen" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, error = ex.Message });
            }
        }
    }
}
