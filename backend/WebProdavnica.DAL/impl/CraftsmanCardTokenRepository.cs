using Microsoft.Data.SqlClient;
using WebProdavnica.Core.Constant;
using WebProdavnica.DAL.Abstract;
using WebProdavnica.Entities;

namespace WebProdavnica.DAL.Impl
{
    public class CraftsmanCardTokenRepository : ICraftsmanCardTokenRepository
    {
        public CraftsmanCardToken? GetByCraftsmanId(int craftsmanId)
        {
            using var conn = new SqlConnection(DataBaseConstant.ConnectionString);
            conn.Open();
            var cmd = conn.CreateCommand();
            cmd.CommandText = @"
                SELECT TOP 1 id, craftsman_id, registration_id, card_brand, masked_number, created_at
                FROM dbo.craftsman_card_tokens
                WHERE craftsman_id = @cid
                ORDER BY created_at DESC";
            cmd.Parameters.AddWithValue("@cid", craftsmanId);

            using var r = cmd.ExecuteReader();
            if (!r.Read()) return null;
            return Map(r);
        }

        public IEnumerable<CraftsmanCardToken> GetAllByCraftsmanId(int craftsmanId)
        {
            using var conn = new SqlConnection(DataBaseConstant.ConnectionString);
            conn.Open();
            var cmd = conn.CreateCommand();
            cmd.CommandText = @"
                SELECT id, craftsman_id, registration_id, card_brand, masked_number, created_at
                FROM dbo.craftsman_card_tokens
                WHERE craftsman_id = @cid
                ORDER BY created_at DESC";
            cmd.Parameters.AddWithValue("@cid", craftsmanId);

            using var r = cmd.ExecuteReader();
            var list = new List<CraftsmanCardToken>();
            while (r.Read()) list.Add(Map(r));
            return list;
        }

        public CraftsmanCardToken? GetById(int id)
        {
            using var conn = new SqlConnection(DataBaseConstant.ConnectionString);
            conn.Open();
            var cmd = conn.CreateCommand();
            cmd.CommandText = @"
                SELECT id, craftsman_id, registration_id, card_brand, masked_number, created_at
                FROM dbo.craftsman_card_tokens
                WHERE id = @id";
            cmd.Parameters.AddWithValue("@id", id);
            using var r = cmd.ExecuteReader();
            if (!r.Read()) return null;
            return Map(r);
        }

        public bool Add(CraftsmanCardToken token)
        {
            using var conn = new SqlConnection(DataBaseConstant.ConnectionString);
            conn.Open();
            var cmd = conn.CreateCommand();
            cmd.CommandText = @"
                INSERT INTO dbo.craftsman_card_tokens
                    (craftsman_id, registration_id, card_brand, masked_number, created_at)
                VALUES (@cid, @rid, @brand, @masked, @created)";
            cmd.Parameters.AddWithValue("@cid",     token.CraftsmanId);
            cmd.Parameters.AddWithValue("@rid",     token.RegistrationId);
            cmd.Parameters.AddWithValue("@brand",   token.CardBrand   ?? (object)DBNull.Value);
            cmd.Parameters.AddWithValue("@masked",  token.MaskedNumber ?? (object)DBNull.Value);
            cmd.Parameters.AddWithValue("@created", token.CreatedAt);
            return cmd.ExecuteNonQuery() > 0;
        }

        public bool Delete(int id)
        {
            using var conn = new SqlConnection(DataBaseConstant.ConnectionString);
            conn.Open();
            var cmd = conn.CreateCommand();
            cmd.CommandText = "DELETE FROM dbo.craftsman_card_tokens WHERE id = @id";
            cmd.Parameters.AddWithValue("@id", id);
            return cmd.ExecuteNonQuery() > 0;
        }

        private static CraftsmanCardToken Map(SqlDataReader r) => new()
        {
            Id             = r.GetInt32(0),
            CraftsmanId    = r.GetInt32(1),
            RegistrationId = r.GetString(2),
            CardBrand      = r.IsDBNull(3) ? null : r.GetString(3),
            MaskedNumber   = r.IsDBNull(4) ? null : r.GetString(4),
            CreatedAt      = r.GetDateTime(5),
        };
    }
}
