using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace WebProdavnica.Entities
{
    public class CardToken
    {
        public int TokenId { get; set; }
        public int UserId { get; set; }
        public string RegistrationId { get; set; }   // AllSecure's token
        public string? CardBrand { get; set; }
        public string? MaskedNumber { get; set; }     // e.g. "************1010"
        public DateTime CreatedAt { get; set; }
    }
}
