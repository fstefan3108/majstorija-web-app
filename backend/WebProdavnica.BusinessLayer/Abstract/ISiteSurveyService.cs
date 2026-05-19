using WebProdavnica.Entities;

namespace WebProdavnica.BusinessLayer.Abstract
{
    public interface ISiteSurveyService
    {
        /// <summary>
        /// Majstor predlaže izviđanje — odmah kreira SiteSurvey (status: "predloženo")
        /// i menja JobRequest status na "survey_proposed".
        /// </summary>
        Task<SiteSurvey> ProposeSurveyAsync(int jobRequestId, DateTime scheduledDate, TimeSpan? scheduledTime, decimal surveyPrice);

        /// <summary>
        /// Korisnik odbija predlog za izviđanje — otkazuje survey.
        /// </summary>
        Task DeclineSurveyProposalAsync(int jobRequestId);

        /// <summary>
        /// Nakon uspešne preautorizacije plaćanja — aktivira survey (status: "zakazano").
        /// Poziva se ili iz callback-a ili iz frontend-a.
        /// </summary>
        Task ActivateSurveyAsync(int surveyId);

        SiteSurvey? Get(int surveyId);
        SiteSurvey? GetByJobRequest(int jobRequestId);
        List<SiteSurvey> GetByUser(int userId);
        List<SiteSurvey> GetByCraftsman(int craftsmanId);

        /// <summary>Jedna od strana predlaže pomeranje termina izviđanja.</summary>
        Task ProposeRescheduleAsync(int surveyId, DateTime newDate, TimeSpan newTime, string proposedBy);

        /// <summary>Druga strana prihvata predlog pomeranja.</summary>
        Task AcceptRescheduleAsync(int surveyId);

        /// <summary>
        /// Druga strana odbija predlog pomeranja — izviđanje se otkazuje i novac se vraća.
        /// Refund se izvršava u controlleru pre poziva ove metode.
        /// </summary>
        Task DeclineRescheduleAsync(int surveyId);

        /// <summary>
        /// Majstor označava izviđanje kao završeno i postavlja procenu za posao.
        /// JobRequest status → "accepted", korisnik dobija notifikaciju.
        /// </summary>
        Task CompleteSurveyAsync(int surveyId, int estimatedMinutes);

        /// <summary>
        /// Otkazivanje izviđanja od strane korisnika ili majstora.
        /// Refund se izvršava u controlleru pre poziva ove metode.
        /// </summary>
        Task CancelSurveyAsync(int surveyId, string cancelledBy);

        /// <summary>Auto-otkazivanje isteklih izviđanja (poziva background service).</summary>
        Task AutoDeclineOverdueSurveysAsync();
    }
}
