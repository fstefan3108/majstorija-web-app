using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace WebProdavnica.Entities
{
    public class TimerFinishResult
    {
        public int ActualSeconds { get; set; }
        public decimal ActualPrice { get; set; }
        public string FormattedDuration { get; set; }
    }
}
