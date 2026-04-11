using Microsoft.Data.SqlClient;
using WebProdavnica.Core.Constant;
using WebProdavnica.DAL.Abstract;
using WebProdavnica.Entities;

namespace WebProdavnica.DAL.Impl
{
    public class CraftsmanRepository : ICraftsmanRepository
    {
        private const string SelectColumns = @"
            craftsman_id, first_name, last_name, email, phone,
            location, profession, experience, hourly_rate, working_hours,
            password_hash, refresh_token, refresh_token_expiry, average_rating, rating_count,
            professions, work_experience_description, profile_image_path, google_id,
            password_reset_token, password_reset_token_expiry,
            is_verified, verification_token, verification_token_expiry";

        public bool Add(Craftsman c)
        {
            using SqlConnection conn = new(DataBaseConstant.ConnectionString);
            conn.Open();
            SqlCommand cmd = conn.CreateCommand();
            cmd.CommandText = @"INSERT INTO dbo.craftsmen
                (first_name, last_name, email, phone, location, profession,
                 experience, hourly_rate, working_hours, password_hash,
                 professions, work_experience_description, google_id,
                 is_verified, verification_token, verification_token_expiry)
                VALUES(@fn, @ln, @e, @p, @l, @pr, @ex, @hr, @wh, @ph, @profs, @wed, @gid, @iv, @vt, @vte)";

            var professionsStr = c.Professions.Count > 0
                ? string.Join(",", c.Professions)
                : c.Profession;
            var firstProfession = c.Professions.Count > 0 ? c.Professions[0] : c.Profession;

            cmd.Parameters.AddWithValue("@fn", c.FirstName ?? (object)DBNull.Value);
            cmd.Parameters.AddWithValue("@ln", c.LastName ?? (object)DBNull.Value);
            cmd.Parameters.AddWithValue("@e", c.Email ?? (object)DBNull.Value);
            cmd.Parameters.AddWithValue("@p", c.Phone ?? (object)DBNull.Value);
            cmd.Parameters.AddWithValue("@l", c.Location ?? (object)DBNull.Value);
            cmd.Parameters.AddWithValue("@pr", firstProfession ?? (object)DBNull.Value);
            cmd.Parameters.AddWithValue("@ex", c.Experience);
            cmd.Parameters.AddWithValue("@hr", c.HourlyRate);
            cmd.Parameters.AddWithValue("@wh", c.WorkingHours ?? (object)DBNull.Value);
            cmd.Parameters.AddWithValue("@ph", (object?)c.PasswordHash ?? DBNull.Value);
            cmd.Parameters.AddWithValue("@profs", (object?)professionsStr ?? DBNull.Value);
            cmd.Parameters.AddWithValue("@wed", (object?)c.WorkExperienceDescription ?? DBNull.Value);
            cmd.Parameters.AddWithValue("@gid", (object?)c.GoogleId ?? DBNull.Value);
            cmd.Parameters.AddWithValue("@iv", c.IsVerified);
            cmd.Parameters.AddWithValue("@vt", (object?)c.VerificationToken ?? DBNull.Value);
            cmd.Parameters.AddWithValue("@vte", (object?)c.VerificationTokenExpiry ?? DBNull.Value);

            return cmd.ExecuteNonQuery() > 0;
        }

        public bool Delete(int id)
        {
            using SqlConnection conn = new(DataBaseConstant.ConnectionString);
            conn.Open();
            SqlCommand cmd = conn.CreateCommand();
            cmd.CommandText = "DELETE FROM dbo.craftsmen WHERE craftsman_id=@id";
            cmd.Parameters.AddWithValue("@id", id);
            return cmd.ExecuteNonQuery() > 0;
        }

        public Craftsman? Get(int id)
        {
            using SqlConnection conn = new(DataBaseConstant.ConnectionString);
            conn.Open();
            SqlCommand cmd = conn.CreateCommand();
            cmd.CommandText = $"SELECT {SelectColumns} FROM dbo.craftsmen WHERE craftsman_id=@id";
            cmd.Parameters.AddWithValue("@id", id);
            SqlDataReader r = cmd.ExecuteReader();
            return r.Read() ? MapCraftsman(r) : null;
        }

        public List<Craftsman> GetAll()
        {
            List<Craftsman> list = new();
            using SqlConnection conn = new(DataBaseConstant.ConnectionString);
            conn.Open();
            SqlCommand cmd = conn.CreateCommand();
            cmd.CommandText = $"SELECT {SelectColumns} FROM dbo.craftsmen";
            SqlDataReader r = cmd.ExecuteReader();
            while (r.Read()) list.Add(MapCraftsman(r));
            return list;
        }

        public Craftsman? GetByEmail(string email)
        {
            using SqlConnection conn = new(DataBaseConstant.ConnectionString);
            conn.Open();
            SqlCommand cmd = conn.CreateCommand();
            cmd.CommandText = $"SELECT {SelectColumns} FROM dbo.craftsmen WHERE email=@email";
            cmd.Parameters.AddWithValue("@email", email);
            SqlDataReader r = cmd.ExecuteReader();
            return r.Read() ? MapCraftsman(r) : null;
        }

        public Craftsman? GetByGoogleId(string googleId)
        {
            using SqlConnection conn = new(DataBaseConstant.ConnectionString);
            conn.Open();
            SqlCommand cmd = conn.CreateCommand();
            cmd.CommandText = $"SELECT {SelectColumns} FROM dbo.craftsmen WHERE google_id=@gid";
            cmd.Parameters.AddWithValue("@gid", googleId);
            SqlDataReader r = cmd.ExecuteReader();
            return r.Read() ? MapCraftsman(r) : null;
        }

        public Craftsman? GetByResetToken(string token)
        {
            using SqlConnection conn = new(DataBaseConstant.ConnectionString);
            conn.Open();
            SqlCommand cmd = conn.CreateCommand();
            cmd.CommandText = $"SELECT {SelectColumns} FROM dbo.craftsmen WHERE password_reset_token=@token AND password_reset_token_expiry > GETUTCDATE()";
            cmd.Parameters.AddWithValue("@token", token);
            SqlDataReader r = cmd.ExecuteReader();
            return r.Read() ? MapCraftsman(r) : null;
        }

        public bool Update(Craftsman c)
        {
            using SqlConnection conn = new(DataBaseConstant.ConnectionString);
            conn.Open();
            SqlCommand cmd = conn.CreateCommand();
            cmd.CommandText = @"UPDATE dbo.craftsmen SET
                first_name=@fn, last_name=@ln, email=@e, phone=@p, location=@loc,
                profession=@prof, experience=@exp, hourly_rate=@hr, working_hours=@wh,
                password_hash=@ph, refresh_token=@rt, refresh_token_expiry=@rte,
                average_rating=@ar, rating_count=@rc,
                professions=@profs, work_experience_description=@wed,
                profile_image_path=@pip, google_id=@gid,
                password_reset_token=@prt, password_reset_token_expiry=@prte
                WHERE craftsman_id=@id";

            var professionsStr = c.Professions.Count > 0
                ? string.Join(",", c.Professions)
                : c.Profession;
            var firstProfession = c.Professions.Count > 0 ? c.Professions[0] : c.Profession;

            cmd.Parameters.AddWithValue("@fn", c.FirstName ?? (object)DBNull.Value);
            cmd.Parameters.AddWithValue("@ln", c.LastName ?? (object)DBNull.Value);
            cmd.Parameters.AddWithValue("@e", c.Email ?? (object)DBNull.Value);
            cmd.Parameters.AddWithValue("@p", c.Phone ?? (object)DBNull.Value);
            cmd.Parameters.AddWithValue("@loc", c.Location ?? (object)DBNull.Value);
            cmd.Parameters.AddWithValue("@prof", firstProfession ?? (object)DBNull.Value);
            cmd.Parameters.AddWithValue("@exp", c.Experience);
            cmd.Parameters.AddWithValue("@hr", c.HourlyRate);
            cmd.Parameters.AddWithValue("@wh", c.WorkingHours ?? (object)DBNull.Value);
            cmd.Parameters.AddWithValue("@ph", (object?)c.PasswordHash ?? DBNull.Value);
            cmd.Parameters.AddWithValue("@rt", (object?)c.RefreshToken ?? DBNull.Value);
            cmd.Parameters.AddWithValue("@rte", (object?)c.RefreshTokenExpiry ?? DBNull.Value);
            cmd.Parameters.AddWithValue("@ar", (object?)c.AverageRating ?? DBNull.Value);
            cmd.Parameters.AddWithValue("@rc", c.RatingCount);
            cmd.Parameters.AddWithValue("@profs", (object?)professionsStr ?? DBNull.Value);
            cmd.Parameters.AddWithValue("@wed", (object?)c.WorkExperienceDescription ?? DBNull.Value);
            cmd.Parameters.AddWithValue("@pip", (object?)c.ProfileImagePath ?? DBNull.Value);
            cmd.Parameters.AddWithValue("@gid", (object?)c.GoogleId ?? DBNull.Value);
            cmd.Parameters.AddWithValue("@prt", (object?)c.PasswordResetToken ?? DBNull.Value);
            cmd.Parameters.AddWithValue("@prte", (object?)c.PasswordResetTokenExpiry ?? DBNull.Value);
            cmd.Parameters.AddWithValue("@id", c.CraftsmanId);

            return cmd.ExecuteNonQuery() > 0;
        }

        public bool UpdatePassword(int craftsmanId, string newPasswordHash)
        {
            using SqlConnection conn = new(DataBaseConstant.ConnectionString);
            conn.Open();
            SqlCommand cmd = conn.CreateCommand();
            cmd.CommandText = "UPDATE dbo.craftsmen SET password_hash=@ph, password_reset_token=NULL, password_reset_token_expiry=NULL WHERE craftsman_id=@id";
            cmd.Parameters.AddWithValue("@ph", newPasswordHash);
            cmd.Parameters.AddWithValue("@id", craftsmanId);
            return cmd.ExecuteNonQuery() > 0;
        }

        public Craftsman? GetByVerificationToken(string token)
        {
            using SqlConnection conn = new(DataBaseConstant.ConnectionString);
            conn.Open();
            SqlCommand cmd = conn.CreateCommand();
            cmd.CommandText = $"SELECT {SelectColumns} FROM dbo.craftsmen WHERE verification_token=@token AND verification_token_expiry > GETUTCDATE()";
            cmd.Parameters.AddWithValue("@token", token);
            SqlDataReader r = cmd.ExecuteReader();
            return r.Read() ? MapCraftsman(r) : null;
        }

        public bool SetVerified(int craftsmanId)
        {
            using SqlConnection conn = new(DataBaseConstant.ConnectionString);
            conn.Open();
            SqlCommand cmd = conn.CreateCommand();
            cmd.CommandText = "UPDATE dbo.craftsmen SET is_verified=1, verification_token=NULL, verification_token_expiry=NULL WHERE craftsman_id=@id";
            cmd.Parameters.AddWithValue("@id", craftsmanId);
            return cmd.ExecuteNonQuery() > 0;
        }

        public bool UpdateVerificationToken(int craftsmanId, string token, DateTime expiry)
        {
            using SqlConnection conn = new(DataBaseConstant.ConnectionString);
            conn.Open();
            SqlCommand cmd = conn.CreateCommand();
            cmd.CommandText = "UPDATE dbo.craftsmen SET verification_token=@token, verification_token_expiry=@expiry WHERE craftsman_id=@id";
            cmd.Parameters.AddWithValue("@token", token);
            cmd.Parameters.AddWithValue("@expiry", expiry);
            cmd.Parameters.AddWithValue("@id", craftsmanId);
            return cmd.ExecuteNonQuery() > 0;
        }

        public bool UpdateRating(int craftsmanId)
        {
            using SqlConnection conn = new(DataBaseConstant.ConnectionString);
            conn.Open();
            SqlCommand cmd = conn.CreateCommand();
            cmd.CommandText = @"
                UPDATE dbo.craftsmen SET
                    rating_count = (SELECT COUNT(*) FROM dbo.reviews r
                        INNER JOIN dbo.job_orders j ON r.job_id = j.job_id
                        WHERE j.craftsman_id = @cid),
                    average_rating = (SELECT AVG(CAST(r.rating AS DECIMAL(3,2))) FROM dbo.reviews r
                        INNER JOIN dbo.job_orders j ON r.job_id = j.job_id
                        WHERE j.craftsman_id = @cid)
                WHERE craftsman_id = @cid";
            cmd.Parameters.AddWithValue("@cid", craftsmanId);
            return cmd.ExecuteNonQuery() > 0;
        }

        private static Craftsman MapCraftsman(SqlDataReader r)
        {
            // Ucitaj professions string, fallback na profession kolonu
            var professionsRaw = r["professions"] as string;
            var professionFallback = r["profession"] as string;
            var professionsStr = !string.IsNullOrWhiteSpace(professionsRaw)
                ? professionsRaw
                : professionFallback;

            var professionsList = string.IsNullOrWhiteSpace(professionsStr)
                ? new List<string>()
                : professionsStr.Split(',', StringSplitOptions.RemoveEmptyEntries)
                    .Select(p => p.Trim())
                    .ToList();

            return new Craftsman
            {
                CraftsmanId = (int)r["craftsman_id"],
                FirstName = r["first_name"] as string,
                LastName = r["last_name"] as string,
                Email = r["email"] as string,
                Phone = r["phone"] as string,
                Location = r["location"] as string,
                Profession = professionsList.FirstOrDefault() ?? professionFallback,
                Professions = professionsList,
                Experience = r["experience"] is int exp ? exp : 0,
                HourlyRate = r["hourly_rate"] is decimal hr ? hr : 0m,
                WorkingHours = r["working_hours"] as string,
                WorkExperienceDescription = r["work_experience_description"] as string,
                PasswordHash = r["password_hash"] as string,
                RefreshToken = r["refresh_token"] as string,
                RefreshTokenExpiry = r["refresh_token_expiry"] as DateTime?,
                AverageRating = r["average_rating"] as decimal?,
                RatingCount = r["rating_count"] is int rc ? rc : 0,
                ProfileImagePath = r["profile_image_path"] as string,
                GoogleId = r["google_id"] as string,
                PasswordResetToken = r["password_reset_token"] as string,
                PasswordResetTokenExpiry = r["password_reset_token_expiry"] as DateTime?,
                IsVerified = r["is_verified"] != DBNull.Value && (bool)r["is_verified"],
                VerificationToken = r["verification_token"] as string,
                VerificationTokenExpiry = r["verification_token_expiry"] as DateTime?
            };
        }
    }
}
