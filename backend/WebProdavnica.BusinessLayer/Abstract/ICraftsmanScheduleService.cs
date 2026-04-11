using System;
using System.Collections.Generic;
using WebProdavnica.DAL.Abstract;
using WebProdavnica.Entities;

namespace WebProdavnica.BusinessLayer.Abstract
{
    public interface ICraftsmanScheduleService
    {
        List<CraftsmanWeeklySchedule> GetSchedule(int craftsmanId);
        bool SaveSchedule(int craftsmanId, List<CraftsmanWeeklySchedule> schedule);
        List<CalendarJobSlot> GetCalendar(int craftsmanId, DateTime from, DateTime to);
        bool IsSlotAvailable(int craftsmanId, DateTime date, TimeSpan startTime, int durationHours);
    }
}
