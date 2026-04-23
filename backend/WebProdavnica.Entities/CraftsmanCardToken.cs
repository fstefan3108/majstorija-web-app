namespace WebProdavnica.Entities
{
    public class CraftsmanCardToken
    {
        public int Id { get; set; }
        public int CraftsmanId { get; set; }
        public string RegistrationId { get; set; } = "";   // AllSecure's token — never raw card data
        public string? CardBrand { get; set; }             // "VISA", "MASTERCARD", etc.
        public string? MaskedNumber { get; set; }          // "411111******1111"
        public DateTime CreatedAt { get; set; }
    }
}
