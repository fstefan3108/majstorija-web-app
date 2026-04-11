using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using Entities.Configuration;
using MailKit.Net.Smtp;
using MailKit.Security;
using MimeKit;
using WebProdavnica.BusinessLayer.Abstract;
using WebProdavnica.DAL.Abstract;
using WebProdavnica.Entities;
using WebProdavnica.Entities.Configuration;
using WebProdavnica.Entities.DTOs;

namespace WebProdavnica.BusinessLayer.Impl
{
    public class AuthService : IAuthService
    {
        private const string GoogleClientId = "432202911287-rm1iq2ifogskv0t7d2n22rv9rpmu78e2.apps.googleusercontent.com";
        private const string FrontendBaseUrl = "http://localhost:5173";
        private static readonly HttpClient _httpClient = new();

        private readonly IUserRepository _userRepository;
        private readonly ICraftsmanRepository _craftsmanRepository;
        private readonly IJwtService _jwtService;
        private readonly JwtSettings _jwtSettings;
        private readonly SmtpSettings _smtpSettings;

        public AuthService(
            IUserRepository userRepository,
            ICraftsmanRepository craftsmanRepository,
            IJwtService jwtService,
            JwtSettings jwtSettings,
            SmtpSettings smtpSettings)
        {
            _userRepository = userRepository;
            _craftsmanRepository = craftsmanRepository;
            _jwtService = jwtService;
            _jwtSettings = jwtSettings;
            _smtpSettings = smtpSettings;
        }

        // ─── Normalizacija telefona ───────────────────────────────────────────────
        private static string NormalizePhone(string phone)
        {
            var normalized = Regex.Replace(phone, @"[\s\-]", "");
            if (normalized.StartsWith("0"))
                normalized = "+381" + normalized[1..];
            return normalized;
        }

        // ─── Login ───────────────────────────────────────────────────────────────
        public AuthResponse? Login(LoginRequest request)
        {
            if (request.UserType == "craftsman")
            {
                var craftsman = _craftsmanRepository.GetByEmail(request.Email);
                if (craftsman == null || string.IsNullOrEmpty(craftsman.PasswordHash))
                    return null;

                if (!BCrypt.Net.BCrypt.Verify(request.Password, craftsman.PasswordHash))
                    return null;

                if (!craftsman.IsVerified)
                    return new AuthResponse { RequiresEmailVerification = true, Email = craftsman.Email!, UserId = craftsman.CraftsmanId, Role = "Craftsman" };

                craftsman.RefreshToken = _jwtService.GenerateRefreshToken();
                craftsman.RefreshTokenExpiry = DateTime.UtcNow.AddDays(_jwtSettings.RefreshTokenExpirationDays);
                _craftsmanRepository.Update(craftsman);

                var accessToken = _jwtService.GenerateAccessToken(
                    craftsman.CraftsmanId, craftsman.Email,
                    $"{craftsman.FirstName} {craftsman.LastName}", "Craftsman");

                return new AuthResponse
                {
                    AccessToken = accessToken,
                    RefreshToken = craftsman.RefreshToken,
                    ExpiresIn = _jwtSettings.AccessTokenExpirationMinutes * 60,
                    Email = craftsman.Email,
                    FullName = $"{craftsman.FirstName} {craftsman.LastName}",
                    UserId = craftsman.CraftsmanId,
                    Role = "Craftsman"
                };
            }
            else
            {
                var user = _userRepository.GetByEmail(request.Email);
                if (user == null || string.IsNullOrEmpty(user.PasswordHash))
                    return null;

                if (!BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
                    return null;

                if (!user.IsVerified)
                    return new AuthResponse { RequiresEmailVerification = true, Email = user.Email, UserId = user.UserId, Role = "User" };

                user.RefreshToken = _jwtService.GenerateRefreshToken();
                user.RefreshTokenExpiry = DateTime.UtcNow.AddDays(_jwtSettings.RefreshTokenExpirationDays);
                _userRepository.Update(user);

                var accessToken = _jwtService.GenerateAccessToken(
                    user.UserId, user.Email,
                    $"{user.FirstName} {user.LastName}", "User");

                return new AuthResponse
                {
                    AccessToken = accessToken,
                    RefreshToken = user.RefreshToken,
                    ExpiresIn = _jwtSettings.AccessTokenExpirationMinutes * 60,
                    Email = user.Email,
                    FullName = $"{user.FirstName} {user.LastName}",
                    UserId = user.UserId,
                    Role = "User"
                };
            }
        }

        // ─── Register User ────────────────────────────────────────────────────────
        public AuthResponse? RegisterUser(RegisterUserRequest request)
        {
            if (_userRepository.GetByEmail(request.Email) != null)
                return null;

            var verificationToken = Guid.NewGuid().ToString("N");
            var verificationExpiry = DateTime.UtcNow.AddHours(24);

            var user = new User
            {
                FirstName = request.FirstName.Trim(),
                LastName = request.LastName.Trim(),
                Email = request.Email,
                Phone = NormalizePhone(request.Phone),
                Location = request.Location,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
                GoogleId = request.GoogleId,
                CreatedAt = DateTime.Now,
                IsVerified = false,
                VerificationToken = verificationToken,
                VerificationTokenExpiry = verificationExpiry
            };

            _userRepository.Add(user);
            var created = _userRepository.GetByEmail(request.Email);
            if (created == null) return null;

            _ = SendVerificationEmailAsync(request.Email, verificationToken, "user", created.FirstName);

            return new AuthResponse
            {
                RequiresEmailVerification = true,
                Email = created.Email,
                FullName = $"{created.FirstName} {created.LastName}",
                UserId = created.UserId,
                Role = "User"
            };
        }

        // ─── Register Craftsman ───────────────────────────────────────────────────
        public AuthResponse? RegisterCraftsman(RegisterCraftsmanRequest request)
        {
            if (_craftsmanRepository.GetByEmail(request.Email) != null)
                return null;

            var verificationToken = Guid.NewGuid().ToString("N");
            var verificationExpiry = DateTime.UtcNow.AddHours(24);

            var craftsman = new Craftsman
            {
                FirstName = request.FirstName.Trim(),
                LastName = request.LastName.Trim(),
                Email = request.Email,
                Phone = NormalizePhone(request.Phone),
                Location = request.Location,
                Professions = request.Professions,
                Profession = request.Professions.FirstOrDefault(),
                Experience = request.Experience,
                HourlyRate = request.HourlyRate,
                WorkingHours = request.WorkingHours,
                WorkExperienceDescription = request.WorkExperienceDescription,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
                GoogleId = request.GoogleId,
                IsVerified = false,
                VerificationToken = verificationToken,
                VerificationTokenExpiry = verificationExpiry
            };

            _craftsmanRepository.Add(craftsman);
            var created = _craftsmanRepository.GetByEmail(request.Email);
            if (created == null) return null;

            _ = SendVerificationEmailAsync(request.Email, verificationToken, "craftsman", created.FirstName ?? "Majstoru");

            return new AuthResponse
            {
                RequiresEmailVerification = true,
                Email = created.Email!,
                FullName = $"{created.FirstName} {created.LastName}",
                UserId = created.CraftsmanId,
                Role = "Craftsman"
            };
        }

        // ─── Google OAuth Login/Register ──────────────────────────────────────────
        public async Task<AuthResponse?> LoginWithGoogleAsync(GoogleAuthRequest request)
        {
            // Validacija Google ID tokena putem Google tokeninfo endpointa
            GoogleTokenInfo? tokenInfo;
            try
            {
                var response = await _httpClient.GetAsync(
                    $"https://oauth2.googleapis.com/tokeninfo?id_token={request.Credential}");

                if (!response.IsSuccessStatusCode) return null;

                var json = await response.Content.ReadAsStringAsync();
                tokenInfo = JsonSerializer.Deserialize<GoogleTokenInfo>(json,
                    new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

                if (tokenInfo == null || tokenInfo.Aud != GoogleClientId) return null;
            }
            catch
            {
                return null;
            }

            var email = tokenInfo.Email;
            var googleId = tokenInfo.Sub;
            var firstName = !string.IsNullOrEmpty(tokenInfo.GivenName) ? tokenInfo.GivenName : email.Split('@')[0];
            var lastName = tokenInfo.FamilyName ?? "";

            if (request.UserType == "craftsman")
            {
                // Za majstore: samo login, ne kreiramo nalog automatski
                var craftsman = _craftsmanRepository.GetByGoogleId(googleId)
                    ?? _craftsmanRepository.GetByEmail(email);

                if (craftsman == null) return null;

                if (craftsman.GoogleId != googleId)
                {
                    craftsman.GoogleId = googleId;
                    _craftsmanRepository.Update(craftsman);
                }

                craftsman.RefreshToken = _jwtService.GenerateRefreshToken();
                craftsman.RefreshTokenExpiry = DateTime.UtcNow.AddDays(_jwtSettings.RefreshTokenExpirationDays);
                _craftsmanRepository.Update(craftsman);

                var token = _jwtService.GenerateAccessToken(
                    craftsman.CraftsmanId, craftsman.Email,
                    $"{craftsman.FirstName} {craftsman.LastName}", "Craftsman");

                return new AuthResponse
                {
                    AccessToken = token,
                    RefreshToken = craftsman.RefreshToken,
                    ExpiresIn = _jwtSettings.AccessTokenExpirationMinutes * 60,
                    Email = craftsman.Email!,
                    FullName = $"{craftsman.FirstName} {craftsman.LastName}",
                    UserId = craftsman.CraftsmanId,
                    Role = "Craftsman"
                };
            }
            else
            {
                // Za korisnike: auto-kreiraj nalog ako ne postoji
                var user = _userRepository.GetByGoogleId(googleId)
                    ?? _userRepository.GetByEmail(email);

                if (user == null)
                {
                    user = new User
                    {
                        FirstName = firstName,
                        LastName = lastName,
                        Email = email,
                        Phone = "",
                        PasswordHash = "",
                        Location = "",
                        CreatedAt = DateTime.Now,
                        GoogleId = googleId,
                        IsVerified = true // Google već verifikuje email
                    };
                    _userRepository.Add(user);
                    user = _userRepository.GetByEmail(email);
                    if (user == null) return null;
                }
                else
                {
                    if (user.GoogleId != googleId) user.GoogleId = googleId;
                    if (!user.IsVerified) { user.IsVerified = true; user.VerificationToken = null; user.VerificationTokenExpiry = null; }
                    _userRepository.Update(user);
                }

                user.RefreshToken = _jwtService.GenerateRefreshToken();
                user.RefreshTokenExpiry = DateTime.UtcNow.AddDays(_jwtSettings.RefreshTokenExpirationDays);
                _userRepository.Update(user);

                var token = _jwtService.GenerateAccessToken(
                    user.UserId, user.Email,
                    $"{user.FirstName} {user.LastName}", "User");

                return new AuthResponse
                {
                    AccessToken = token,
                    RefreshToken = user.RefreshToken,
                    ExpiresIn = _jwtSettings.AccessTokenExpirationMinutes * 60,
                    Email = user.Email,
                    FullName = $"{user.FirstName} {user.LastName}",
                    UserId = user.UserId,
                    Role = "User"
                };
            }
        }

        // ─── Forgot Password ──────────────────────────────────────────────────────
        public async Task<bool> ForgotPasswordAsync(ForgotPasswordRequest request)
        {
            var email = request.Email.Trim().ToLower();
            var token = Guid.NewGuid().ToString("N");
            var expiry = DateTime.UtcNow.AddHours(1);

            if (request.UserType == "craftsman")
            {
                var craftsman = _craftsmanRepository.GetByEmail(email);
                if (craftsman != null)
                {
                    craftsman.PasswordResetToken = token;
                    craftsman.PasswordResetTokenExpiry = expiry;
                    _craftsmanRepository.Update(craftsman);
                    await SendResetEmailAsync(email, token, "craftsman", craftsman.FirstName ?? "Majstoru");
                }
            }
            else
            {
                var user = _userRepository.GetByEmail(email);
                if (user != null)
                {
                    user.PasswordResetToken = token;
                    user.PasswordResetTokenExpiry = expiry;
                    _userRepository.Update(user);
                    await SendResetEmailAsync(email, token, "user", user.FirstName);
                }
            }

            return true; // Uvek vracamo true da ne otkrivamo da li email postoji
        }

        // ─── Reset Password ───────────────────────────────────────────────────────
        public async Task<bool> ResetPasswordAsync(ResetPasswordRequest request)
        {
            var email = request.Email.Trim().ToLower();
            var newHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);

            if (request.UserType == "craftsman")
            {
                var craftsman = _craftsmanRepository.GetByEmail(email);
                if (craftsman == null
                    || craftsman.PasswordResetToken != request.Token
                    || craftsman.PasswordResetTokenExpiry == null
                    || craftsman.PasswordResetTokenExpiry < DateTime.UtcNow)
                    return false;

                return _craftsmanRepository.UpdatePassword(craftsman.CraftsmanId, newHash);
            }
            else
            {
                var user = _userRepository.GetByEmail(email);
                if (user == null
                    || user.PasswordResetToken != request.Token
                    || user.PasswordResetTokenExpiry == null
                    || user.PasswordResetTokenExpiry < DateTime.UtcNow)
                    return false;

                return _userRepository.UpdatePassword(user.UserId, newHash);
            }
        }

        // ─── Verify Email ─────────────────────────────────────────────────────────
        public async Task<AuthResponse?> VerifyEmailAsync(VerifyEmailRequest request)
        {
            await Task.CompletedTask;

            if (request.UserType == "craftsman")
            {
                var craftsman = _craftsmanRepository.GetByVerificationToken(request.Token);
                if (craftsman == null || craftsman.Email?.ToLower() != request.Email.ToLower())
                    return null;

                _craftsmanRepository.SetVerified(craftsman.CraftsmanId);

                craftsman.RefreshToken = _jwtService.GenerateRefreshToken();
                craftsman.RefreshTokenExpiry = DateTime.UtcNow.AddDays(_jwtSettings.RefreshTokenExpirationDays);
                craftsman.IsVerified = true;
                _craftsmanRepository.Update(craftsman);

                var accessToken = _jwtService.GenerateAccessToken(
                    craftsman.CraftsmanId, craftsman.Email,
                    $"{craftsman.FirstName} {craftsman.LastName}", "Craftsman");

                return new AuthResponse
                {
                    AccessToken = accessToken,
                    RefreshToken = craftsman.RefreshToken,
                    ExpiresIn = _jwtSettings.AccessTokenExpirationMinutes * 60,
                    Email = craftsman.Email!,
                    FullName = $"{craftsman.FirstName} {craftsman.LastName}",
                    UserId = craftsman.CraftsmanId,
                    Role = "Craftsman"
                };
            }
            else
            {
                var user = _userRepository.GetByVerificationToken(request.Token);
                if (user == null || user.Email.ToLower() != request.Email.ToLower())
                    return null;

                _userRepository.SetVerified(user.UserId);

                user.RefreshToken = _jwtService.GenerateRefreshToken();
                user.RefreshTokenExpiry = DateTime.UtcNow.AddDays(_jwtSettings.RefreshTokenExpirationDays);
                user.IsVerified = true;
                _userRepository.Update(user);

                var accessToken = _jwtService.GenerateAccessToken(
                    user.UserId, user.Email,
                    $"{user.FirstName} {user.LastName}", "User");

                return new AuthResponse
                {
                    AccessToken = accessToken,
                    RefreshToken = user.RefreshToken,
                    ExpiresIn = _jwtSettings.AccessTokenExpirationMinutes * 60,
                    Email = user.Email,
                    FullName = $"{user.FirstName} {user.LastName}",
                    UserId = user.UserId,
                    Role = "User"
                };
            }
        }

        // ─── Resend Verification ──────────────────────────────────────────────────
        public async Task<bool> ResendVerificationAsync(ResendVerificationRequest request)
        {
            var email = request.Email.Trim().ToLower();
            var token = Guid.NewGuid().ToString("N");
            var expiry = DateTime.UtcNow.AddHours(24);

            if (request.UserType == "craftsman")
            {
                var craftsman = _craftsmanRepository.GetByEmail(email);
                if (craftsman == null || craftsman.IsVerified) return false;
                _craftsmanRepository.UpdateVerificationToken(craftsman.CraftsmanId, token, expiry);
                await SendVerificationEmailAsync(email, token, "craftsman", craftsman.FirstName ?? "Majstoru");
            }
            else
            {
                var user = _userRepository.GetByEmail(email);
                if (user == null || user.IsVerified) return false;
                _userRepository.UpdateVerificationToken(user.UserId, token, expiry);
                await SendVerificationEmailAsync(email, token, "user", user.FirstName);
            }

            return true;
        }

        // ─── Email helper ─────────────────────────────────────────────────────────
        private async Task SendVerificationEmailAsync(string toEmail, string token, string userType, string firstName)
        {
            try
            {
                var verifyUrl = $"{FrontendBaseUrl}/verify-email/confirm?token={token}&email={Uri.EscapeDataString(toEmail)}&type={userType}";

                var message = new MimeMessage();
                message.From.Add(new MailboxAddress(_smtpSettings.FromName, _smtpSettings.User));
                message.To.Add(new MailboxAddress(firstName, toEmail));
                message.Subject = "Potvrdite vaš email — Majstorija";

                var builder = new BodyBuilder
                {
                    HtmlBody = $@"
<!DOCTYPE html>
<html>
<body style=""font-family:Arial,sans-serif;background:#f3f4f6;padding:20px"">
  <div style=""max-width:480px;margin:0 auto;background:#1f2937;border-radius:12px;padding:32px;color:#f9fafb"">
    <h2 style=""margin-top:0;color:#60a5fa"">Dobrodošli na Majstoriju!</h2>
    <p>Zdravo <strong>{firstName}</strong>,</p>
    <p>Hvala na registraciji. Kliknite dugme ispod da potvrdite vašu email adresu i aktivirate nalog.</p>
    <p style=""margin:24px 0"">
      <a href=""{verifyUrl}"" style=""background:#2563eb;color:#fff;padding:12px 28px;text-decoration:none;border-radius:8px;font-weight:bold;display:inline-block"">
        Potvrdi email adresu
      </a>
    </p>
    <p style=""color:#9ca3af;font-size:13px"">Link važi <strong>24 sata</strong>.<br>Ako niste kreirali nalog na Majstoriji, ignorišite ovaj email.</p>
  </div>
</body>
</html>"
                };
                message.Body = builder.ToMessageBody();

                using var client = new SmtpClient();
                await client.ConnectAsync(_smtpSettings.Host, _smtpSettings.Port, SecureSocketOptions.StartTls);
                await client.AuthenticateAsync(_smtpSettings.User, _smtpSettings.Pass);
                await client.SendAsync(message);
                await client.DisconnectAsync(true);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[AuthService] Verification email greška: {ex.Message}");
            }
        }

        private async Task SendResetEmailAsync(string toEmail, string token, string userType, string firstName)
        {
            try
            {
                var resetUrl = $"{FrontendBaseUrl}/reset-password?token={token}&email={Uri.EscapeDataString(toEmail)}&type={userType}";

                var message = new MimeMessage();
                message.From.Add(new MailboxAddress(_smtpSettings.FromName, _smtpSettings.User));
                message.To.Add(new MailboxAddress(firstName, toEmail));
                message.Subject = "Resetovanje lozinke — Majstorija";

                var builder = new BodyBuilder
                {
                    HtmlBody = $@"
<!DOCTYPE html>
<html>
<body style=""font-family:Arial,sans-serif;background:#f3f4f6;padding:20px"">
  <div style=""max-width:480px;margin:0 auto;background:#1f2937;border-radius:12px;padding:32px;color:#f9fafb"">
    <h2 style=""margin-top:0;color:#60a5fa"">Resetovanje lozinke</h2>
    <p>Zdravo <strong>{firstName}</strong>,</p>
    <p>Primili smo zahtev za resetovanje lozinke za Vaš Majstorija nalog.</p>
    <p style=""margin:24px 0"">
      <a href=""{resetUrl}"" style=""background:#2563eb;color:#fff;padding:12px 28px;text-decoration:none;border-radius:8px;font-weight:bold;display:inline-block"">
        Resetuj lozinku
      </a>
    </p>
    <p style=""color:#9ca3af;font-size:13px"">Link važi <strong>1 sat</strong>.<br>Ako niste zatražili resetovanje lozinke, ignorišite ovaj email.</p>
  </div>
</body>
</html>"
                };
                message.Body = builder.ToMessageBody();

                using var client = new SmtpClient();
                await client.ConnectAsync(_smtpSettings.Host, _smtpSettings.Port, SecureSocketOptions.StartTls);
                await client.AuthenticateAsync(_smtpSettings.User, _smtpSettings.Pass);
                await client.SendAsync(message);
                await client.DisconnectAsync(true);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[AuthService] Email greška: {ex.Message}");
            }
        }

        // ─── Google token info DTO ────────────────────────────────────────────────
        private class GoogleTokenInfo
        {
            public string Sub { get; set; } = string.Empty;
            public string Email { get; set; } = string.Empty;
            public string Aud { get; set; } = string.Empty;

            [System.Text.Json.Serialization.JsonPropertyName("given_name")]
            public string GivenName { get; set; } = string.Empty;

            [System.Text.Json.Serialization.JsonPropertyName("family_name")]
            public string? FamilyName { get; set; }
        }
    }
}
