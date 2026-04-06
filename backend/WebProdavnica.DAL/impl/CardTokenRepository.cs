using Microsoft.Data.SqlClient;
using WebProdavnica.Core.Constant;
using WebProdavnica.DAL.Abstract;
using WebProdavnica.Entities;

namespace WebProdavnica.DAL.Impl
{
    public class CardTokenRepository : ICardTokenRepository
    {
        public CardToken? GetByUserId(int userId)
        {
            using var conn = new SqlConnection(DataBaseConstant.ConnectionString);
            conn.Open();
            var cmd = conn.CreateCommand();
            cmd.CommandText = "SELECT TOP 1 * FROM dbo.card_tokens WHERE user_id = @uid ORDER BY created_at DESC";
            cmd.Parameters.AddWithValue("@uid", userId);

            var r = cmd.ExecuteReader();
            if (!r.Read()) return null;

            return new CardToken
            {
                TokenId = r.GetInt32(0),
                UserId = r.GetInt32(1),
                RegistrationId = r.GetString(2),
                CardBrand = r.IsDBNull(3) ? null : r.GetString(3),
                MaskedNumber = r.IsDBNull(4) ? null : r.GetString(4),
                CreatedAt = r.GetDateTime(5),
            };
        }

        public bool Add(CardToken token)
        {
            using var conn = new SqlConnection(DataBaseConstant.ConnectionString);
            var cmd = new SqlCommand(
                @"INSERT INTO dbo.card_tokens (user_id, registration_id, card_brand, masked_number, created_at)
                  VALUES (@uid, @rid, @brand, @masked, @created)",
                conn);

            cmd.Parameters.AddWithValue("@uid", token.UserId);
            cmd.Parameters.AddWithValue("@rid", token.RegistrationId);
            cmd.Parameters.AddWithValue("@brand", token.CardBrand ?? (object)DBNull.Value);
            cmd.Parameters.AddWithValue("@masked", token.MaskedNumber ?? (object)DBNull.Value);
            cmd.Parameters.AddWithValue("@created", token.CreatedAt);

            conn.Open();
            return cmd.ExecuteNonQuery() > 0;
        }
    }
}