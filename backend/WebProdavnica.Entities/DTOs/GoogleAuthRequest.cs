using System.ComponentModel.DataAnnotations;

namespace WebProdavnica.Entities.DTOs
{
    public class GoogleAuthRequest
    {
        [Required(ErrorMessage = "Google credential je obavezan")]
        public string Credential { get; set; } = string.Empty;

        [Required(ErrorMessage = "Tip korisnika je obavezan")]
        [RegularExpression(@"^(user|craftsman)$", ErrorMessage = "UserType mora biti 'user' ili 'craftsman'")]
        public string UserType { get; set; } = "user";
    }
}
