using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using WebProdavnica.Entities;

namespace WebProdavnica.DAL.Abstract
{
    public interface IJobOrderRepository
    {
        bool Add(JobOrder j);
        bool Delete(int id);
        JobOrder? Get(int id);
        List<JobOrder> GetAll();
        bool Update(JobOrder j);
        List<JobOrder> GetByCraftsmanId(int id);

        // Timer operations
        bool StartTimer(int jobId);
        bool PauseTimer(int jobId);
        bool ResumeTimer(int jobId);
        TimerFinishResult FinishTimer(int jobId);
        TimerState GetTimerState(int jobId);

        // Reschedule (two-party approval flow)
        bool ProposeReschedule(int jobId, DateTime proposedDate, TimeSpan proposedTime, string proposedBy);
        bool AcceptReschedule(int jobId);
        bool DeclineReschedule(int jobId);
    }
}
