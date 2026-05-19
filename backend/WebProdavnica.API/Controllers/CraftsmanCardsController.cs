using Microsoft.AspNetCore.Mvc;
using WebProdavnica.API.Services;
using WebProdavnica.BusinessLayer.Abstract;

namespace WebProdavnica.API.Controllers
{
    [ApiController]
    [Route("api/craftsmen")]
    public class CraftsmanCardsController : ControllerBase
    {
        private readonly ICraftsmanCardTokenService _cardTokenService;
        private readonly ICraftsmanService _craftsmanService;
        private readonly AllSecureClient _allSecure;
        private readonly IConfiguration _config;

        public CraftsmanCardsController(
            ICraftsmanCardTokenService cardTokenService,
            ICraftsmanService craftsmanService,
            AllSecureClient allSecure,
            IConfiguration config)
        {
            _cardTokenService = cardTokenService;
            _craftsmanService = craftsmanService;
            _allSecure = allSecure;
            _config = config;
        }

        // GET /api/craftsmen/{id}/card-tokens
        // Vraća sve sačuvane kartice za majstora.
        [HttpGet("{id}/card-tokens")]
        public IActionResult GetCardTokens(int id)
        {
            var tokens = _cardTokenService.GetAllByCraftsmanId(id);
            return Ok(new
            {
                success = true,
                cards = tokens.Select(t => new
                {
                    id           = t.Id,
                    cardBrand    = t.CardBrand,
                    maskedNumber = t.MaskedNumber,
                    createdAt    = t.CreatedAt,
                })
            });
        }

        // GET /api/craftsmen/{id}/card-token
        // Proverava ima li majstor barem jednu karticu (za checkout izviđanja).
        [HttpGet("{id}/card-token")]
        public IActionResult GetCardToken(int id)
        {
            var token = _cardTokenService.GetByCraftsmanId(id);
            if (token == null)
                return Ok(new { hasToken = false });

            return Ok(new
            {
                hasToken     = true,
                cardBrand    = token.CardBrand,
                maskedNumber = token.MaskedNumber,
            });
        }

        // POST /api/craftsmen/{id}/initiate-card-registration
        // Pokreće AllSecure Register flow — vraća redirectUrl na AllSecure-ovu stranicu
        // za unos kartice. Nema naplate — kartica se samo registruje/tokenizuje.
        // Body (opciono): { "returnPath": "/profile/settings?tab=cards&cardAdded=true" }
        // Ako returnPath nije prosleđen, koristi se /card-registered.
        [HttpPost("{id}/initiate-card-registration")]
        public async Task<IActionResult> InitiateCardRegistration(int id, [FromBody] CardRegistrationRequest? request = null)
        {
            var craftsman = _craftsmanService.Get(id);
            if (craftsman == null)
                return NotFound(new { success = false, message = "Majstor nije pronađen." });

            var merchantTxId = Guid.NewGuid().ToString("N");
            var customerIp   = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "127.0.0.1";
            var frontendBase = _config["FrontendBaseUrl"] ?? "http://localhost:5173";
            var returnPath   = request?.ReturnPath ?? "/card-registered";
            var successUrl   = $"{frontendBase}{returnPath}";
            var cancelUrl    = $"{frontendBase}{returnPath}{(returnPath.Contains('?') ? "&" : "?")}canceled=true";
            var errorUrl     = $"{frontendBase}{returnPath}{(returnPath.Contains('?') ? "&" : "?")}error=true";

            var result = await _allSecure.RegisterAsync(
                merchantTxId,
                customerEmail: craftsman.Email ?? "majstor@majstorija.rs",
                customerIp: customerIp,
                callbackSuffix: $"craftsman-card/{id}",
                successUrl: successUrl,
                cancelUrl: cancelUrl,
                errorUrl: errorUrl);

            if (result.ReturnType == "REDIRECT")
                return Ok(new { success = true, redirectUrl = result.RedirectUrl });

            return BadRequest(new { success = false, message = result.ErrorMessage ?? "AllSecure greška" });
        }

        public class CardRegistrationRequest
        {
            public string? ReturnPath { get; set; }
        }

        // DELETE /api/craftsmen/{craftsmanId}/card-tokens/{tokenId}
        // Briše karticu — deregistruje je na AllSecure strani, zatim uklanja iz naše baze.
        [HttpDelete("{craftsmanId}/card-tokens/{tokenId}")]
        public async Task<IActionResult> DeleteCardToken(int craftsmanId, int tokenId)
        {
            var token = _cardTokenService.GetById(tokenId);
            if (token == null || token.CraftsmanId != craftsmanId)
                return NotFound(new { success = false, message = "Kartica nije pronađena." });

            var result = await _allSecure.DeregisterAsync(
                Guid.NewGuid().ToString("N"),
                token.RegistrationId);

            if (result.ReturnType == "ERROR")
                return BadRequest(new { success = false, message = result.ErrorMessage ?? "Greška pri brisanju kartice na AllSecure." });

            _cardTokenService.Delete(tokenId);
            return Ok(new { success = true });
        }
    }
}
