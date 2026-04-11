using System.Collections.Generic;
using WebProdavnica.Entities;

namespace WebProdavnica.DAL.Abstract
{
    public interface ICraftsmanScheduleRepository
    {
        /// <summary>Vraća nedeljni raspored za datog majstora (0-7 redova, jedan po danu).</summary>
        List<CraftsmanWeeklySchedule> GetSchedule(int craftsmanId);

        /// <summary>Upsert — postavlja kompletni nedeljni raspored (briše stare + dodaje nove).</summary>
        bool SaveSchedule(int craftsmanId, List<CraftsmanWeeklySchedule> schedule);

        /// <summary>
        /// Vraća listu zakazanih poslova majstora između from i to datuma.
        /// Sadrži i podatke o klijentu (ime, lokacija) za prikaz u kalendaru.
        /// </summary>
        List<CalendarJobSlot> GetJobSlots(int craftsmanId, DateTime from, DateTime to);

        /// <summary>Provera da li je vremenski slot slobodan (bez preklapanja sa postojećim poslovima).</summary>
        bool IsSlotAvailable(int craftsmanId, DateTime date, TimeSpan startTime, int durationHours);
    }

    /// <summary>DTO za prikaz zakazanog posla u kalendaru.</summary>
    public class CalendarJobSlot
    {
        public int JobId { get; set; }
        public DateTime Date { get; set; }
        public TimeSpan StartTime { get; set; }
        public TimeSpan EndTime { get; set; }
        public string? Title { get; set; }
        public string? ClientName { get; set; }
        public string? ClientAddress { get; set; }
        public string? Status { get; set; }
    }
}
