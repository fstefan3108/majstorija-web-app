using System.ComponentModel.DataAnnotations;

namespace WebProdavnica.Entities.DTOs
{
    public class RegisterUserRequest
    {
        [Required(ErrorMessage = "Ime je obavezno")]
        [StringLength(50, MinimumLength = 2, ErrorMessage = "Ime mora imati između 2 i 50 karaktera")]
        [RegularExpression(@"^[a-zA-ZčćđšžČĆĐŠŽ\s]+$", ErrorMessage = "Ime sme sadržati samo slova")]
        public string FirstName { get; set; } = string.Empty;

        [Required(ErrorMessage = "Prezime je obavezno")]
        [StringLength(50, MinimumLength = 2, ErrorMessage = "Prezime mora imati između 2 i 50 karaktera")]
        [RegularExpression(@"^[a-zA-ZčćđšžČĆĐŠŽ\s]+$", ErrorMessage = "Prezime sme sadržati samo slova")]
        public string LastName { get; set; } = string.Empty;

        [Required(ErrorMessage = "Email je obavezan")]
        [RegularExpression(@"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,5}$",
            ErrorMessage = "Email nije u ispravnom formatu (primer: ime@gmail.com)")]
        [StringLength(100, ErrorMessage = "Email ne sme biti duži od 100 karaktera")]
        public string Email { get; set; } = string.Empty;

        [Required(ErrorMessage = "Broj telefona je obavezan")]
        [RegularExpression(@"^(\+381|0)[\s]?[0-9]{2}[\s]?[0-9]{3,8}$",
            ErrorMessage = "Telefon mora biti u formatu +381 60 1234567 ili 060 1234567")]
        public string Phone { get; set; } = string.Empty;

        [Required(ErrorMessage = "Lozinka je obavezna")]
        [StringLength(100, MinimumLength = 8, ErrorMessage = "Lozinka mora imati najmanje 8 karaktera")]
        [RegularExpression(@"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$",
            ErrorMessage = "Lozinka mora sadržati bar jedno veliko slovo, malo slovo i broj")]
        public string Password { get; set; } = string.Empty;

        [StringLength(100, ErrorMessage = "Lokacija ne sme biti duža od 100 karaktera")]
        public string Location { get; set; } = string.Empty;

        // Opciono — popunjava se kada korisnik registruje nalog putem Google OAuth
        public string? GoogleId { get; set; }
    }
}
