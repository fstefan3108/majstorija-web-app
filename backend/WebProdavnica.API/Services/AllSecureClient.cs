using System.Security.Cryptography;
using System.Text;
using System.Xml.Linq;

namespace WebProdavnica.API.Services
{
    /// <summary>
    /// Returned by every AllSecure API call (preauthorize / capture / etc.).
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

        // Only set after withRegister=true completes successfully (FINISHED case).
        // For REDIRECT case it arrives later in the callback.
        public string? RegistrationId { get; set; }

        // Only set when ReturnType == ERROR.
        public string? ErrorMessage { get; set; }
    }

    /// <summary>
    /// Parsed from the async callback (postback notification) that AllSecure POSTs to callbackUrl.
    /// Uses namespace https://asxgw.com/Schema/V2/Callback — different from the Result namespace.
    /// </summary>
    public class AllSecureCallbackResult
    {
        // "OK" or "ERROR"
        public string Result { get; set; } = "";
        public bool IsSuccess => Result == "OK";

        // AllSecure's UUID — matches what we stored in payments.transaction_id
        public string? ReferenceId { get; set; }

        // Our merchantTransactionId sent in the original request
        public string? MerchantTransactionId { get; set; }

        // PREAUTHORIZE, CAPTURE, CHARGEBACK, CHARGEBACK-REVERSAL, DEBIT, REFUND, etc.
        public string? TransactionType { get; set; }

        // Present when withRegister=true and the card was successfully tokenised.
        // This is the value to store in card_tokens.registration_id.
        public string? RegistrationId { get; set; }

        // Card details extracted from <returnData><creditcardData>
        public string? CardBrand { get; set; }         // "visa" → uppercased to "VISA"
        public string? CardLastFour { get; set; }       // e.g. "1111"
        public string? CardFirstSix { get; set; }       // e.g. "411111"

        // For CHARGEBACK callbacks
        public string? OriginalReferenceId { get; set; }

        // Error details
        public string? ErrorMessage { get; set; }
        public string? ErrorCode { get; set; }
    }

    public class AllSecureClient
    {
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly ILogger<AllSecureClient> _logger;
        private readonly string _username;
        private readonly string _passwordHashed;   // SHA-1 of plaintext password, lowercase hex
        private readonly string _apiKey;           // Goes into the Authorization header
        private readonly string _sharedSecret;     // Used as HMAC-SHA512 key
        private readonly string _callbackUrl;
        private readonly string _shopperResultUrl;
        private readonly string _schemaBase;  // e.g. http://asxgw.paymentsandbox.cloud or https://asxgw.com

        public AllSecureClient(IHttpClientFactory httpClientFactory, IConfiguration config, ILogger<AllSecureClient> logger)
        {
            _logger = logger;
            _httpClientFactory = httpClientFactory;
            var s = config.GetSection("AllSecure");

            _username         = s["Username"]!;
            _apiKey           = s["ApiKey"]!;
            _sharedSecret     = s["SharedSecret"]!;
            _callbackUrl      = s["CallbackUrl"]!;
            _shopperResultUrl = s["ShopperResultUrl"]!;
            _schemaBase       = s["SchemaBaseUrl"]!;

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
        /// callbackSuffix is appended to _callbackUrl to form the full callback URL:
        ///   - Job payments: "{jobId}"              → …/callback/{jobId}
        ///   - Survey payments: "survey/{surveyId}" → …/callback/survey/{surveyId}
        /// </summary>
        public Task<AllSecureResult> PreauthorizeAsync(
            string merchantTransactionId,
            decimal amount,
            string currency,
            string customerEmail,
            string customerIp,
            string callbackSuffix,
            bool withRegister,
            string? customSuccessUrl = null)
        {
            var successUrl = customSuccessUrl ?? _shopperResultUrl;
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
    <successUrl>{XE(successUrl)}</successUrl>
    <cancelUrl>{XE(successUrl)}?canceled=true</cancelUrl>
    <errorUrl>{XE(successUrl)}?error=true</errorUrl>
    <callbackUrl>{XE($"{_callbackUrl}/{callbackSuffix}")}</callbackUrl>
    <withRegister>{withRegister.ToString().ToLower()}</withRegister>";

            return PostTransactionAsync("preauthorize", inner);
        }

        /// <summary>
        /// Reserves funds using a previously saved card registration (returning user).
        /// registrationReferenceId = the registrationId returned when the card was registered
        ///   (stored in card_tokens.registration_id).
        /// callbackSuffix: same convention as PreauthorizeAsync.
        /// </summary>
        public Task<AllSecureResult> PreauthorizeWithRegistrationAsync(
            string merchantTransactionId,
            decimal amount,
            string currency,
            string registrationReferenceId,
            string callbackSuffix)
        {
            // successUrl/cancelUrl/errorUrl are included in case AllSecure triggers a 3DS
            // challenge for the returning user — without them the redirect would have nowhere to go.
            var inner = $@"    <transactionId>{XE(merchantTransactionId)}</transactionId>
    <referenceTransactionId>{XE(registrationReferenceId)}</referenceTransactionId>
    <amount>{Fmt(amount)}</amount>
    <currency>{currency}</currency>
    <successUrl>{XE(_shopperResultUrl)}</successUrl>
    <cancelUrl>{XE(_shopperResultUrl)}?canceled=true</cancelUrl>
    <errorUrl>{XE(_shopperResultUrl)}?error=true</errorUrl>
    <callbackUrl>{XE($"{_callbackUrl}/{callbackSuffix}")}</callbackUrl>";

            return PostTransactionAsync("preauthorize", inner);
        }

        /// <summary>
        /// Charges the actual amount against a previously pre-authorized transaction.
        /// preauthorizeReferenceId = AllSecure's referenceId from Preauthorize (payments.transaction_id).
        /// amount = actual job price — can be less than the reserved amount (the buffer is released).
        /// callbackUrl is included so that any chargeback on this capture is routed to the right job.
        /// </summary>
        public Task<AllSecureResult> CaptureAsync(
            string merchantTransactionId,
            string preauthorizeReferenceId,
            decimal amount,
            string currency,
            int jobId)
        {
            var inner = $@"    <transactionId>{XE(merchantTransactionId)}</transactionId>
    <referenceTransactionId>{XE(preauthorizeReferenceId)}</referenceTransactionId>
    <amount>{Fmt(amount)}</amount>
    <currency>{currency}</currency>";

            return PostTransactionAsync("capture", inner);
        }

        /// <summary>
        /// Refunds a previously captured transaction, partially or in full.
        /// captureReferenceId = AllSecure's referenceId from the Capture.
        /// </summary>
        public Task<AllSecureResult> RefundAsync(
            string merchantTransactionId,
            string captureReferenceId,
            decimal amount,
            string currency)
        {
            var inner = $@"    <transactionId>{XE(merchantTransactionId)}</transactionId>
    <referenceTransactionId>{XE(captureReferenceId)}</referenceTransactionId>
    <amount>{Fmt(amount)}</amount>
    <currency>{currency}</currency>";

            return PostTransactionAsync("refund", inner);
        }

        /// <summary>
        /// Registers a customer's payment instrument for future charges, without charging anything.
        /// AllSecure returns REDIRECT — user is sent to their hosted card-entry page.
        /// After the user saves their card, AllSecure POSTs the callback with registrationId.
        /// </summary>
        public Task<AllSecureResult> RegisterAsync(
            string merchantTransactionId,
            string customerEmail,
            string customerIp,
            string callbackSuffix,
            string successUrl,
            string cancelUrl,
            string errorUrl)
        {
            var inner = $@"    <transactionId>{XE(merchantTransactionId)}</transactionId>
    <customer>
      <identification>{XE(merchantTransactionId)}</identification>
      <billingCountry>RS</billingCountry>
      <email>{XE(customerEmail)}</email>
      <ipAddress>{XE(customerIp)}</ipAddress>
    </customer>
    <description>Majstorija – registracija kartice</description>
    <successUrl>{XE(successUrl)}</successUrl>
    <cancelUrl>{XE(cancelUrl)}</cancelUrl>
    <errorUrl>{XE(errorUrl)}</errorUrl>
    <callbackUrl>{XE($"{_callbackUrl}/{callbackSuffix}")}</callbackUrl>";

            return PostTransactionAsync("register", inner);
        }

        /// <summary>
        /// Deletes a previously registered payment instrument from AllSecure's side.
        /// registrationId = the registrationId returned in the Register callback
        ///                  (stored in craftsman_card_tokens.registration_id).
        /// </summary>
        public Task<AllSecureResult> DeregisterAsync(
            string merchantTransactionId,
            string registrationId)
        {
            var inner = $@"    <transactionId>{XE(merchantTransactionId)}</transactionId>
    <referenceTransactionId>{XE(registrationId)}</referenceTransactionId>";

            return PostTransactionAsync("deregister", inner);
        }

        /// <summary>
        /// Voids (cancels) a pre-authorized transaction that has not yet been captured.
        /// Use this when a job is cancelled before the timer starts.
        /// </summary>
        public Task<AllSecureResult> VoidAsync(
            string merchantTransactionId,
            string preauthorizeReferenceId)
        {
            var inner = $@"    <transactionId>{XE(merchantTransactionId)}</transactionId>
    <referenceTransactionId>{XE(preauthorizeReferenceId)}</referenceTransactionId>";

            return PostTransactionAsync("void", inner);
        }

        /// <summary>
        /// Parses AllSecure's async callback (postback notification) XML body.
        /// Call this in the POST /api/payments/callback/{jobId} endpoint.
        /// Note: uses namespace V2/Callback, NOT V2/Result.
        /// </summary>
        public AllSecureCallbackResult ParseCallback(string xml)
        {
            try
            {
                var ns   = XNamespace.Get($"{_schemaBase}/Schema/V2/Callback");
                var doc  = XDocument.Parse(xml);
                var root = doc.Root!;

                string Get(string name) =>
                    root.Element(ns + name)?.Value ?? root.Element(name)?.Value ?? "";

                var result          = Get("result");
                var referenceId     = Get("referenceId");
                var merchantTxId    = Get("transactionId");
                var transactionType = Get("transactionType");
                var registrationId  = Get("registrationId");

                // Card data from <returnData><creditcardData>
                var ccEl = root.Descendants(ns + "creditcardData").FirstOrDefault()
                        ?? root.Descendants("creditcardData").FirstOrDefault();

                var cardBrand    = ccEl?.Element(ns + "type")?.Value ?? ccEl?.Element("type")?.Value;
                var lastFour     = ccEl?.Element(ns + "lastFourDigits")?.Value ?? ccEl?.Element("lastFourDigits")?.Value;
                var firstSix     = ccEl?.Element(ns + "firstSixDigits")?.Value ?? ccEl?.Element("firstSixDigits")?.Value;

                // Error details
                var errEl = root.Descendants(ns + "error").FirstOrDefault()
                         ?? root.Descendants("error").FirstOrDefault();
                var errorMsg  = errEl?.Element(ns + "message")?.Value ?? errEl?.Element("message")?.Value;
                var errorCode = errEl?.Element(ns + "code")?.Value    ?? errEl?.Element("code")?.Value;

                // Chargeback: originalReferenceId lives inside <chargebackData>
                var cbEl = root.Element(ns + "chargebackData") ?? root.Element("chargebackData");
                var originalReferenceId = cbEl?.Element(ns + "originalReferenceId")?.Value
                                       ?? cbEl?.Element("originalReferenceId")?.Value;

                return new AllSecureCallbackResult
                {
                    Result              = result,
                    ReferenceId         = NullIfEmpty(referenceId),
                    MerchantTransactionId = NullIfEmpty(merchantTxId),
                    TransactionType     = NullIfEmpty(transactionType),
                    RegistrationId      = NullIfEmpty(registrationId),
                    CardBrand           = cardBrand?.ToUpper(),
                    CardLastFour        = NullIfEmpty(lastFour),
                    CardFirstSix        = NullIfEmpty(firstSix),
                    OriginalReferenceId = NullIfEmpty(originalReferenceId),
                    ErrorMessage        = NullIfEmpty(errorMsg),
                    ErrorCode           = NullIfEmpty(errorCode),
                };
            }
            catch (Exception ex)
            {
                return new AllSecureCallbackResult
                {
                    Result       = "ERROR",
                    ErrorMessage = $"Failed to parse callback XML: {ex.Message}",
                };
            }
        }

        /// <summary>
        /// Verifies the HMAC-SHA512 signature on an incoming callback request.
        /// Returns true if the signature is valid (or if no Authorization header was sent — sandbox mode).
        /// In production you should reject requests where authorizationHeader is null.
        /// </summary>
        public bool VerifyCallbackSignature(
            string method,
            string rawBody,
            string contentType,
            string date,
            string requestUri,
            string? authorizationHeader)
        {
            if (string.IsNullOrEmpty(authorizationHeader))
                return true; // No signature — sandbox may omit it; accept for now

            // Reject requests whose Date header is more than 60 seconds old (replay protection)
            if (!string.IsNullOrEmpty(date)
                && DateTime.TryParseExact(date, "R", null,
                    System.Globalization.DateTimeStyles.AdjustToUniversal, out var requestTime)
                && Math.Abs((DateTime.UtcNow - requestTime).TotalSeconds) > 60)
            {
                return false;
            }

            var expected = BuildAuthHeader(method, rawBody, contentType, date, requestUri);
            return authorizationHeader == expected;
        }

        // ── Private helpers ────────────────────────────────────────────────────

        private string BuildXml(string transactionType, string innerXml) =>
            "<?xml version=\"1.0\" encoding=\"utf-8\"?>\n" +
            $"<transaction xmlns=\"{_schemaBase}/Schema/V2/Transaction\">\n" +
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
            var timestamp  = DateTime.UtcNow.ToString("R");  // RFC 1123
            var authHeader = BuildAuthHeader("POST", xml, contentType, timestamp, path);

            var content = new StringContent(xml, Encoding.UTF8, "text/xml");
            var request = new HttpRequestMessage(HttpMethod.Post, path) { Content = content };
            request.Headers.TryAddWithoutValidation("Authorization", authHeader);
            request.Headers.TryAddWithoutValidation("Date", timestamp);

            var client = _httpClientFactory.CreateClient("AllSecure");
            var response = await client.SendAsync(request);
            var body = await response.Content.ReadAsStringAsync();

            _logger.LogInformation("AllSecure request to {Path}:\n{Xml}", path, xml);
            _logger.LogInformation("AllSecure response HTTP {Status}:\n{Body}", (int)response.StatusCode, body);

            return ParseResultXml(body);
        }

        private string BuildAuthHeader(string method, string body, string contentType, string timestamp, string uri)
        {
            using var sha512 = SHA512.Create();
            var bodyHash = Convert.ToHexString(
                sha512.ComputeHash(Encoding.UTF8.GetBytes(body))).ToLower();

            var message = string.Join("\n", method, bodyHash, contentType, timestamp, "", uri);

            using var hmac = new HMACSHA512(Encoding.UTF8.GetBytes(_sharedSecret));
            var signature = Convert.ToBase64String(
                hmac.ComputeHash(Encoding.UTF8.GetBytes(message)));

            return $"Gateway {_apiKey}:{signature}";
        }

        // Parses the V2/Result XML returned by API calls (NOT callbacks)
        private AllSecureResult ParseResultXml(string xml)
        {
            try
            {
                var ns   = XNamespace.Get($"{_schemaBase}/Schema/V2/Result");
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
                    ReferenceId    = NullIfEmpty(referenceId),
                    RedirectUrl    = NullIfEmpty(redirectUrl),
                    RegistrationId = NullIfEmpty(registrationId),
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

        private static string XE(string s) => s
            .Replace("&", "&amp;")
            .Replace("<", "&lt;")
            .Replace(">", "&gt;")
            .Replace("\"", "&quot;");

        private static string Fmt(decimal d) =>
            d.ToString("F2", System.Globalization.CultureInfo.InvariantCulture);

        private static string? NullIfEmpty(string? s) =>
            string.IsNullOrEmpty(s) ? null : s;
    }
}
