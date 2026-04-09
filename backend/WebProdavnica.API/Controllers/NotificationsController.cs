using Microsoft.AspNetCore.Mvc;
using WebProdavnica.BusinessLayer.Abstract;
using WebProdavnica.BusinessLayer.Impl;

namespace WebProdavnica.API.Controllers
{
    [ApiController]
    [Route("api/notifications")]
    public class NotificationsController : ControllerBase
    {
        private readonly INotificationService _service;

        public NotificationsController(INotificationService service)
        {
            _service = service;
        }

        // GET /api/notifications?recipientId=5&recipientType=user&limit=50
        [HttpGet]
        public IActionResult Get([FromQuery] int recipientId, [FromQuery] string recipientType, [FromQuery] int limit = 50)
        {
            if (recipientType != "user" && recipientType != "craftsman")
                return BadRequest(new { success = false, message = "recipientType mora biti 'user' ili 'craftsman'." });

            var list = _service.GetForRecipient(recipientId, recipientType, limit);
            var unread = _service.GetUnreadCount(recipientId, recipientType);

            return Ok(new { success = true, unreadCount = unread, data = list });
        }

        // GET /api/notifications/unread-count?recipientId=5&recipientType=user
        [HttpGet("unread-count")]
        public IActionResult UnreadCount([FromQuery] int recipientId, [FromQuery] string recipientType)
        {
            var count = _service.GetUnreadCount(recipientId, recipientType);
            return Ok(new { success = true, count });
        }

        // PATCH /api/notifications/{id}/read
        [HttpPatch("{id}/read")]
        public IActionResult MarkRead(int id)
        {
            var ok = _service.MarkRead(id);
            return ok ? Ok(new { success = true }) : NotFound(new { success = false });
        }

        // PATCH /api/notifications/read-all?recipientId=5&recipientType=user
        [HttpPatch("read-all")]
        public IActionResult MarkAllRead([FromQuery] int recipientId, [FromQuery] string recipientType)
        {
            _service.MarkAllRead(recipientId, recipientType);
            return Ok(new { success = true });
        }

        // DELETE /api/notifications/{id}
        [HttpDelete("{id}")]
        public IActionResult Delete(int id)
        {
            // pretpostavljamo da INotificationRepository ima Delete(int id)
            bool ok = _service.Delete(id);
            return ok
                ? Ok(new { success = true })
                : NotFound(new { success = false });
        }
    }
}
