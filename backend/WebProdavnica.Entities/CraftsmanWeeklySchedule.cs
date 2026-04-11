using System;

namespace WebProdavnica.Entities
{
    /// <summary>
    /// Nedeljni raspored majstora — po danu u nedelji.
    /// DayOfWeek: 1=Ponedeljak, 2=Utorak, 3=Sreda, 4=Četvrtak, 5=Petak, 6=Subota, 0=Nedelja
    /// </summary>
    public class CraftsmanWeeklySchedule
    {
        public int ScheduleId { get; set; }
        public int CraftsmanId { get; set; }
        public int DayOfWeek { get; set; }   // 0=Nedelja, 1=Pon, 2=Uto, 3=Sre, 4=Čet, 5=Pet, 6=Sub
        public TimeSpan StartTime { get; set; }
        public TimeSpan EndTime { get; set; }
        public bool IsAvailable { get; set; }
    }
}
