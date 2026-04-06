using Microsoft.Data.SqlClient;
using WebProdavnica.Core.Constant;
using WebProdavnica.DAL.Abstract;
using WebProdavnica.Entities;

namespace WebProdavnica.DAL.Impl
{
    public class PaymentRepository : IPaymentRepository
    {
        public bool Add(Payment payment)
        {
            using var conn = new SqlConnection(DataBaseConstant.ConnectionString);
            var cmd = new SqlCommand(
                @"INSERT INTO dbo.payments
            (amount, payment_date, payment_method, payment_status,
             transaction_id, redirect_url, currency, preauthorized_amount, job_id)
          VALUES
            (@amount, @date, @method, @status,
             @txId, @redirectUrl, @currency, @preauthAmount, @jobId)",
                conn);

            cmd.Parameters.AddWithValue("@amount", payment.Amount);
            cmd.Parameters.AddWithValue("@date", payment.PaymentDate);
            cmd.Parameters.AddWithValue("@method", payment.PaymentMethod ?? (object)DBNull.Value);
            cmd.Parameters.AddWithValue("@status", payment.PaymentStatus);
            cmd.Parameters.AddWithValue("@txId", payment.TransactionId ?? (object)DBNull.Value);
            cmd.Parameters.AddWithValue("@redirectUrl", payment.RedirectUrl ?? (object)DBNull.Value);
            cmd.Parameters.AddWithValue("@currency", payment.Currency ?? "RSD");
            cmd.Parameters.AddWithValue("@preauthAmount", payment.PreauthorizedAmount ?? (object)DBNull.Value);
            cmd.Parameters.AddWithValue("@jobId", payment.JobId);

            conn.Open();
            return cmd.ExecuteNonQuery() > 0;
        }

        public bool UpdateStatus(int jobId, string newStatus)
        {
            using var conn = new SqlConnection(DataBaseConstant.ConnectionString);
            conn.Open();
            var cmd = conn.CreateCommand();
            cmd.CommandText = "UPDATE dbo.payments SET payment_status = @status WHERE job_id = @jobId";
            cmd.Parameters.AddWithValue("@status", newStatus);
            cmd.Parameters.AddWithValue("@jobId", jobId);
            return cmd.ExecuteNonQuery() > 0;
        }

        public List<Payment> GetByJob(int jobId)
        {
            List<Payment> list = new();
            using SqlConnection conn = new(DataBaseConstant.ConnectionString);
            conn.Open();

            SqlCommand cmd = conn.CreateCommand();
            cmd.CommandText = "SELECT * FROM dbo.payments WHERE job_id=@id";
            cmd.Parameters.AddWithValue("@id", jobId);

            SqlDataReader r = cmd.ExecuteReader();
            while (r.Read())
            {
                list.Add(new Payment
                {
                    PaymentID = r.GetInt32(0),
                    Amount = r.GetDecimal(1),
                    PaymentDate = r.GetDateTime(2),
                    PaymentMethod = r.IsDBNull(3) ? null : r.GetString(3),
                    PaymentStatus = r.IsDBNull(4) ? null : r.GetString(4),
                    TransactionId = r.IsDBNull(5) ? null : r.GetString(5),
                    RedirectUrl = r.IsDBNull(6) ? null : r.GetString(6),
                    Currency = r.IsDBNull(7) ? null : r.GetString(7),
                    PreauthorizedAmount = r.IsDBNull(8) ? null : r.GetDecimal(8),
                    JobId = r.GetInt32(9),
                });
            }
            return list;
        }
    }
}
