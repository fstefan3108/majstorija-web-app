using WebProdavnica.Entities.DTOs;

namespace WebProdavnica.BusinessLayer.Abstract
{
    public interface IAuthService
    {
        AuthResponse? Login(LoginRequest request);
        AuthResponse? RegisterUser(RegisterUserRequest request);
        AuthResponse? RegisterCraftsman(RegisterCraftsmanRequest request);
        Task<AuthResponse?> LoginWithGoogleAsync(GoogleAuthRequest request);
        Task<bool> ForgotPasswordAsync(ForgotPasswordRequest request);
        Task<bool> ResetPasswordAsync(ResetPasswordRequest request);
    }
}
