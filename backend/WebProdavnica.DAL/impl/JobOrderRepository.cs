using Microsoft.Data.SqlClient;
using WebProdavnica.Core.Constant;
using WebProdavnica.DAL.Abstract;
using WebProdavnica.Entities;

namespace WebProdavnica.DAL.Impl
{
    public class JobOrderRepository : IJobOrderRepository
    {
        // Explicit column list used in every SELECT — never use SELECT * to avoid column-order fragility.
        private const string SelectColumns = @"
            job_id, scheduled_date, job_description, status, urgent,
            total_price, user_id, craftsman_id, hourly_rate, estimated_hours,
            started_at, ended_at, actual_seconds";

        // Indices match SelectColumns above (0-based).
        private static JobOrder Map(SqlDataReader r) => new JobOrder
        {
            JobId          = r.GetInt32(0),
            ScheduledDate  = r.GetDateTime(1),
            JobDescription = r.IsDBNull(2)  ? null : r.GetString(2),
            Status         = r.IsDBNull(3)  ? null : r.GetString(3),
            Urgent         = r.GetBoolean(4),
            TotalPrice     = r.GetDecimal(5),
            UserId         = r.GetInt32(6),
            CraftsmanId    = r.GetInt32(7),
            HourlyRate     = r.IsDBNull(8)  ? 0    : r.GetDecimal(8),
            EstimatedHours = r.IsDBNull(9)  ? 0    : r.GetInt32(9),
            StartedAt      = r.IsDBNull(10) ? null : r.GetDateTime(10),
            EndedAt        = r.IsDBNull(11) ? null : r.GetDateTime(11),
            ActualSeconds  = r.IsDBNull(12) ? null : r.GetInt32(12),
        };

        // ── CRUD ──────────────────────────────────────────────────────────────
        public bool Add(JobOrder j)
        {
            using var conn = new SqlConnection(DataBaseConstant.ConnectionString);
            conn.Open();
            var cmd = conn.CreateCommand();
            cmd.CommandText = @"
                INSERT INTO dbo.job_orders
                    (scheduled_date, job_description, status, urgent, total_price,
                     user_id, craftsman_id, hourly_rate, estimated_hours)
                OUTPUT INSERTED.job_id
                VALUES (@sd, @jd, @st, @u, @tp, @uid, @cid, @hr, @eh)";

            cmd.Parameters.AddWithValue("@sd", j.ScheduledDate);
            cmd.Parameters.AddWithValue("@jd", j.JobDescription ?? (object)DBNull.Value);
            cmd.Parameters.AddWithValue("@st", j.Status ?? (object)DBNull.Value);
            cmd.Parameters.AddWithValue("@u", j.Urgent);
            cmd.Parameters.AddWithValue("@tp", j.TotalPrice);
            cmd.Parameters.AddWithValue("@uid", j.UserId);
            cmd.Parameters.AddWithValue("@cid", j.CraftsmanId);
            cmd.Parameters.AddWithValue("@hr", j.HourlyRate);
            cmd.Parameters.AddWithValue("@eh", j.EstimatedHours);

            var newId = cmd.ExecuteScalar();
            if (newId == null) return false;
            j.JobId = Convert.ToInt32(newId);
            return true;
        }

        public bool Delete(int id)
        {
            using var conn = new SqlConnection(DataBaseConstant.ConnectionString);
            conn.Open();
            var cmd = conn.CreateCommand();
            cmd.CommandText = "DELETE FROM dbo.job_orders WHERE job_id=@id";
            cmd.Parameters.AddWithValue("@id", id);
            return cmd.ExecuteNonQuery() > 0;
        }

        public JobOrder? Get(int id)
        {
            using var conn = new SqlConnection(DataBaseConstant.ConnectionString);
            conn.Open();
            var cmd = conn.CreateCommand();
            cmd.CommandText = $"SELECT {SelectColumns} FROM dbo.job_orders WHERE job_id=@id";
            cmd.Parameters.AddWithValue("@id", id);
            var r = cmd.ExecuteReader();
            return r.Read() ? Map(r) : null;
        }

        public List<JobOrder> GetAll()
        {
            using var conn = new SqlConnection(DataBaseConstant.ConnectionString);
            conn.Open();
            var cmd = conn.CreateCommand();
            cmd.CommandText = $"SELECT {SelectColumns} FROM dbo.job_orders";
            var r = cmd.ExecuteReader();
            var list = new List<JobOrder>();
            while (r.Read()) list.Add(Map(r));
            return list;
        }

        public bool Update(JobOrder j)
        {
            using var conn = new SqlConnection(DataBaseConstant.ConnectionString);
            conn.Open();
            var cmd = conn.CreateCommand();
            cmd.CommandText = @"
                UPDATE dbo.job_orders
                SET scheduled_date=@sd,
                    job_description=@jd,
                    status=@st,
                    urgent=@u,
                    total_price=@tp,
                    hourly_rate=@hr,
                    estimated_hours=@eh,
                    started_at=@sa,
                    ended_at=@ea,
                    actual_seconds=@as
                WHERE job_id=@id";
            cmd.Parameters.AddWithValue("@sd", j.ScheduledDate);
            cmd.Parameters.AddWithValue("@jd", j.JobDescription ?? (object)DBNull.Value);
            cmd.Parameters.AddWithValue("@st", j.Status ?? (object)DBNull.Value);
            cmd.Parameters.AddWithValue("@u", j.Urgent);
            cmd.Parameters.AddWithValue("@tp", j.TotalPrice);
            cmd.Parameters.AddWithValue("@hr", j.HourlyRate);
            cmd.Parameters.AddWithValue("@eh", j.EstimatedHours);
            cmd.Parameters.AddWithValue("@sa", j.StartedAt ?? (object)DBNull.Value);
            cmd.Parameters.AddWithValue("@ea", j.EndedAt ?? (object)DBNull.Value);
            cmd.Parameters.AddWithValue("@as", j.ActualSeconds ?? (object)DBNull.Value);
            cmd.Parameters.AddWithValue("@id", j.JobId);
            return cmd.ExecuteNonQuery() > 0;
        }

        public List<JobOrder> GetByCraftsmanId(int id)
        {
            using var conn = new SqlConnection(DataBaseConstant.ConnectionString);
            conn.Open();
            var cmd = conn.CreateCommand();
            cmd.CommandText = $"SELECT {SelectColumns} FROM dbo.job_orders WHERE craftsman_id=@cid";
            cmd.Parameters.AddWithValue("@cid", id);
            var r = cmd.ExecuteReader();
            var list = new List<JobOrder>();
            while (r.Read()) list.Add(Map(r));
            return list;
        }

        // ── Timer operations ──────────────────────────────────────────────────
        public bool StartTimer(int jobId)
        {
            using var conn = new SqlConnection(DataBaseConstant.ConnectionString);
            conn.Open();
            using var tx = conn.BeginTransaction();
            try
            {
                // Record started_at on job (only if not already started)
                var c1 = conn.CreateCommand();
                c1.Transaction = tx;
                c1.CommandText = @"UPDATE dbo.job_orders
                    SET started_at = GETUTCDATE()
                    WHERE job_id = @id AND started_at IS NULL";
                c1.Parameters.AddWithValue("@id", jobId);
                c1.ExecuteNonQuery();

                // Insert first interval
                var c2 = conn.CreateCommand();
                c2.Transaction = tx;
                c2.CommandText = @"INSERT INTO dbo.job_intervals (job_id, started_at)
                    VALUES (@id, GETUTCDATE())";
                c2.Parameters.AddWithValue("@id", jobId);
                c2.ExecuteNonQuery();

                tx.Commit();
                return true;
            }
            catch { tx.Rollback(); return false; }
        }

        public bool PauseTimer(int jobId)
        {
            using var conn = new SqlConnection(DataBaseConstant.ConnectionString);
            conn.Open();
            using var tx = conn.BeginTransaction();
            try
            {
                var c1 = conn.CreateCommand();
                c1.Transaction = tx;
                c1.CommandText = @"UPDATE dbo.job_intervals
                    SET ended_at = GETUTCDATE()
                    WHERE job_id = @id AND ended_at IS NULL";
                c1.Parameters.AddWithValue("@id", jobId);
                c1.ExecuteNonQuery();

                var c2 = conn.CreateCommand();
                c2.Transaction = tx;
                c2.CommandText = "UPDATE dbo.job_orders SET status = 'Pauzirano' WHERE job_id = @id";
                c2.Parameters.AddWithValue("@id", jobId);
                c2.ExecuteNonQuery();

                tx.Commit();
                return true;
            }
            catch { tx.Rollback(); return false; }
        }

        public bool ResumeTimer(int jobId)
        {
            using var conn = new SqlConnection(DataBaseConstant.ConnectionString);
            conn.Open();
            using var tx = conn.BeginTransaction();
            try
            {
                var c1 = conn.CreateCommand();
                c1.Transaction = tx;
                c1.CommandText = @"INSERT INTO dbo.job_intervals (job_id, started_at)
                    VALUES (@id, GETUTCDATE())";
                c1.Parameters.AddWithValue("@id", jobId);
                c1.ExecuteNonQuery();

                var c2 = conn.CreateCommand();
                c2.Transaction = tx;
                c2.CommandText = "UPDATE dbo.job_orders SET status = 'U toku' WHERE job_id = @id";
                c2.Parameters.AddWithValue("@id", jobId);
                c2.ExecuteNonQuery();

                tx.Commit();
                return true;
            }
            catch { tx.Rollback(); return false; }
        }

        public TimerFinishResult FinishTimer(int jobId)
        {
            using var conn = new SqlConnection(DataBaseConstant.ConnectionString);
            conn.Open();
            using var tx = conn.BeginTransaction();
            try
            {
                // Close any open interval
                var c1 = conn.CreateCommand();
                c1.Transaction = tx;
                c1.CommandText = @"UPDATE dbo.job_intervals
                    SET ended_at = GETUTCDATE()
                    WHERE job_id = @id AND ended_at IS NULL";
                c1.Parameters.AddWithValue("@id", jobId);
                c1.ExecuteNonQuery();

                // Sum all interval durations + get hourly rate
                var c2 = conn.CreateCommand();
                c2.Transaction = tx;
                c2.CommandText = @"
                    SELECT
                        ISNULL(SUM(DATEDIFF(second, i.started_at, i.ended_at)), 0),
                        j.hourly_rate
                    FROM dbo.job_intervals i
                    JOIN dbo.job_orders j ON j.job_id = i.job_id
                    WHERE i.job_id = @id";
                c2.Parameters.AddWithValue("@id", jobId);
                var r = c2.ExecuteReader();
                r.Read();
                int actualSeconds = r.GetInt32(0);
                decimal hourlyRate = r.GetDecimal(1);
                r.Close();

                decimal actualPrice = Math.Round(hourlyRate * (actualSeconds / 3600.0m), 2);

                // Update job with final values
                var c3 = conn.CreateCommand();
                c3.Transaction = tx;
                c3.CommandText = @"
                    UPDATE dbo.job_orders
                    SET ended_at = GETUTCDATE(),
                        actual_seconds = @sec,
                        total_price    = @price,
                        status         = 'Ceka potvrdu'
                    WHERE job_id = @id";
                c3.Parameters.AddWithValue("@sec", actualSeconds);
                c3.Parameters.AddWithValue("@price", actualPrice);
                c3.Parameters.AddWithValue("@id", jobId);
                c3.ExecuteNonQuery();

                tx.Commit();

                int h = actualSeconds / 3600;
                int m = (actualSeconds % 3600) / 60;
                string duration = h > 0 ? $"{h}h {m}min" : $"{m}min";

                return new TimerFinishResult
                {
                    ActualSeconds = actualSeconds,
                    ActualPrice = actualPrice,
                    FormattedDuration = duration,
                };
            }
            catch { tx.Rollback(); throw; }
        }

        public TimerState GetTimerState(int jobId)
        {
            using var conn = new SqlConnection(DataBaseConstant.ConnectionString);
            conn.Open();

            // Accumulated seconds from all closed intervals
            var c1 = conn.CreateCommand();
            c1.CommandText = @"
                SELECT ISNULL(SUM(DATEDIFF(second, started_at, ended_at)), 0)
                FROM dbo.job_intervals
                WHERE job_id = @id AND ended_at IS NOT NULL";
            c1.Parameters.AddWithValue("@id", jobId);
            int accumulated = (int)c1.ExecuteScalar();

            // Start time of the currently open interval (null = paused or not started)
            var c2 = conn.CreateCommand();
            c2.CommandText = @"
                SELECT TOP 1 started_at
                FROM dbo.job_intervals
                WHERE job_id = @id AND ended_at IS NULL";
            c2.Parameters.AddWithValue("@id", jobId);
            var raw = c2.ExecuteScalar();

            return new TimerState
            {
                AccumulatedSeconds = accumulated,
                CurrentIntervalStartedAt = (raw == null || raw == DBNull.Value)
                                           ? null
                                           : (DateTime?)Convert.ToDateTime(raw),
            };
        }
    }
}