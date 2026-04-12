using Microsoft.AspNetCore.Mvc;
using WebProdavnica.BusinessLayer.Abstract;
using WebProdavnica.Entities;

namespace WebProdavnica.API.Controllers
{
    [ApiController]
    [Route("api/chat")]
    public class ChatController : ControllerBase
    {
        private readonly IChatService _chatService;
        private readonly IJobOrderService _jobOrderService;
        private readonly IJobRequestService _jobRequestService;

        public ChatController(
            IChatService chatService,
            IJobOrderService jobOrderService,
            IJobRequestService jobRequestService)
        {
            _chatService = chatService;
            _jobOrderService = jobOrderService;
            _jobRequestService = jobRequestService;
        }

        // GET: api/chat/can-chat/{userId}/{craftsmanId}
        // Proverava da li je 24h refund period istekao za najnoviji zajednički posao.
        [HttpGet("can-chat/{userId}/{craftsmanId}")]
        public IActionResult CanChat(int userId, int craftsmanId)
        {
            var job = _jobOrderService.GetAll()
                .Where(j => j.UserId == userId
                         && j.CraftsmanId == craftsmanId
                         && !string.Equals(j.Status, "Otkazano", StringComparison.OrdinalIgnoreCase))
                .OrderByDescending(j => j.JobId)
                .FirstOrDefault();

            if (job == null)
                return Ok(new { canChat = false, reason = "no_job", unlocksAt = (DateTime?)null });

            if (!job.JobRequestId.HasValue)
                return Ok(new { canChat = true, unlocksAt = (DateTime?)null });

            var jobRequest = _jobRequestService.Get(job.JobRequestId.Value);
            if (jobRequest == null)
                return Ok(new { canChat = true, unlocksAt = (DateTime?)null });

            var unlocksAt = jobRequest.CreatedAt.AddHours(24);
            var canChat = DateTime.UtcNow >= unlocksAt;

            return Ok(new
            {
                canChat,
                reason = canChat ? "ok" : "refund_window",
                unlocksAt = canChat ? (DateTime?)null : unlocksAt,
            });
        }

        // GET: api/chat/user/{userId} — sve poruke za usera
        [HttpGet("user/{userId}")]
        public async Task<IActionResult> GetByUser(int userId)
        {
            var chats = await _chatService.GetChatsByUserIdAsync(userId);
            return Ok(new { success = true, data = chats });
        }

        // GET: api/chat/craftsman/{craftsmanId} — sve poruke za majstora
        [HttpGet("craftsman/{craftsmanId}")]
        public async Task<IActionResult> GetByCraftsman(int craftsmanId)
        {
            var chats = await _chatService.GetChatsByCraftsmanIdAsync(craftsmanId);
            return Ok(new { success = true, data = chats });
        }

        // GET: api/chat/conversation/{userId}/{craftsmanId} — poruke između usera i majstora
        [HttpGet("conversation/{userId}/{craftsmanId}")]
        public async Task<IActionResult> GetConversation(int userId, int craftsmanId)
        {
            var chats = await _chatService.GetConversationAsync(userId, craftsmanId);
            return Ok(new { success = true, data = chats });
        }

        // POST: api/chat — slanje poruke
        [HttpPost]
        public async Task<IActionResult> SendMessage([FromBody] SendMessageRequest request)
        {
            // Provjeri 24h window — ista logika kao CanChat
            var job = _jobOrderService.GetAll()
                .Where(j => j.UserId == request.UserId
                         && j.CraftsmanId == request.CraftsmanId
                         && !string.Equals(j.Status, "Otkazano", StringComparison.OrdinalIgnoreCase))
                .OrderByDescending(j => j.JobId)
                .FirstOrDefault();

            if (job == null)
                return BadRequest(new { success = false, message = "Ne možete slati poruke bez aktivnog posla." });

            if (job.JobRequestId.HasValue)
            {
                var jobRequest = _jobRequestService.Get(job.JobRequestId.Value);
                if (jobRequest != null && DateTime.UtcNow < jobRequest.CreatedAt.AddHours(24))
                    return BadRequest(new { success = false, message = "Chat je dostupan tek nakon isteka 24-časovnog perioda od zakazivanja." });
            }

            var chat = new Chat
            {
                Message = request.Message,
                UserId = request.UserId,
                CraftsmanId = request.CraftsmanId,
                SenderType = request.SenderType
            };
            var result = await _chatService.SendMessageAsync(chat);
            return Ok(new { success = true, data = result });
        }

        // PUT: api/chat/read/{userId}/{craftsmanId}?readerRole=user — oznaci poruke kao procitane
        [HttpPut("read/{userId}/{craftsmanId}")]
        public async Task<IActionResult> MarkAsRead(int userId, int craftsmanId, [FromQuery] string readerRole = "user")
        {
            await _chatService.MarkAsReadAsync(userId, craftsmanId, readerRole);
            return Ok(new { success = true });
        }
    }

    public class SendMessageRequest
    {
        public string Message { get; set; } = string.Empty;
        public int UserId { get; set; }
        public int CraftsmanId { get; set; }
        public string SenderType { get; set; } = "user"; // "user" ili "craftsman"
    }
}