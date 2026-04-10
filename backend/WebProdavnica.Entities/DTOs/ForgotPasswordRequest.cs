using System.ComponentModel.DataAnnotations;

namespace WebProdavnica.Entities.DTOs
{
    public class ForgotPasswordRequest
    {
        [Required(ErrorMessage = "Email je obavezan")]
        [RegularExpression(@"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,5}$",
            ErrorMessage = "Email nije u ispravnom formatu")]
        public string Email { get; set; } = string.Empty;

        [Required(ErrorMessage = "Tip korisnika je obavezan")]
        [RegularExpression(@"^(user|craftsman)$", ErrorMessage = "UserType mora biti 'user' ili 'craftsman'")]
        public string UserType { get; set; } = "user";
    }

    public class ResetPasswordRequest
    {
        [Required(ErrorMessage = "Token je obavezan")]
        public string Token { get; set; } = string.Empty;

        [Required(ErrorMessage = "Email je obavezan")]
        public string Email { get; set; } = string.Empty;

        [Required(ErrorMessage = "Tip korisnika je obavezan")]
        [RegularExpression(@"^(user|craftsman)$", ErrorMessage = "UserType mora biti 'user' ili 'craftsman'")]
        public string UserType { get; set; } = "user";

        [Required(ErrorMessage = "Nova lozinka je obavezna")]
        [StringLength(100, MinimumLength = 8, ErrorMessage = "Lozinka mora imati najmanje 8 karaktera")]
        [RegularExpression(@"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$",
            ErrorMessage = "Lozinka mora sadržati bar jedno veliko slovo, malo slovo i broj")]
        public string NewPassword { get; set; } = string.Empty;
    }
}
