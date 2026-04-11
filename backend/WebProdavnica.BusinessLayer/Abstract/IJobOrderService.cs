using WebProdavnica.Entities;

namespace WebProdavnica.BusinessLayer.Abstract
{
    public interface IJobOrderService
    {
        bool Add(JobOrder j);
        bool Delete(int id);
        JobOrder? Get(int id);
        List<JobOrder> GetAll();
        bool Update(JobOrder j);

        bool StartTimer(int jobId);
        bool PauseTimer(int jobId);
        bool ResumeTimer(int jobId);
        TimerFinishResult FinishTimer(int jobId);
        TimerState GetTimerState(int jobId);
        bool Reschedule(int jobId, DateTime newDate, TimeSpan newTime);
    }
}