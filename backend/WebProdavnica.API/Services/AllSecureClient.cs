using System.Security.Cryptography;
using System.Text;
using System.Xml.Linq;

namespace WebProdavnica.API.Services
{
    /// <summary>
    /// Returned by every AllSecure API call.
    /// The controller inspects ReturnType to decide what to do next.
    /// </summary>
    public class AllSecureResult
    {
        // FINISHED  = transaction completed right away (no redirect needed)
        // REDIRECT  = user must be sent to RedirectUrl to enter their card
        // PENDING   = AllSecure is still processing; wait for the callback
        // ERROR     = something went wrong; see ErrorMessage
        public string ReturnType { get; set; } = "";
        public bool IsSuccess { get; set; }

        // AllSecure's UUID for this transaction.
        // Store this in payments.transaction_id — it is the referenceTransactionId for Capture.
        public string? ReferenceId { get; set; }

        // Only set when ReturnType == REDIRECT. Redirect the user here.
        public string? RedirectUrl { get; set; }

        // Only set after withRegister=true completes successfully.
        // Store this in card_tokens.registration_id for future charges without card re-entry.
        public string? RegistrationId { get; set; }

        // Only set when ReturnType == ERROR.
        public string? ErrorMessage { get; set; }
    }

    public class AllSecureClient
    {
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly string _username;
        private readonly string _passwordHashed;   // SHA-1 of plaintext password, lowercase hex
        private readonly string _apiKey;           // Goes into the Authorization header
        private readonly string _sharedSecret;     // Used as HMAC-SHA512 key
        private readonly string _callbackUrl;
        private readonly string _shopperResultUrl;

        public AllSecureClient(IHttpClientFactory httpClientFactory, IConfiguration config)
        {
            _httpClientFactory = httpClientFactory;
            var s = config.GetSection("AllSecure");

            _username         = s["Username"]!;
            _apiKey           = s["ApiKey"]!;
            _sharedSecret     = s["SharedSecret"]!;
            _callbackUrl      = s["CallbackUrl"]!;
            _shopperResultUrl = s["ShopperResultUrl"]!;

            // AllSecure requires the password as SHA-1 hash in lowercase hex — NOT plaintext.
            var plain = s["Password"]!;
            using var sha1 = SHA1.Create();
            _passwordHashed = Convert.ToHexString(
                sha1.ComputeHash(Encoding.UTF8.GetBytes(plain))).ToLower();
        }

        // ── Public API methods ─────────────────────────────────────────────────

        /// <summary>
        /// Reserves funds on the customer's card.
        /// withRegister=true asks AllSecure to also tokenize the card for future charges.
        ///
        /// First-time user:
        ///   Returns REDIRECT — redirect user to RedirectUrl (AllSecure hosted payment page).
        ///   ReferenceId is already present in the REDIRECT response; store it in the DB.
        ///   After the user completes payment, AllSecure calls callbackUrl/{jobId} with
        ///   the final result (FINISHED or ERROR) and, if withRegister=true, a RegistrationId.
        /// </summary>
        public Task<AllSecureResult> PreauthorizeAsync(
            string merchantTransactionId,
            decimal amount,
            string currency,
            string customerEmail,
            string customerIp,
            int jobId,
            bool withRegister)
        {
            var inner = $@"    <transactionId>{XE(merchantTransactionId)}</transactionId>
    <customer>
      <identification>{XE(merchantTransactionId)}</identification>
      <billingCountry>RS</billingCountry>
      <email>{XE(customerEmail)}</email>
      <ipAddress>{XE(customerIp)}</ipAddress>
    </customer>
    <amount>{Fmt(amount)}</amount>
    <currency>{currency}</currency>
    <description>Majstorija rezervacija</description>
    <successUrl>{XE(_shopperResultUrl)}</successUrl>
    <cancelUrl>{XE(_shopperResultUrl)}?canceled=true</cancelUrl>
    <errorUrl>{XE(_shopperResultUrl)}?error=true</errorUrl>
    <callbackUrl>{XE($"{_callbackUrl}/{jobId}")}</callbackUrl>
    <withRegister>{withRegister.ToString().ToLower()}</withRegister>";

            return PostTransactionAsync("preauthorize", inner);
        }

        /// <summary>
        /// Reserves funds using a previously saved card registration (returning user).
        /// registrationReferenceId = AllSecure's referenceId returned when the card was registered
        ///   (stored in card_tokens.registration_id).
        /// Usually completes as FINISHED with no redirect, but may still trigger 3DS.
        /// </summary>
        public Task<AllSecureResult> PreauthorizeWithRegistrationAsync(
            string merchantTransactionId,
            decimal amount,
            string currency,
            string registrationReferenceId,
            int jobId)
        {
            var inner = $@"    <transactionId>{XE(merchantTransactionId)}</transactionId>
    <referenceTransactionId>{XE(registrationReferenceId)}</referenceTransactionId>
    <amount>{Fmt(amount)}</amount>
    <currency>{currency}</currency>
    <callbackUrl>{XE($"{_callbackUrl}/{jobId}")}</callbackUrl>";

            return PostTransactionAsync("preauthorize", inner);
        }

        /// <summary>
        /// Charges the actual amount against a previously pre-authorized transaction.
        /// preauthorizeReferenceId = AllSecure's referenceId from Preauthorize (payments.transaction_id).
        /// amount = actual job price — can be less than the reserved amount (the buffer is released).
        /// </summary>
        public Task<AllSecureResult> CaptureAsync(
            string merchantTransactionId,
            string preauthorizeReferenceId,
            decimal amount,
            string currency)
        {
            var inner = $@"    <transactionId>{XE(merchantTransactionId)}</transactionId>
    <referenceTransactionId>{XE(preauthorizeReferenceId)}</referenceTransactionId>
    <amount>{Fmt(amount)}</amount>
    <currency>{currency}</currency>";

            return PostTransactionAsync("capture", inner);
        }

        /// <summary>
        /// Parses AllSecure's async callback notification XML body.
        /// Call this in the POST /api/payments/callback/{jobId} endpoint.
        /// </summary>
        public static AllSecureResult ParseCallback(string xml)
            => ParseXmlResponse(xml);

        // ── Private helpers ────────────────────────────────────────────────────

        private string BuildXml(string transactionType, string innerXml) =>
            "<?xml version=\"1.0\" encoding=\"utf-8\"?>\n" +
            "<transaction xmlns=\"https://asxgw.com/Schema/V2/Transaction\">\n" +
            $"  <username>{_username}</username>\n" +
            $"  <password>{_passwordHashed}</password>\n" +
            $"  <{transactionType}>\n" +
            innerXml + "\n" +
            $"  </{transactionType}>\n" +
            "</transaction>";

        private async Task<AllSecureResult> PostTransactionAsync(string transactionType, string innerXml)
        {
            var xml = BuildXml(transactionType, innerXml);
            return await PostAsync("/transaction", xml);
        }

        private async Task<AllSecureResult> PostAsync(string path, string xml)
        {
            const string contentType = "text/xml; charset=utf-8";
            // Timestamp must be the same value used both in the signature and the Date header
            var timestamp  = DateTime.UtcNow.ToString("R");  // RFC 1123: "Thu, 01 Jan 1970 00:00:00 GMT"
            var authHeader = BuildAuthHeader("POST", xml, contentType, timestamp, path);

            var content = new StringContent(xml, Encoding.UTF8, "text/xml");
            var request = new HttpRequestMessage(HttpMethod.Post, path) { Content = content };
            request.Headers.TryAddWithoutValidation("Authorization", authHeader);
            request.Headers.TryAddWithoutValidation("Date", timestamp);

            var client = _httpClientFactory.CreateClient("AllSecure");
            var response = await client.SendAsync(request);
            var body = await response.Content.ReadAsStringAsync();
            return ParseXmlResponse(body);
        }

        private string BuildAuthHeader(string method, string body, string contentType, string timestamp, string uri)
        {
            // Step 1 — SHA-512 hash of the exact bytes of the request body, expressed as lowercase hex
            using var sha512 = SHA512.Create();
            var bodyHash = Convert.ToHexString(
                sha512.ComputeHash(Encoding.UTF8.GetBytes(body))).ToLower();

            // Step 2 — Build the signing message.
            // Each part is on its own line. The empty string between timestamp and uri
            // is the "custom headers" placeholder (we have none).
            var message = string.Join("\n", method, bodyHash, contentType, timestamp, "", uri);

            // Step 3 — HMAC-SHA512 of the message, using sharedSecret as key, Base64-encoded
            using var hmac = new HMACSHA512(Encoding.UTF8.GetBytes(_sharedSecret));
            var signature = Convert.ToBase64String(
                hmac.ComputeHash(Encoding.UTF8.GetBytes(message)));

            return $"Gateway {_apiKey}:{signature}";
        }

        private static AllSecureResult ParseXmlResponse(string xml)
        {
            try
            {
                // AllSecure uses a namespace on the result element; try with and without it
                var ns   = XNamespace.Get("https://asxgw.com/Schema/V2/Result");
                var doc  = XDocument.Parse(xml);
                var root = doc.Root!;

                string Get(string name) =>
                    root.Element(ns + name)?.Value ?? root.Element(name)?.Value ?? "";

                var returnType     = Get("returnType");
                var referenceId    = Get("referenceId");
                var redirectUrl    = Get("redirectUrl");
                var registrationId = Get("registrationId");
                var success        = Get("success") == "true";

                string? errorMessage = null;
                if (returnType == "ERROR")
                {
                    var errEl = root.Descendants(ns + "error").FirstOrDefault()
                             ?? root.Descendants("error").FirstOrDefault();
                    errorMessage = errEl?.Element(ns + "message")?.Value
                                ?? errEl?.Element("message")?.Value;
                }

                return new AllSecureResult
                {
                    IsSuccess      = success,
                    ReturnType     = returnType,
                    ReferenceId    = string.IsNullOrEmpty(referenceId)    ? null : referenceId,
                    RedirectUrl    = string.IsNullOrEmpty(redirectUrl)    ? null : redirectUrl,
                    RegistrationId = string.IsNullOrEmpty(registrationId) ? null : registrationId,
                    ErrorMessage   = errorMessage,
                };
            }
            catch (Exception ex)
            {
                return new AllSecureResult
                {
                    IsSuccess    = false,
                    ReturnType   = "ERROR",
                    ErrorMessage = $"Failed to parse AllSecure response: {ex.Message}",
                };
            }
        }

        // Minimal XML character escaping for values injected into the XML template
        private static string XE(string s) => s
            .Replace("&", "&amp;")
            .Replace("<", "&lt;")
            .Replace(">", "&gt;")
            .Replace("\"", "&quot;");

        private static string Fmt(decimal d) =>
            d.ToString("F2", System.Globalization.CultureInfo.InvariantCulture);
    }
}
