using System;
using System.Collections.Generic;

namespace WebProdavnica.Entities
{
    public class Craftsman
    {
        public int CraftsmanId { get; set; }
        public string? FirstName { get; set; }
        public string? LastName { get; set; }
        public string? Email { get; set; }
        public string? Phone { get; set; }
        public string? Location { get; set; }
        public string? Profession { get; set; } // Prvi element iz Professions, cuva se radi backward compatibility
        public List<string> Professions { get; set; } = new();
        public int Experience { get; set; }
        public decimal HourlyRate { get; set; }
        public string? WorkingHours { get; set; }
        public string? WorkExperienceDescription { get; set; }
        public string? PasswordHash { get; set; }
        public string? RefreshToken { get; set; }
        public DateTime? RefreshTokenExpiry { get; set; }
        public decimal? AverageRating { get; set; }
        public int RatingCount { get; set; }
        public string? ProfileImagePath { get; set; }
        public string? GoogleId { get; set; }
        public string? PasswordResetToken { get; set; }
        public DateTime? PasswordResetTokenExpiry { get; set; }
        public ICollection<JobOrder> JobOrders { get; set; } = new List<JobOrder>();
        public ICollection<Chat> Chats { get; set; } = new List<Chat>();
    }
}
