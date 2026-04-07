using Microsoft.Data.SqlClient;
using WebProdavnica.Core.Constant;
using WebProdavnica.DAL.Abstract;
using WebProdavnica.Entities;

namespace WebProdavnica.DAL.Impl
{
    // Required migration (run once):
    //   ALTER TABLE dbo.payments ADD capture_transaction_id NVARCHAR(100) NULL;
    public class PaymentRepository : IPaymentRepository
    {
        // Explicit column list — never use SELECT * to avoid column-order fragility.
        private const string SelectColumns = @"
            payment_id, amount, payment_date, payment_method, payment_status,
            transaction_id, redirect_url, currency, preauthorized_amount, job_id,
            capture_transaction_id";

        // Indices match the SelectColumns list above (0-based).
        private static Payment Map(SqlDataReader r) => new Payment
        {
            PaymentID            = r.GetInt32(0),
            Amount               = r.GetDecimal(1),
            PaymentDate          = r.GetDateTime(2),
            PaymentMethod        = r.IsDBNull(3)  ? null : r.GetString(3),
            PaymentStatus        = r.IsDBNull(4)  ? null : r.GetString(4),
            TransactionId        = r.IsDBNull(5)  ? null : r.GetString(5),
            RedirectUrl          = r.IsDBNull(6)  ? null : r.GetString(6),
            Currency             = r.IsDBNull(7)  ? null : r.GetString(7),
            PreauthorizedAmount  = r.IsDBNull(8)  ? null : r.GetDecimal(8),
            JobId                = r.GetInt32(9),
            CaptureTransactionId = r.IsDBNull(10) ? null : r.GetString(10),
        };

        public bool Add(Payment payment)
        {
            using var conn = new SqlConnection(DataBaseConstant.ConnectionString);
            conn.Open();
            var cmd = conn.CreateCommand();
            cmd.CommandText = @"
                INSERT INTO dbo.payments
                    (amount, payment_date, payment_method, payment_status,
                     transaction_id, redirect_url, currency, preauthorized_amount, job_id)
                VALUES
                    (@amount, @date, @method, @status,
                     @txId, @redirectUrl, @currency, @preauthAmount, @jobId)";

            cmd.Parameters.AddWithValue("@amount",        payment.Amount);
            cmd.Parameters.AddWithValue("@date",          payment.PaymentDate);
            cmd.Parameters.AddWithValue("@method",        payment.PaymentMethod      ?? (object)DBNull.Value);
            cmd.Parameters.AddWithValue("@status",        payment.PaymentStatus);
            cmd.Parameters.AddWithValue("@txId",          payment.TransactionId      ?? (object)DBNull.Value);
            cmd.Parameters.AddWithValue("@redirectUrl",   payment.RedirectUrl        ?? (object)DBNull.Value);
            cmd.Parameters.AddWithValue("@currency",      payment.Currency           ?? "RSD");
            cmd.Parameters.AddWithValue("@preauthAmount", payment.PreauthorizedAmount ?? (object)DBNull.Value);
            cmd.Parameters.AddWithValue("@jobId",         payment.JobId);

            return cmd.ExecuteNonQuery() > 0;
        }

        public List<Payment> GetByJob(int jobId)
        {
            var list = new List<Payment>();
            using var conn = new SqlConnection(DataBaseConstant.ConnectionString);
            conn.Open();
            var cmd = conn.CreateCommand();
            cmd.CommandText = $"SELECT {SelectColumns} FROM dbo.payments WHERE job_id = @id";
            cmd.Parameters.AddWithValue("@id", jobId);
            using var r = cmd.ExecuteReader();
            while (r.Read()) list.Add(Map(r));
            return list;
        }

        public Payment? GetByTransactionId(string transactionId)
        {
            using var conn = new SqlConnection(DataBaseConstant.ConnectionString);
            conn.Open();
            var cmd = conn.CreateCommand();
            cmd.CommandText = $"SELECT TOP 1 {SelectColumns} FROM dbo.payments WHERE transaction_id = @txId";
            cmd.Parameters.AddWithValue("@txId", transactionId);
            using var r = cmd.ExecuteReader();
            return r.Read() ? Map(r) : null;
        }

        public bool UpdateStatus(int jobId, string newStatus)
        {
            using var conn = new SqlConnection(DataBaseConstant.ConnectionString);
            conn.Open();
            var cmd = conn.CreateCommand();
            cmd.CommandText = "UPDATE dbo.payments SET payment_status = @status WHERE job_id = @jobId";
            cmd.Parameters.AddWithValue("@status", newStatus);
            cmd.Parameters.AddWithValue("@jobId",  jobId);
            return cmd.ExecuteNonQuery() > 0;
        }

        public bool UpdateCapture(int jobId, string captureTransactionId)
        {
            using var conn = new SqlConnection(DataBaseConstant.ConnectionString);
            conn.Open();
            var cmd = conn.CreateCommand();
            cmd.CommandText = @"UPDATE dbo.payments
                                SET payment_status         = 'Captured',
                                    capture_transaction_id = @captureId
                                WHERE job_id = @jobId";
            cmd.Parameters.AddWithValue("@captureId", captureTransactionId);
            cmd.Parameters.AddWithValue("@jobId",     jobId);
            return cmd.ExecuteNonQuery() > 0;
        }
    }
}
