using Microsoft.Data.SqlClient;
using WebProdavnica.Core.Constant;
using WebProdavnica.DAL.Abstract;
using WebProdavnica.Entities;

namespace WebProdavnica.DAL.Impl
{
    public class PaymentRepository : IPaymentRepository
    {
        private const string SelectColumns = @"
            payment_id, amount, payment_date, payment_method, payment_status,
            transaction_id, redirect_url, currency, preauthorized_amount, job_id,
            capture_transaction_id, survey_id";

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
            JobId                = r.IsDBNull(9)  ? null : r.GetInt32(9),
            CaptureTransactionId = r.IsDBNull(10) ? null : r.GetString(10),
            SurveyId             = r.IsDBNull(11) ? null : r.GetInt32(11),
        };

        public bool Add(Payment payment)
        {
            using var conn = new SqlConnection(DataBaseConstant.ConnectionString);
            conn.Open();
            var cmd = conn.CreateCommand();
            cmd.CommandText = @"
                INSERT INTO dbo.payments
                    (amount, payment_date, payment_method, payment_status,
                     transaction_id, redirect_url, currency, preauthorized_amount, job_id, survey_id)
                VALUES
                    (@amount, @date, @method, @status,
                     @txId, @redirectUrl, @currency, @preauthAmount, @jobId, @surveyId)";

            cmd.Parameters.AddWithValue("@amount",        payment.Amount);
            cmd.Parameters.AddWithValue("@date",          payment.PaymentDate);
            cmd.Parameters.AddWithValue("@method",        payment.PaymentMethod      ?? (object)DBNull.Value);
            cmd.Parameters.AddWithValue("@status",        payment.PaymentStatus);
            cmd.Parameters.AddWithValue("@txId",          payment.TransactionId      ?? (object)DBNull.Value);
            cmd.Parameters.AddWithValue("@redirectUrl",   payment.RedirectUrl        ?? (object)DBNull.Value);
            cmd.Parameters.AddWithValue("@currency",      payment.Currency           ?? "RSD");
            cmd.Parameters.AddWithValue("@preauthAmount", payment.PreauthorizedAmount ?? (object)DBNull.Value);
            cmd.Parameters.AddWithValue("@jobId",         payment.JobId.HasValue ? (object)payment.JobId.Value : DBNull.Value);
            cmd.Parameters.AddWithValue("@surveyId",      payment.SurveyId.HasValue ? (object)payment.SurveyId.Value : DBNull.Value);

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

        public List<Payment> GetBySurvey(int surveyId)
        {
            var list = new List<Payment>();
            using var conn = new SqlConnection(DataBaseConstant.ConnectionString);
            conn.Open();
            var cmd = conn.CreateCommand();
            cmd.CommandText = $"SELECT {SelectColumns} FROM dbo.payments WHERE survey_id = @id";
            cmd.Parameters.AddWithValue("@id", surveyId);
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

        public bool UpdateStatusBySurvey(int surveyId, string newStatus)
        {
            using var conn = new SqlConnection(DataBaseConstant.ConnectionString);
            conn.Open();
            var cmd = conn.CreateCommand();
            cmd.CommandText = "UPDATE dbo.payments SET payment_status = @status WHERE survey_id = @surveyId";
            cmd.Parameters.AddWithValue("@status",   newStatus);
            cmd.Parameters.AddWithValue("@surveyId", surveyId);
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

        public bool UpdateCaptureBySurvey(int surveyId, string captureTransactionId)
        {
            using var conn = new SqlConnection(DataBaseConstant.ConnectionString);
            conn.Open();
            var cmd = conn.CreateCommand();
            cmd.CommandText = @"UPDATE dbo.payments
                                SET payment_status         = 'Captured',
                                    capture_transaction_id = @captureId
                                WHERE survey_id = @surveyId";
            cmd.Parameters.AddWithValue("@captureId", captureTransactionId);
            cmd.Parameters.AddWithValue("@surveyId",  surveyId);
            return cmd.ExecuteNonQuery() > 0;
        }
    }
}
