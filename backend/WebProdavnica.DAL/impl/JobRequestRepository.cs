using Microsoft.Data.SqlClient;
using WebProdavnica.Core.Constant;
using WebProdavnica.DAL.Abstract;
using WebProdavnica.Entities;

namespace WebProdavnica.DAL.Impl
{
    public class JobRequestRepository : IJobRequestRepository
    {
        private static JobRequest Map(SqlDataReader r) => new JobRequest
        {
            RequestId        = r.GetInt32(0),
            Title            = r.GetString(1),
            Description      = r.GetString(2),
            ScheduledDate    = r.GetDateTime(3),
            Status           = r.GetString(4),
            Urgent           = r.GetBoolean(5),
            UserId           = r.GetInt32(6),
            CraftsmanId      = r.GetInt32(7),
            EstimatedMinutes = r.IsDBNull(8)  ? null : r.GetInt32(8),
            EstimatedPrice   = r.IsDBNull(9)  ? null : r.GetDecimal(9),
            JobOrderId       = r.IsDBNull(10) ? null : r.GetInt32(10),
            CreatedAt        = r.GetDateTime(11),
            UpdatedAt        = r.GetDateTime(12),
        };

        public int Add(JobRequest req)
        {
            using var conn = new SqlConnection(DataBaseConstant.ConnectionString);
            conn.Open();
            var cmd = conn.CreateCommand();
            cmd.CommandText = @"
                INSERT INTO dbo.job_requests
                    (title, description, scheduled_date, status, urgent, user_id, craftsman_id)
                OUTPUT INSERTED.request_id
                VALUES (@t, @d, @sd, 'pending', @u, @uid, @cid)";
            cmd.Parameters.AddWithValue("@t",   req.Title);
            cmd.Parameters.AddWithValue("@d",   req.Description);
            cmd.Parameters.AddWithValue("@sd",  req.ScheduledDate);
            cmd.Parameters.AddWithValue("@u",   req.Urgent);
            cmd.Parameters.AddWithValue("@uid", req.UserId);
            cmd.Parameters.AddWithValue("@cid", req.CraftsmanId);
            var id = cmd.ExecuteScalar();
            return Convert.ToInt32(id);
        }

        public JobRequest? Get(int id)
        {
            using var conn = new SqlConnection(DataBaseConstant.ConnectionString);
            conn.Open();
            var cmd = conn.CreateCommand();
            cmd.CommandText = @"
                SELECT request_id, title, description, scheduled_date, status, urgent,
                       user_id, craftsman_id, estimated_minutes, estimated_price,
                       job_order_id, created_at, updated_at
                FROM dbo.job_requests WHERE request_id = @id";
            cmd.Parameters.AddWithValue("@id", id);
            using var r = cmd.ExecuteReader();
            if (!r.Read()) return null;
            var req = Map(r);
            r.Close();
            req.ImagePaths = GetImages(id);
            return req;
        }

        public List<JobRequest> GetByUser(int userId)
        {
            using var conn = new SqlConnection(DataBaseConstant.ConnectionString);
            conn.Open();
            var cmd = conn.CreateCommand();
            cmd.CommandText = @"
                SELECT request_id, title, description, scheduled_date, status, urgent,
                       user_id, craftsman_id, estimated_minutes, estimated_price,
                       job_order_id, created_at, updated_at
                FROM dbo.job_requests
                WHERE user_id = @uid
                ORDER BY created_at DESC";
            cmd.Parameters.AddWithValue("@uid", userId);
            using var r = cmd.ExecuteReader();
            var list = new List<JobRequest>();
            while (r.Read()) list.Add(Map(r));
            r.Close();
            foreach (var req in list)
                req.ImagePaths = GetImages(req.RequestId);
            return list;
        }

        public List<JobRequest> GetByCraftsman(int craftsmanId)
        {
            using var conn = new SqlConnection(DataBaseConstant.ConnectionString);
            conn.Open();
            var cmd = conn.CreateCommand();
            cmd.CommandText = @"
                SELECT request_id, title, description, scheduled_date, status, urgent,
                       user_id, craftsman_id, estimated_minutes, estimated_price,
                       job_order_id, created_at, updated_at
                FROM dbo.job_requests
                WHERE craftsman_id = @cid
                ORDER BY created_at DESC";
            cmd.Parameters.AddWithValue("@cid", craftsmanId);
            using var r = cmd.ExecuteReader();
            var list = new List<JobRequest>();
            while (r.Read()) list.Add(Map(r));
            r.Close();
            foreach (var req in list)
                req.ImagePaths = GetImages(req.RequestId);
            return list;
        }

        public bool UpdateStatus(int requestId, string status)
        {
            using var conn = new SqlConnection(DataBaseConstant.ConnectionString);
            conn.Open();
            var cmd = conn.CreateCommand();
            cmd.CommandText = @"
                UPDATE dbo.job_requests
                SET status = @s, updated_at = GETUTCDATE()
                WHERE request_id = @id";
            cmd.Parameters.AddWithValue("@s",  status);
            cmd.Parameters.AddWithValue("@id", requestId);
            return cmd.ExecuteNonQuery() > 0;
        }

        public bool SetEstimate(int requestId, int estimatedMinutes, decimal estimatedPrice)
        {
            using var conn = new SqlConnection(DataBaseConstant.ConnectionString);
            conn.Open();
            var cmd = conn.CreateCommand();
            cmd.CommandText = @"
                UPDATE dbo.job_requests
                SET estimated_minutes = @m,
                    estimated_price   = @p,
                    status            = 'accepted',
                    updated_at        = GETUTCDATE()
                WHERE request_id = @id";
            cmd.Parameters.AddWithValue("@m",  estimatedMinutes);
            cmd.Parameters.AddWithValue("@p",  estimatedPrice);
            cmd.Parameters.AddWithValue("@id", requestId);
            return cmd.ExecuteNonQuery() > 0;
        }

        public bool SetJobOrderId(int requestId, int jobOrderId)
        {
            using var conn = new SqlConnection(DataBaseConstant.ConnectionString);
            conn.Open();
            var cmd = conn.CreateCommand();
            cmd.CommandText = @"
                UPDATE dbo.job_requests
                SET job_order_id = @jid,
                    status       = 'confirmed',
                    updated_at   = GETUTCDATE()
                WHERE request_id = @id";
            cmd.Parameters.AddWithValue("@jid", jobOrderId);
            cmd.Parameters.AddWithValue("@id",  requestId);
            return cmd.ExecuteNonQuery() > 0;
        }

        public void AddImage(int requestId, string filePath)
        {
            using var conn = new SqlConnection(DataBaseConstant.ConnectionString);
            conn.Open();
            var cmd = conn.CreateCommand();
            cmd.CommandText = @"
                INSERT INTO dbo.job_request_images (request_id, file_path)
                VALUES (@rid, @fp)";
            cmd.Parameters.AddWithValue("@rid", requestId);
            cmd.Parameters.AddWithValue("@fp",  filePath);
            cmd.ExecuteNonQuery();
        }

        public List<string> GetImages(int requestId)
        {
            using var conn = new SqlConnection(DataBaseConstant.ConnectionString);
            conn.Open();
            var cmd = conn.CreateCommand();
            cmd.CommandText = @"
                SELECT file_path FROM dbo.job_request_images
                WHERE request_id = @rid
                ORDER BY image_id";
            cmd.Parameters.AddWithValue("@rid", requestId);
            using var r = cmd.ExecuteReader();
            var paths = new List<string>();
            while (r.Read()) paths.Add(r.GetString(0));
            return paths;
        }
    }
}
