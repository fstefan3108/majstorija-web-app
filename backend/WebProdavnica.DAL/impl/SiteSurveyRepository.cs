using Microsoft.Data.SqlClient;
using WebProdavnica.Core.Constant;
using WebProdavnica.DAL.Abstract;
using WebProdavnica.Entities;

namespace WebProdavnica.DAL.Impl
{
    public class SiteSurveyRepository : ISiteSurveyRepository
    {
        private const string SelectColumns = @"
            ss.survey_id, ss.job_request_id, ss.user_id, ss.craftsman_id,
            ss.scheduled_date, ss.scheduled_time, ss.survey_price, ss.status,
            ss.reschedule_proposed_date, ss.reschedule_proposed_time, ss.reschedule_proposed_by,
            ss.created_at, jr.title, jr.description";

        private const string JoinClause = @"
            FROM dbo.site_surveys ss
            LEFT JOIN dbo.job_requests jr ON jr.request_id = ss.job_request_id";

        private static SiteSurvey Map(SqlDataReader r) => new SiteSurvey
        {
            SurveyId               = r.GetInt32(0),
            JobRequestId           = r.GetInt32(1),
            UserId                 = r.GetInt32(2),
            CraftsmanId            = r.GetInt32(3),
            ScheduledDate          = r.GetDateTime(4),
            ScheduledTime          = r.IsDBNull(5)  ? null : r.GetTimeSpan(5),
            SurveyPrice            = r.GetDecimal(6),
            Status                 = r.GetString(7),
            RescheduleProposedDate = r.IsDBNull(8)  ? null : r.GetDateTime(8),
            RescheduleProposedTime = r.IsDBNull(9)  ? null : r.GetTimeSpan(9),
            RescheduleProposedBy   = r.IsDBNull(10) ? null : r.GetString(10),
            CreatedAt              = r.GetDateTime(11),
            JobRequest             = new JobRequest
            {
                RequestId   = r.GetInt32(1),
                Title       = r.IsDBNull(12) ? string.Empty : r.GetString(12),
                Description = r.IsDBNull(13) ? string.Empty : r.GetString(13),
            },
        };

        public int Add(SiteSurvey survey)
        {
            using var conn = new SqlConnection(DataBaseConstant.ConnectionString);
            conn.Open();
            var cmd = conn.CreateCommand();
            cmd.CommandText = @"
                INSERT INTO dbo.site_surveys
                    (job_request_id, user_id, craftsman_id,
                     scheduled_date, scheduled_time, survey_price, status, created_at)
                OUTPUT INSERTED.survey_id
                VALUES (@jrid, @uid, @cid, @sd, @stime, @price, @status, GETUTCDATE())";

            cmd.Parameters.AddWithValue("@jrid",   survey.JobRequestId);
            cmd.Parameters.AddWithValue("@uid",    survey.UserId);
            cmd.Parameters.AddWithValue("@cid",    survey.CraftsmanId);
            cmd.Parameters.AddWithValue("@sd",     survey.ScheduledDate.Date);
            cmd.Parameters.AddWithValue("@stime",  survey.ScheduledTime.HasValue ? (object)survey.ScheduledTime.Value : DBNull.Value);
            cmd.Parameters.AddWithValue("@price",  survey.SurveyPrice);
            cmd.Parameters.AddWithValue("@status", survey.Status);

            var result = cmd.ExecuteScalar();
            if (result == null) throw new InvalidOperationException("Kreiranje izviđanja nije uspelo.");
            survey.SurveyId = Convert.ToInt32(result);
            return survey.SurveyId;
        }

        public SiteSurvey? Get(int surveyId)
        {
            using var conn = new SqlConnection(DataBaseConstant.ConnectionString);
            conn.Open();
            var cmd = conn.CreateCommand();
            cmd.CommandText = $"SELECT {SelectColumns} {JoinClause} WHERE ss.survey_id = @id";
            cmd.Parameters.AddWithValue("@id", surveyId);
            using var r = cmd.ExecuteReader();
            return r.Read() ? Map(r) : null;
        }

        public SiteSurvey? GetByJobRequest(int jobRequestId)
        {
            using var conn = new SqlConnection(DataBaseConstant.ConnectionString);
            conn.Open();
            var cmd = conn.CreateCommand();
            cmd.CommandText = $"SELECT TOP 1 {SelectColumns} {JoinClause} WHERE ss.job_request_id = @jrid ORDER BY ss.created_at DESC";
            cmd.Parameters.AddWithValue("@jrid", jobRequestId);
            using var r = cmd.ExecuteReader();
            return r.Read() ? Map(r) : null;
        }

        public List<SiteSurvey> GetByUser(int userId)
        {
            var list = new List<SiteSurvey>();
            using var conn = new SqlConnection(DataBaseConstant.ConnectionString);
            conn.Open();
            var cmd = conn.CreateCommand();
            cmd.CommandText = $"SELECT {SelectColumns} {JoinClause} WHERE ss.user_id = @uid ORDER BY ss.scheduled_date DESC";
            cmd.Parameters.AddWithValue("@uid", userId);
            using var r = cmd.ExecuteReader();
            while (r.Read()) list.Add(Map(r));
            return list;
        }

        public List<SiteSurvey> GetByCraftsman(int craftsmanId)
        {
            var list = new List<SiteSurvey>();
            using var conn = new SqlConnection(DataBaseConstant.ConnectionString);
            conn.Open();
            var cmd = conn.CreateCommand();
            cmd.CommandText = $"SELECT {SelectColumns} {JoinClause} WHERE ss.craftsman_id = @cid ORDER BY ss.scheduled_date DESC";
            cmd.Parameters.AddWithValue("@cid", craftsmanId);
            using var r = cmd.ExecuteReader();
            while (r.Read()) list.Add(Map(r));
            return list;
        }

        public bool UpdateStatus(int surveyId, string newStatus)
        {
            using var conn = new SqlConnection(DataBaseConstant.ConnectionString);
            conn.Open();
            var cmd = conn.CreateCommand();
            cmd.CommandText = "UPDATE dbo.site_surveys SET status = @status WHERE survey_id = @id";
            cmd.Parameters.AddWithValue("@status", newStatus);
            cmd.Parameters.AddWithValue("@id",     surveyId);
            return cmd.ExecuteNonQuery() > 0;
        }

        public bool ProposeReschedule(int surveyId, DateTime proposedDate, TimeSpan proposedTime, string proposedBy)
        {
            using var conn = new SqlConnection(DataBaseConstant.ConnectionString);
            conn.Open();
            var cmd = conn.CreateCommand();
            cmd.CommandText = @"
                UPDATE dbo.site_surveys
                SET reschedule_proposed_date = @date,
                    reschedule_proposed_time = @time,
                    reschedule_proposed_by   = @by
                WHERE survey_id = @id
                  AND status = 'zakazano'
                  AND reschedule_proposed_by IS NULL";
            cmd.Parameters.AddWithValue("@date", proposedDate.Date);
            cmd.Parameters.AddWithValue("@time", proposedTime);
            cmd.Parameters.AddWithValue("@by",   proposedBy);
            cmd.Parameters.AddWithValue("@id",   surveyId);
            return cmd.ExecuteNonQuery() > 0;
        }

        public bool AcceptReschedule(int surveyId)
        {
            using var conn = new SqlConnection(DataBaseConstant.ConnectionString);
            conn.Open();
            var cmd = conn.CreateCommand();
            cmd.CommandText = @"
                UPDATE dbo.site_surveys
                SET scheduled_date           = reschedule_proposed_date,
                    scheduled_time           = reschedule_proposed_time,
                    reschedule_proposed_date = NULL,
                    reschedule_proposed_time = NULL,
                    reschedule_proposed_by   = NULL
                WHERE survey_id = @id
                  AND reschedule_proposed_by IS NOT NULL";
            cmd.Parameters.AddWithValue("@id", surveyId);
            return cmd.ExecuteNonQuery() > 0;
        }

        public bool DeclineReschedule(int surveyId)
        {
            // Odbijanje pomeranja termina otkazuje izviđanje (isto kao kod job order-a)
            using var conn = new SqlConnection(DataBaseConstant.ConnectionString);
            conn.Open();
            var cmd = conn.CreateCommand();
            cmd.CommandText = @"
                UPDATE dbo.site_surveys
                SET status                 = 'otkazano',
                    reschedule_proposed_date = NULL,
                    reschedule_proposed_time = NULL,
                    reschedule_proposed_by   = NULL
                WHERE survey_id = @id
                  AND reschedule_proposed_by IS NOT NULL";
            cmd.Parameters.AddWithValue("@id", surveyId);
            return cmd.ExecuteNonQuery() > 0;
        }

        public List<SiteSurvey> GetOverdueForAutoDecline()
        {
            // Zakazani survey-i čiji je datum + 2 dana prošao (majstor nije reagovao)
            var list = new List<SiteSurvey>();
            using var conn = new SqlConnection(DataBaseConstant.ConnectionString);
            conn.Open();
            var cmd = conn.CreateCommand();
            cmd.CommandText = $@"
                SELECT {SelectColumns} {JoinClause}
                WHERE ss.status = 'zakazano'
                  AND DATEADD(day, 2, ss.scheduled_date) < GETUTCDATE()";
            using var r = cmd.ExecuteReader();
            while (r.Read()) list.Add(Map(r));
            return list;
        }
    }
}
