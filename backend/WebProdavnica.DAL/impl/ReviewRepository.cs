using Microsoft.Data.SqlClient;
using WebProdavnica.Core.Constant;
using WebProdavnica.DAL.Abstract;
using WebProdavnica.Entities;

namespace WebProdavnica.DAL.Impl
{
    public class ReviewRepository : IReviewRepository
    {
        // ── Helper: maps a SqlDataReader row to Review ──────────────────────
        private static Review Map(SqlDataReader r) => new Review
        {
            ReviewId = r.GetInt32(0),
            JobId = r.GetInt32(1),
            UserId = r.GetInt32(2),
            Rating = r.GetInt32(3),
            Comment = r.IsDBNull(4) ? null : r.GetString(4),
            CreatedAt = r.GetDateTime(5),
        };

        // ── CRUD ──────────────────────────────────────────────────────────────
        public bool Add(Review review)
        {
            using var conn = new SqlConnection(DataBaseConstant.ConnectionString);
            conn.Open();
            var cmd = conn.CreateCommand();
            cmd.CommandText = @"
                INSERT INTO dbo.reviews
                    (job_id, user_id, rating, comment, created_at)
                OUTPUT INSERTED.review_id
                VALUES (@jid, @uid, @rating, @comment, @created)";

            cmd.Parameters.AddWithValue("@jid", review.JobId);
            cmd.Parameters.AddWithValue("@uid", review.UserId);
            cmd.Parameters.AddWithValue("@rating", review.Rating);
            cmd.Parameters.AddWithValue("@comment", review.Comment ?? (object)DBNull.Value);
            cmd.Parameters.AddWithValue("@created", review.CreatedAt);

            var newId = cmd.ExecuteScalar();
            if (newId == null) return false;
            review.ReviewId = Convert.ToInt32(newId);
            return true;
        }

        public Review? GetByJobId(int jobId)
        {
            using var conn = new SqlConnection(DataBaseConstant.ConnectionString);
            conn.Open();
            var cmd = conn.CreateCommand();
            cmd.CommandText = @"
                SELECT review_id, job_id, user_id, rating, comment, created_at
                FROM dbo.reviews
                WHERE job_id=@jid";
            cmd.Parameters.AddWithValue("@jid", jobId);
            var r = cmd.ExecuteReader();
            return r.Read() ? Map(r) : null;
        }

        public List<Review> GetByCraftsmanId(int craftsmanId)
        {
            using var conn = new SqlConnection(DataBaseConstant.ConnectionString);
            conn.Open();
            var cmd = conn.CreateCommand();
            cmd.CommandText = @"
                SELECT r.review_id, r.job_id, r.user_id, r.rating, r.comment, r.created_at,
                       u.first_name, u.last_name
                FROM dbo.reviews r
                INNER JOIN dbo.job_orders j ON r.job_id = j.job_id
                INNER JOIN dbo.users u ON r.user_id = u.user_id
                WHERE j.craftsman_id = @cid
                ORDER BY r.created_at DESC";
            cmd.Parameters.AddWithValue("@cid", craftsmanId);
            var r = cmd.ExecuteReader();
            var list = new List<Review>();
            while (r.Read()) list.Add(Map(r));
            return list;
        }

        public List<Review> GetByUserId(int userId)
        {
            using var conn = new SqlConnection(DataBaseConstant.ConnectionString);
            conn.Open();
            var cmd = conn.CreateCommand();
            cmd.CommandText = @"
                SELECT review_id, job_id, user_id, rating, comment, created_at
                FROM dbo.reviews
                WHERE user_id=@uid
                ORDER BY created_at DESC";
            cmd.Parameters.AddWithValue("@uid", userId);
            var r = cmd.ExecuteReader();
            var list = new List<Review>();
            while (r.Read()) list.Add(Map(r));
            return list;
        }

        public bool Update(Review review)
        {
            using var conn = new SqlConnection(DataBaseConstant.ConnectionString);
            conn.Open();
            var cmd = conn.CreateCommand();
            cmd.CommandText = @"
                UPDATE dbo.reviews
                SET rating=@rating, comment=@comment
                WHERE review_id=@id";
            cmd.Parameters.AddWithValue("@rating", review.Rating);
            cmd.Parameters.AddWithValue("@comment", review.Comment ?? (object)DBNull.Value);
            cmd.Parameters.AddWithValue("@id", review.ReviewId);
            return cmd.ExecuteNonQuery() > 0;
        }

        public bool Delete(int reviewId)
        {
            using var conn = new SqlConnection(DataBaseConstant.ConnectionString);
            conn.Open();
            var cmd = conn.CreateCommand();
            cmd.CommandText = "DELETE FROM dbo.reviews WHERE review_id=@id";
            cmd.Parameters.AddWithValue("@id", reviewId);
            return cmd.ExecuteNonQuery() > 0;
        }
    }
}