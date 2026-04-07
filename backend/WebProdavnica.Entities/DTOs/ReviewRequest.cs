namespace WebProdavnica.Entities.DTOs
{
    public class ReviewRequest
    {
        public int Rating { get; set; }
        public string? Comment { get; set; }
        public int UserId { get; set; }
    }
}