using System;
using System.Collections.Generic;
using Microsoft.Data.SqlClient;
using WebProdavnica.Core.Constant;
using WebProdavnica.DAL.Abstract;
using WebProdavnica.Entities;

namespace WebProdavnica.DAL.Impl
{
    public class CraftsmanScheduleRepository : ICraftsmanScheduleRepository
    {
        // ── Nedeljni raspored ────────────────────────────────────────────────

        public List<CraftsmanWeeklySchedule> GetSchedule(int craftsmanId)
        {
            var list = new List<CraftsmanWeeklySchedule>();
            using var conn = new SqlConnection(DataBaseConstant.ConnectionString);
            conn.Open();
            var cmd = conn.CreateCommand();
            cmd.CommandText = @"
                SELECT schedule_id, craftsman_id, day_of_week, start_time, end_time, is_available
                FROM dbo.craftsman_weekly_schedule
                WHERE craftsman_id = @cid
                ORDER BY day_of_week";
            cmd.Parameters.AddWithValue("@cid", craftsmanId);
            using var r = cmd.ExecuteReader();
            while (r.Read())
            {
                list.Add(new CraftsmanWeeklySchedule
                {
                    ScheduleId   = r.GetInt32(0),
                    CraftsmanId  = r.GetInt32(1),
                    DayOfWeek    = r.GetByte(2),
                    StartTime    = r.GetTimeSpan(3),
                    EndTime      = r.GetTimeSpan(4),
                    IsAvailable  = r.GetBoolean(5),
                });
            }
            return list;
        }

        public bool SaveSchedule(int craftsmanId, List<CraftsmanWeeklySchedule> schedule)
        {
            using var conn = new SqlConnection(DataBaseConstant.ConnectionString);
            conn.Open();
            using var tx = conn.BeginTransaction();
            try
            {
                // Obrisi stari raspored
                var del = conn.CreateCommand();
                del.Transaction = tx;
                del.CommandText = "DELETE FROM dbo.craftsman_weekly_schedule WHERE craftsman_id = @cid";
                del.Parameters.AddWithValue("@cid", craftsmanId);
                del.ExecuteNonQuery();

                // Ubaci novi raspored
                foreach (var s in schedule)
                {
                    var ins = conn.CreateCommand();
                    ins.Transaction = tx;
                    ins.CommandText = @"
                        INSERT INTO dbo.craftsman_weekly_schedule
                            (craftsman_id, day_of_week, start_time, end_time, is_available)
                        VALUES (@cid, @dow, @st, @et, @ia)";
                    ins.Parameters.AddWithValue("@cid", craftsmanId);
                    ins.Parameters.AddWithValue("@dow", s.DayOfWeek);
                    ins.Parameters.AddWithValue("@st",  s.StartTime);
                    ins.Parameters.AddWithValue("@et",  s.EndTime);
                    ins.Parameters.AddWithValue("@ia",  s.IsAvailable);
                    ins.ExecuteNonQuery();
                }

                tx.Commit();
                return true;
            }
            catch { tx.Rollback(); return false; }
        }

        // ── Kalendarski slotovi (zakazani poslovi) ───────────────────────────

        public List<CalendarJobSlot> GetJobSlots(int craftsmanId, DateTime from, DateTime to)
        {
            var list = new List<CalendarJobSlot>();
            using var conn = new SqlConnection(DataBaseConstant.ConnectionString);
            conn.Open();
            var cmd = conn.CreateCommand();
            // Joinujemo job_requests (za title) i users (za ime klijenta i adresu/lokaciju)
            cmd.CommandText = @"
                SELECT
                    jo.job_id,
                    jo.scheduled_date,
                    COALESCE(jo.scheduled_time, CAST(jo.scheduled_date AS TIME)) AS effective_time,
                    jo.estimated_hours,
                    jo.estimated_minutes,
                    jo.status,
                    jr.title,
                    u.first_name,
                    u.last_name,
                    u.location
                FROM dbo.job_orders jo
                LEFT JOIN dbo.job_requests jr ON jr.request_id = jo.job_request_id
                LEFT JOIN dbo.users u ON u.user_id = jo.user_id
                WHERE jo.craftsman_id = @cid
                  AND CAST(jo.scheduled_date AS DATE) >= @from
                  AND CAST(jo.scheduled_date AS DATE) <= @to
                  AND jo.status NOT IN ('otkazano', 'Otkazano')
                ORDER BY jo.scheduled_date, effective_time";
            cmd.Parameters.AddWithValue("@cid",  craftsmanId);
            cmd.Parameters.AddWithValue("@from", from.Date);
            cmd.Parameters.AddWithValue("@to",   to.Date);

            using var r = cmd.ExecuteReader();
            while (r.Read())
            {
                var date        = r.GetDateTime(1);
                var startTime   = r.IsDBNull(2) ? TimeSpan.FromHours(8) : r.GetTimeSpan(2);
                var estHours    = r.IsDBNull(3) ? 1 : r.GetInt32(3);
                var estMinutes  = r.IsDBNull(4) ? 0 : r.GetInt32(4);
                var totalMins   = estHours * 60 + estMinutes;
                var endTime     = startTime.Add(TimeSpan.FromMinutes(totalMins < 60 ? 60 : totalMins));

                list.Add(new CalendarJobSlot
                {
                    JobId         = r.GetInt32(0),
                    Date          = date,
                    StartTime     = startTime,
                    EndTime       = endTime,
                    Status        = r.IsDBNull(5) ? null : r.GetString(5),
                    Title         = r.IsDBNull(6) ? null : r.GetString(6),
                    ClientName    = r.IsDBNull(7) || r.IsDBNull(8)
                                        ? null
                                        : $"{r.GetString(7)} {r.GetString(8)}",
                    ClientAddress = r.IsDBNull(9) ? null : r.GetString(9),
                });
            }
            return list;
        }

        // ── Provjera slobodnog slota ─────────────────────────────────────────

        public bool IsSlotAvailable(int craftsmanId, DateTime date, TimeSpan startTime, int durationHours)
        {
            var endTime = startTime.Add(TimeSpan.FromHours(durationHours < 1 ? 1 : durationHours));

            using var conn = new SqlConnection(DataBaseConstant.ConnectionString);
            conn.Open();
            var cmd = conn.CreateCommand();
            // COALESCE: koristi scheduled_time ako postoji, inace uzima vreme iz scheduled_date.
            // Time vrednosti poredimo kao CONVERT(DATETIME, ...) da izbegnemo type mismatch.
            cmd.CommandText = @"
                SELECT COUNT(1)
                FROM dbo.job_orders
                WHERE craftsman_id = @cid
                  AND CAST(scheduled_date AS DATE) = @date
                  AND status NOT IN ('otkazano', 'Otkazano')
                  AND COALESCE(scheduled_time, CAST(scheduled_date AS TIME)) < @end
                  AND DATEADD(MINUTE,
                        CASE WHEN estimated_hours * 60 + ISNULL(estimated_minutes,0) < 60
                             THEN 60
                             ELSE estimated_hours * 60 + ISNULL(estimated_minutes,0)
                        END,
                        CONVERT(DATETIME, COALESCE(scheduled_time, CAST(scheduled_date AS TIME))))
                      > CONVERT(DATETIME, @start)";
            cmd.Parameters.AddWithValue("@cid",   craftsmanId);
            cmd.Parameters.AddWithValue("@date",  date.Date);
            cmd.Parameters.AddWithValue("@start", startTime);
            cmd.Parameters.AddWithValue("@end",   endTime);

            var count = (int)cmd.ExecuteScalar();
            return count == 0;
        }
    }
}
