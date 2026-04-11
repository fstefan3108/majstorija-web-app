using System;
using System.Collections.Generic;
using WebProdavnica.BusinessLayer.Abstract;
using WebProdavnica.DAL.Abstract;
using WebProdavnica.Entities;

namespace WebProdavnica.BusinessLayer.Impl
{
    public class CraftsmanScheduleService : ICraftsmanScheduleService
    {
        private readonly ICraftsmanScheduleRepository _repo;

        public CraftsmanScheduleService(ICraftsmanScheduleRepository repo)
        {
            _repo = repo;
        }

        public List<CraftsmanWeeklySchedule> GetSchedule(int craftsmanId)
            => _repo.GetSchedule(craftsmanId);

        public bool SaveSchedule(int craftsmanId, List<CraftsmanWeeklySchedule> schedule)
        {
            foreach (var s in schedule)
                s.CraftsmanId = craftsmanId;
            return _repo.SaveSchedule(craftsmanId, schedule);
        }

        public List<CalendarJobSlot> GetCalendar(int craftsmanId, DateTime from, DateTime to)
            => _repo.GetJobSlots(craftsmanId, from, to);

        public bool IsSlotAvailable(int craftsmanId, DateTime date, TimeSpan startTime, int durationHours)
            => _repo.IsSlotAvailable(craftsmanId, date, startTime, durationHours);
    }
}
