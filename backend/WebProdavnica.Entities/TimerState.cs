using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace WebProdavnica.Entities
{
    public class TimerState
    {
        public int AccumulatedSeconds { get; set; }
        public DateTime? CurrentIntervalStartedAt { get; set; }
        public bool IsActive => CurrentIntervalStartedAt.HasValue;
    }
}
