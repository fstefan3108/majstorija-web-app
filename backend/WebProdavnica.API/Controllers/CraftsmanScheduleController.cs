using Microsoft.AspNetCore.Mvc;
using WebProdavnica.BusinessLayer.Abstract;
using WebProdavnica.Entities;

namespace WebProdavnica.API.Controllers
{
    [ApiController]
    [Route("api/craftsmen/{craftsmanId}/schedule")]
    public class CraftsmanScheduleController : ControllerBase
    {
        private readonly ICraftsmanScheduleService _scheduleService;

        public CraftsmanScheduleController(ICraftsmanScheduleService scheduleService)
        {
            _scheduleService = scheduleService;
        }

        // GET /api/craftsmen/{id}/schedule
        // Vraća nedeljni raspored (koji dani su radni, u kom periodu)
        [HttpGet]
        public IActionResult GetSchedule(int craftsmanId)
        {
            try
            {
                var schedule = _scheduleService.GetSchedule(craftsmanId);
                return Ok(new { success = true, data = schedule });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, error = ex.Message });
            }
        }

        // PUT /api/craftsmen/{id}/schedule
        // Majstor postavlja nedeljni raspored (zamenjuje stari)
        [HttpPut]
        public IActionResult SaveSchedule(int craftsmanId, [FromBody] List<ScheduleDayRequest> days)
        {
            try
            {
                if (days == null || days.Count == 0)
                    return BadRequest(new { success = false, message = "Raspored je prazan." });

                var schedule = days.Select(d => new CraftsmanWeeklySchedule
                {
                    CraftsmanId = craftsmanId,
                    DayOfWeek   = d.DayOfWeek,
                    StartTime   = TimeSpan.Parse(d.StartTime),
                    EndTime     = TimeSpan.Parse(d.EndTime),
                    IsAvailable = d.IsAvailable,
                }).ToList();

                bool ok = _scheduleService.SaveSchedule(craftsmanId, schedule);
                if (ok)
                    return Ok(new { success = true, message = "Raspored sačuvan." });

                return BadRequest(new { success = false, message = "Snimanje rasporeda nije uspelo." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, error = ex.Message });
            }
        }

        // GET /api/craftsmen/{id}/schedule/calendar?from=2025-01-01&to=2025-01-31
        // Vraća kombinovane podatke: nedeljni raspored + zakazani poslovi u opsegu datuma
        [HttpGet("calendar")]
        public IActionResult GetCalendar(int craftsmanId, [FromQuery] string from, [FromQuery] string to)
        {
            try
            {
                if (!DateTime.TryParse(from, out var fromDate))
                    fromDate = DateTime.Today;
                if (!DateTime.TryParse(to, out var toDate))
                    toDate = fromDate.AddDays(30);

                var weeklySchedule = _scheduleService.GetSchedule(craftsmanId);
                var jobSlots       = _scheduleService.GetCalendar(craftsmanId, fromDate, toDate);

                return Ok(new
                {
                    success = true,
                    data = new
                    {
                        weeklySchedule,
                        jobSlots = jobSlots.Select(s => new
                        {
                            s.JobId,
                            date          = s.Date.ToString("yyyy-MM-dd"),
                            startTime     = s.StartTime.ToString(@"hh\:mm"),
                            endTime       = s.EndTime.ToString(@"hh\:mm"),
                            s.Title,
                            s.ClientName,
                            s.ClientAddress,
                            s.Status,
                        })
                    }
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, error = ex.Message });
            }
        }

        // GET /api/craftsmen/{id}/schedule/available?date=2025-01-15
        // Vraća slobodne sate za određeni dan (za ContactModal)
        [HttpGet("available")]
        public IActionResult GetAvailableSlots(int craftsmanId, [FromQuery] string date, [FromQuery] int durationHours = 1)
        {
            try
            {
                if (!DateTime.TryParse(date, out var targetDate))
                    return BadRequest(new { success = false, message = "Neispravan datum." });

                var dow      = (int)targetDate.DayOfWeek; // 0=Nedelja, 1=Pon...
                var schedule = _scheduleService.GetSchedule(craftsmanId);
                var daySchedule = schedule.FirstOrDefault(s => s.DayOfWeek == dow);

                if (daySchedule == null || !daySchedule.IsAvailable)
                    return Ok(new { success = true, available = false, slots = Array.Empty<string>() });

                // Generiši sate od StartTime do EndTime - durationHours
                var slots = new List<string>();
                var cursor = daySchedule.StartTime;
                var limit  = daySchedule.EndTime - TimeSpan.FromHours(durationHours);

                while (cursor <= limit)
                {
                    bool free = _scheduleService.IsSlotAvailable(craftsmanId, targetDate, cursor, durationHours);
                    if (free)
                        slots.Add(cursor.ToString(@"hh\:mm"));
                    cursor = cursor.Add(TimeSpan.FromHours(1));
                }

                return Ok(new { success = true, available = slots.Count > 0, slots });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, error = ex.Message });
            }
        }
    }

    public class ScheduleDayRequest
    {
        public int DayOfWeek { get; set; }
        public string StartTime { get; set; } = "08:00";
        public string EndTime { get; set; } = "17:00";
        public bool IsAvailable { get; set; }
    }
}
