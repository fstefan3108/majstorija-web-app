using System;
using System.Collections.Generic;
using WebProdavnica.DAL.Abstract;
using Microsoft.Data.SqlClient;
using WebProdavnica.Core.Constant;
using WebProdavnica.Entities;

namespace WebProdavnica.DAL.Impl
{
    public class UserRepository : IUserRepository
    {
        private const string SelectColumns = @"
            user_id, first_name, last_name, email, phone,
            password_hash, location, created_at,
            refresh_token, refresh_token_expiry,
            google_id, password_reset_token, password_reset_token_expiry, profile_image_path";

        public bool Add(User u)
        {
            using SqlConnection conn = new(DataBaseConstant.ConnectionString);
            conn.Open();
            SqlCommand cmd = conn.CreateCommand();
            cmd.CommandText = @"INSERT INTO dbo.users
                (first_name, last_name, email, phone, password_hash, location, created_at, google_id)
                VALUES(@fn, @ln, @e, @p, @ph, @l, @ca, @gid)";

            cmd.Parameters.AddWithValue("@fn", u.FirstName);
            cmd.Parameters.AddWithValue("@ln", u.LastName);
            cmd.Parameters.AddWithValue("@e", u.Email);
            cmd.Parameters.AddWithValue("@p", string.IsNullOrEmpty(u.Phone) ? (object)DBNull.Value : u.Phone);
            cmd.Parameters.AddWithValue("@ph", string.IsNullOrEmpty(u.PasswordHash) ? (object)DBNull.Value : u.PasswordHash);
            cmd.Parameters.AddWithValue("@l", string.IsNullOrEmpty(u.Location) ? (object)DBNull.Value : u.Location);
            cmd.Parameters.AddWithValue("@ca", u.CreatedAt);
            cmd.Parameters.AddWithValue("@gid", (object?)u.GoogleId ?? DBNull.Value);

            return cmd.ExecuteNonQuery() > 0;
        }

        public bool Delete(int id)
        {
            using SqlConnection conn = new(DataBaseConstant.ConnectionString);
            conn.Open();
            SqlCommand cmd = conn.CreateCommand();
            cmd.CommandText = "DELETE FROM dbo.users WHERE user_id=@id";
            cmd.Parameters.AddWithValue("@id", id);
            return cmd.ExecuteNonQuery() > 0;
        }

        public User? Get(int id)
        {
            using SqlConnection conn = new(DataBaseConstant.ConnectionString);
            conn.Open();
            SqlCommand cmd = conn.CreateCommand();
            cmd.CommandText = $"SELECT {SelectColumns} FROM dbo.users WHERE user_id=@id";
            cmd.Parameters.AddWithValue("@id", id);
            SqlDataReader r = cmd.ExecuteReader();
            return r.Read() ? MapUser(r) : null;
        }

        public List<User> GetAll()
        {
            List<User> list = new();
            using SqlConnection conn = new(DataBaseConstant.ConnectionString);
            conn.Open();
            SqlCommand cmd = conn.CreateCommand();
            cmd.CommandText = $"SELECT {SelectColumns} FROM dbo.users";
            SqlDataReader r = cmd.ExecuteReader();
            while (r.Read()) list.Add(MapUser(r));
            return list;
        }

        public User? GetByEmail(string email)
        {
            using SqlConnection conn = new(DataBaseConstant.ConnectionString);
            conn.Open();
            SqlCommand cmd = conn.CreateCommand();
            cmd.CommandText = $"SELECT {SelectColumns} FROM dbo.users WHERE email=@email";
            cmd.Parameters.AddWithValue("@email", email);
            SqlDataReader r = cmd.ExecuteReader();
            return r.Read() ? MapUser(r) : null;
        }

        public User? GetByGoogleId(string googleId)
        {
            using SqlConnection conn = new(DataBaseConstant.ConnectionString);
            conn.Open();
            SqlCommand cmd = conn.CreateCommand();
            cmd.CommandText = $"SELECT {SelectColumns} FROM dbo.users WHERE google_id=@gid";
            cmd.Parameters.AddWithValue("@gid", googleId);
            SqlDataReader r = cmd.ExecuteReader();
            return r.Read() ? MapUser(r) : null;
        }

        public User? GetByResetToken(string token)
        {
            using SqlConnection conn = new(DataBaseConstant.ConnectionString);
            conn.Open();
            SqlCommand cmd = conn.CreateCommand();
            cmd.CommandText = $"SELECT {SelectColumns} FROM dbo.users WHERE password_reset_token=@token AND password_reset_token_expiry > GETUTCDATE()";
            cmd.Parameters.AddWithValue("@token", token);
            SqlDataReader r = cmd.ExecuteReader();
            return r.Read() ? MapUser(r) : null;
        }

        public bool Update(User u)
        {
            using SqlConnection conn = new(DataBaseConstant.ConnectionString);
            conn.Open();
            SqlCommand cmd = conn.CreateCommand();
            cmd.CommandText = @"UPDATE dbo.users SET
                first_name=@fn, last_name=@ln, email=@e, phone=@p, location=@l,
                password_hash=@ph, refresh_token=@rt, refresh_token_expiry=@rte,
                google_id=@gid, password_reset_token=@prt, password_reset_token_expiry=@prte,
                profile_image_path=@pip
                WHERE user_id=@id";

            cmd.Parameters.AddWithValue("@fn", u.FirstName);
            cmd.Parameters.AddWithValue("@ln", u.LastName);
            cmd.Parameters.AddWithValue("@e", u.Email);
            cmd.Parameters.AddWithValue("@p", string.IsNullOrEmpty(u.Phone) ? (object)DBNull.Value : u.Phone);
            cmd.Parameters.AddWithValue("@l", string.IsNullOrEmpty(u.Location) ? (object)DBNull.Value : u.Location);
            cmd.Parameters.AddWithValue("@ph", string.IsNullOrEmpty(u.PasswordHash) ? (object)DBNull.Value : u.PasswordHash);
            cmd.Parameters.AddWithValue("@rt", (object?)u.RefreshToken ?? DBNull.Value);
            cmd.Parameters.AddWithValue("@rte", (object?)u.RefreshTokenExpiry ?? DBNull.Value);
            cmd.Parameters.AddWithValue("@gid", (object?)u.GoogleId ?? DBNull.Value);
            cmd.Parameters.AddWithValue("@prt", (object?)u.PasswordResetToken ?? DBNull.Value);
            cmd.Parameters.AddWithValue("@prte", (object?)u.PasswordResetTokenExpiry ?? DBNull.Value);
            cmd.Parameters.AddWithValue("@pip", (object?)u.ProfileImagePath ?? DBNull.Value);
            cmd.Parameters.AddWithValue("@id", u.UserId);

            return cmd.ExecuteNonQuery() > 0;
        }

        public bool UpdatePassword(int userId, string newPasswordHash)
        {
            using SqlConnection conn = new(DataBaseConstant.ConnectionString);
            conn.Open();
            SqlCommand cmd = conn.CreateCommand();
            cmd.CommandText = "UPDATE dbo.users SET password_hash=@ph, password_reset_token=NULL, password_reset_token_expiry=NULL WHERE user_id=@id";
            cmd.Parameters.AddWithValue("@ph", newPasswordHash);
            cmd.Parameters.AddWithValue("@id", userId);
            return cmd.ExecuteNonQuery() > 0;
        }

        private static User MapUser(SqlDataReader r)
        {
            return new User
            {
                UserId = (int)r["user_id"],
                FirstName = r["first_name"] as string ?? string.Empty,
                LastName = r["last_name"] as string ?? string.Empty,
                Email = r["email"] as string ?? string.Empty,
                Phone = r["phone"] as string ?? string.Empty,
                PasswordHash = r["password_hash"] as string ?? string.Empty,
                Location = r["location"] as string ?? string.Empty,
                CreatedAt = (DateTime)r["created_at"],
                RefreshToken = r["refresh_token"] as string,
                RefreshTokenExpiry = r["refresh_token_expiry"] as DateTime?,
                GoogleId = r["google_id"] as string,
                PasswordResetToken = r["password_reset_token"] as string,
                PasswordResetTokenExpiry = r["password_reset_token_expiry"] as DateTime?,
                ProfileImagePath = r["profile_image_path"] as string
            };
        }
    }
}
