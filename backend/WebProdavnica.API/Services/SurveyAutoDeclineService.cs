using WebProdavnica.BusinessLayer.Abstract;

namespace WebProdavnica.API.Services
{
    /// <summary>
    /// Background service koji automatski otkazuje zakazana izviđanja ako majstor
    /// ne reaguje (ne označi kao završeno niti otkaže) u roku od 2 dana od datuma izviđanja.
    /// Proverava svakih sat vremena.
    /// </summary>
    public class SurveyAutoDeclineService : BackgroundService
    {
        private static readonly TimeSpan CheckInterval = TimeSpan.FromHours(1);

        private readonly IServiceScopeFactory _scopeFactory;
        private readonly ILogger<SurveyAutoDeclineService> _logger;

        public SurveyAutoDeclineService(IServiceScopeFactory scopeFactory, ILogger<SurveyAutoDeclineService> logger)
        {
            _scopeFactory = scopeFactory;
            _logger       = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("SurveyAutoDeclineService started.");

            while (!stoppingToken.IsCancellationRequested)
            {
                await Task.Delay(CheckInterval, stoppingToken);

                try
                {
                    await ProcessOverdueSurveysAsync(stoppingToken);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "SurveyAutoDeclineService error during processing.");
                }
            }
        }

        private async Task ProcessOverdueSurveysAsync(CancellationToken ct)
        {
            using var scope        = _scopeFactory.CreateScope();
            var surveyService      = scope.ServiceProvider.GetRequiredService<ISiteSurveyService>();
            var paymentService     = scope.ServiceProvider.GetRequiredService<IPaymentService>();
            var allSecure          = scope.ServiceProvider.GetRequiredService<AllSecureClient>();

            // AutoDeclineOverdueSurveysAsync interno šalje notifikacije
            // ali ne radi refund — to radimo ovde pre poziva cancel-a
            var surveyRepo = scope.ServiceProvider.GetRequiredService<WebProdavnica.DAL.Abstract.ISiteSurveyRepository>();
            var overdue    = surveyRepo.GetOverdueForAutoDecline();

            if (overdue.Count == 0) return;

            _logger.LogInformation("SurveyAutoDeclineService: {Count} survey(s) overdue.", overdue.Count);

            foreach (var survey in overdue)
            {
                if (ct.IsCancellationRequested) break;

                // Pokušaj void preautorizacije
                var payments = paymentService.GetBySurvey(survey.SurveyId);
                var payment  = payments.LastOrDefault();

                if (payment != null &&
                    (payment.PaymentStatus == "Preauthorized" || payment.PaymentStatus == "Pending") &&
                    payment.TransactionId != null)
                {
                    var voidResult = await allSecure.VoidAsync(
                        Guid.NewGuid().ToString("N"),
                        payment.TransactionId);

                    if (voidResult.ReturnType == "FINISHED" && voidResult.IsSuccess)
                        paymentService.UpdateStatusBySurvey(survey.SurveyId, "Voided");
                    else
                        _logger.LogWarning(
                            "SurveyAutoDeclineService: void failed for survey {SurveyId}: {Error}",
                            survey.SurveyId, voidResult.ErrorMessage);
                }

                try
                {
                    await surveyService.CancelSurveyAsync(survey.SurveyId, "auto");
                    _logger.LogInformation(
                        "SurveyAutoDeclineService: survey {SurveyId} auto-cancelled.", survey.SurveyId);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(
                        ex, "SurveyAutoDeclineService: failed to cancel survey {SurveyId}.", survey.SurveyId);
                }
            }
        }
    }
}
