using Microsoft.AspNetCore.Mvc;
using WebProdavnica.BusinessLayer.Abstract;
using WebProdavnica.Entities.DTOs;

namespace WebProdavnica.Controllers
{
    [Route("api/auth")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly IAuthService _authService;

        public AuthController(IAuthService authService)
        {
            _authService = authService;
        }

        [HttpPost("register/user")]
        public IActionResult RegisterUser([FromBody] RegisterUserRequest request)
        {
            try
            {
                var result = _authService.RegisterUser(request);
                if (result == null)
                    return BadRequest(new { success = false, message = "Email već postoji ili registracija nije uspela" });

                return Ok(new { success = true, message = "Registracija uspešna!", data = result });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message, inner = ex.InnerException?.Message });
            }
        }

        [HttpPost("register/craftsman")]
        public IActionResult RegisterCraftsman([FromBody] RegisterCraftsmanRequest request)
        {
            try
            {
                if (request.Subcategories.Count == 0)
                    return BadRequest(new { success = false, message = "Izaberite barem jednu oblast rada." });

                var result = _authService.RegisterCraftsman(request);
                if (result == null)
                    return BadRequest(new { success = false, message = "Email već postoji ili registracija nije uspela" });

                return Ok(new { success = true, message = "Registracija uspešna!", data = result });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message, inner = ex.InnerException?.Message });
            }
        }

        [HttpPost("login")]
        public IActionResult Login([FromBody] LoginRequest request)
        {
            try
            {
                var result = _authService.Login(request);
                if (result == null)
                    return Unauthorized(new { success = false, message = "Pogrešan email ili lozinka" });

                if (result.RequiresEmailVerification)
                    return Unauthorized(new { success = false, message = "Email adresa nije verifikovana. Proverite vaš inbox.", code = "EMAIL_NOT_VERIFIED", email = result.Email, userType = request.UserType });

                return Ok(new { success = true, message = "Prijava uspešna!", data = result });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message, inner = ex.InnerException?.Message });
            }
        }

        [HttpGet("verify-email")]
        public async Task<IActionResult> VerifyEmail([FromQuery] VerifyEmailRequest request)
        {
            try
            {
                var result = await _authService.VerifyEmailAsync(request);
                if (result == null)
                    return BadRequest(new { success = false, message = "Link za verifikaciju je nevažeći ili je istekao." });

                return Ok(new { success = true, message = "Email je uspešno potvrđen!", data = result });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpPost("resend-verification")]
        public async Task<IActionResult> ResendVerification([FromBody] ResendVerificationRequest request)
        {
            try
            {
                var success = await _authService.ResendVerificationAsync(request);
                // Uvek vracamo isti odgovor (ne otkrivamo da li email postoji)
                return Ok(new { success = true, message = "Ako nalog postoji i nije verifikovan, novi link je poslat." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpPost("google")]
        public async Task<IActionResult> LoginWithGoogle([FromBody] GoogleAuthRequest request)
        {
            try
            {
                var result = await _authService.LoginWithGoogleAsync(request);
                if (result == null)
                {
                    var msg = request.UserType == "craftsman"
                        ? "Nalog nije pronađen. Molimo registrujte se sa email/lozinkom, pa povežite Google nalog."
                        : "Google prijava nije uspela. Pokušajte ponovo.";
                    return Unauthorized(new { success = false, message = msg });
                }

                return Ok(new { success = true, message = "Prijava uspešna!", data = result });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpPost("forgot-password")]
        public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest request)
        {
            try
            {
                await _authService.ForgotPasswordAsync(request);
                // Uvek vracamo isti odgovor (ne otkrivamo da li email postoji)
                return Ok(new { success = true, message = "Ako email postoji u sistemu, link za resetovanje je poslat." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpPost("reset-password")]
        public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest request)
        {
            try
            {
                var success = await _authService.ResetPasswordAsync(request);
                if (!success)
                    return BadRequest(new { success = false, message = "Token je nevažeći ili je istekao." });

                return Ok(new { success = true, message = "Lozinka je uspešno promenjena." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }
    }
}
