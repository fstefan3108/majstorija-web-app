using System.ComponentModel.DataAnnotations;

namespace WebProdavnica.Entities.DTOs
{
    /// <summary>Korisnik kreira zahtev (bez slika — slike se salju posebnim multipart endpointom)</summary>
    public class CreateJobRequestDto
    {
        [Required]
        [StringLength(200, MinimumLength = 3, ErrorMessage = "Naslov mora imati između 3 i 200 karaktera")]
        public string Title { get; set; } = string.Empty;

        [Required]
        [StringLength(2000, MinimumLength = 10, ErrorMessage = "Opis mora imati između 10 i 2000 karaktera")]
        public string Description { get; set; } = string.Empty;

        [Required]
        public DateTime ScheduledDate { get; set; }

        public bool Urgent { get; set; }

        [Required]
        [Range(1, int.MaxValue)]
        public int UserId { get; set; }

        [Required]
        [Range(1, int.MaxValue)]
        public int CraftsmanId { get; set; }
    }

    /// <summary>Majstor prihvata zahtev i šalje procenu vremena</summary>
    public class AcceptJobRequestDto
    {
        [Required]
        [Range(0, 23, ErrorMessage = "Sati moraju biti između 0 i 23")]
        public int EstimatedHours { get; set; }

        [Required]
        [Range(0, 59, ErrorMessage = "Minuti moraju biti između 0 i 59")]
        public int EstimatedMinutes { get; set; }
    }
}
