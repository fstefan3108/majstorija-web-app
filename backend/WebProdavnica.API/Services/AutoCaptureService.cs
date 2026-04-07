using WebProdavnica.BusinessLayer.Abstract;

namespace WebProdavnica.API.Services
{
    /// <summary>
    /// Background service that automatically captures pre-authorized payments
    /// when a client does not manually confirm within 30 minutes of job completion.
    ///
    /// Runs every 2 minutes. For each job in status "Ceka potvrdu" whose ended_at
    /// is more than 30 minutes ago, it issues a Capture for the actual job price.
    /// </summary>
    public class AutoCaptureService : BackgroundService
    {
        private static readonly TimeSpan CheckInterval    = TimeSpan.FromMinutes(2);
        private static readonly TimeSpan AutoCaptureDelay = TimeSpan.FromMinutes(30);

        private readonly IServiceScopeFactory _scopeFactory;
        private readonly ILogger<AutoCaptureService> _logger;

        public AutoCaptureService(IServiceScopeFactory scopeFactory, ILogger<AutoCaptureService> logger)
        {
            _scopeFactory = scopeFactory;
            _logger       = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("AutoCaptureService started.");

            while (!stoppingToken.IsCancellationRequested)
            {
                await Task.Delay(CheckInterval, stoppingToken);

                try
                {
                    await ProcessPendingCaptures(stoppingToken);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "AutoCaptureService encountered an error during processing.");
                }
            }
        }

        private async Task ProcessPendingCaptures(CancellationToken ct)
        {
            // Scoped services must be resolved per-run — BackgroundService is a singleton
            using var scope    = _scopeFactory.CreateScope();
            var jobService     = scope.ServiceProvider.GetRequiredService<IJobOrderService>();
            var paymentService = scope.ServiceProvider.GetRequiredService<IPaymentService>();
            var allSecure      = scope.ServiceProvider.GetRequiredService<AllSecureClient>();

            var cutoff = DateTime.UtcNow - AutoCaptureDelay;

            var candidates = jobService.GetAll()
                .Where(j => j.Status == "Ceka potvrdu"
                         && j.EndedAt.HasValue
                         && j.EndedAt.Value <= cutoff)
                .ToList();

            if (candidates.Count == 0) return;

            _logger.LogInformation(
                "AutoCaptureService: {Count} job(s) eligible for auto-capture.", candidates.Count);

            foreach (var job in candidates)
            {
                if (ct.IsCancellationRequested) break;

                var payments = paymentService.GetByJob(job.JobId);
                var payment  = payments.LastOrDefault();

                if (payment == null || payment.PaymentStatus != "Preauthorized")
                {
                    // Already processed (captured, voided, or refunded) — skip
                    continue;
                }

                _logger.LogInformation(
                    "AutoCaptureService: auto-capturing job {JobId}, amount {Amount} RSD.",
                    job.JobId, job.TotalPrice);

                var result = await allSecure.CaptureAsync(
                    Guid.NewGuid().ToString("N"),
                    payment.TransactionId!,
                    job.TotalPrice,
                    payment.Currency ?? "RSD",
                    job.JobId);

                if (result.ReturnType != "FINISHED" || !result.IsSuccess)
                {
                    _logger.LogWarning(
                        "AutoCaptureService: capture failed for job {JobId}: {Error}",
                        job.JobId, result.ErrorMessage);
                    continue;
                }

                paymentService.UpdateCapture(job.JobId, result.ReferenceId!);

                job.Status = "Završeno";
                jobService.Update(job);

                _logger.LogInformation(
                    "AutoCaptureService: job {JobId} auto-captured successfully.", job.JobId);
            }
        }
    }
}
