using Microsoft.AspNetCore.Mvc;
using WebProdavnica.API.Services;
using WebProdavnica.BusinessLayer.Abstract;
using WebProdavnica.BusinessLayer.Impl;

namespace WebProdavnica.API.Controllers
{
    [ApiController]
    [Route("api/notifications")]
    public class NotificationsController : ControllerBase
    {
        private readonly INotificationService _service;
        private readonly SseConnectionManager _sse;

        public NotificationsController(INotificationService service, SseConnectionManager sse)
        {
            _service = service;
            _sse = sse;
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
            bool ok = _service.Delete(id);
            return ok
                ? Ok(new { success = true })
                : NotFound(new { success = false });
        }

        // GET /api/notifications/stream?recipientId=5&recipientType=user
        [HttpGet("stream")]
        public async Task Stream([FromQuery] int recipientId, [FromQuery] string recipientType, CancellationToken ct)
        {
            if (recipientType != "user" && recipientType != "craftsman")
            {
                Response.StatusCode = 400;
                return;
            }

            Response.Headers["Content-Type"]  = "text/event-stream";
            Response.Headers["Cache-Control"] = "no-cache";
            Response.Headers["X-Accel-Buffering"] = "no";

            var (connectionId, reader) = _sse.Connect(recipientId, recipientType);
            try
            {
                using var heartbeatTimer = new PeriodicTimer(TimeSpan.FromSeconds(30));
                var heartbeatTask = Task.Run(async () =>
                {
                    while (!ct.IsCancellationRequested)
                    {
                        try
                        {
                            await heartbeatTimer.WaitForNextTickAsync(ct);
                            await Response.WriteAsync(": heartbeat\n\n", ct);
                            await Response.Body.FlushAsync(ct);
                        }
                        catch { break; }
                    }
                }, ct);

                await foreach (var json in reader.ReadAllAsync(ct))
                {
                    await Response.WriteAsync($"data: {json}\n\n", ct);
                    await Response.Body.FlushAsync(ct);
                }

                await heartbeatTask;
            }
            catch (OperationCanceledException) { }
            finally
            {
                _sse.Disconnect(recipientId, recipientType, connectionId);
            }
        }
    }
}
