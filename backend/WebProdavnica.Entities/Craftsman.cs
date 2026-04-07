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
        public string? Profession { get; set; }
        public int Experience { get; set; }
        public decimal HourlyRate { get; set; }
        public string? WorkingHours { get; set; }
        public string? PasswordHash { get; set; }
        public string? RefreshToken { get; set; }
        public DateTime? RefreshTokenExpiry { get; set; }
        public decimal? AverageRating { get; set; }
        public int RatingCount { get; set; }
        public ICollection<JobOrder> JobOrders { get; set; } = new List<JobOrder>();
        public ICollection<Chat> Chats { get; set; } = new List<Chat>();
    }
}