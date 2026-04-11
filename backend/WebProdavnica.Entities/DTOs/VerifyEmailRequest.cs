using System.ComponentModel.DataAnnotations;

namespace WebProdavnica.Entities.DTOs
{
    public class VerifyEmailRequest
    {
        [Required(ErrorMessage = "Token je obavezan")]
        public string Token { get; set; } = string.Empty;

        [Required(ErrorMessage = "Email je obavezan")]
        public string Email { get; set; } = string.Empty;

        [Required(ErrorMessage = "Tip korisnika je obavezan")]
        [RegularExpression(@"^(user|craftsman)$", ErrorMessage = "UserType mora biti 'user' ili 'craftsman'")]
        public string UserType { get; set; } = "user";
    }

    public class ResendVerificationRequest
    {
        [Required(ErrorMessage = "Email je obavezan")]
        [RegularExpression(@"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,5}$",
            ErrorMessage = "Email nije u ispravnom formatu")]
        public string Email { get; set; } = string.Empty;

        [Required(ErrorMessage = "Tip korisnika je obavezan")]
        [RegularExpression(@"^(user|craftsman)$", ErrorMessage = "UserType mora biti 'user' ili 'craftsman'")]
        public string UserType { get; set; } = "user";
    }
}
