using WebProdavnica.Entities;

namespace WebProdavnica.DAL.Abstract
{
    public interface ISiteSurveyRepository
    {
        int Add(SiteSurvey survey);
        SiteSurvey? Get(int surveyId);
        SiteSurvey? GetByJobRequest(int jobRequestId);
        List<SiteSurvey> GetByUser(int userId);
        List<SiteSurvey> GetByCraftsman(int craftsmanId);
        bool UpdateStatus(int surveyId, string newStatus);
        bool ProposeReschedule(int surveyId, DateTime proposedDate, TimeSpan proposedTime, string proposedBy);
        bool AcceptReschedule(int surveyId);
        bool DeclineReschedule(int surveyId);

        // Vraća sve zakazane survey-e čiji je datum prošao + majstor nije reagovao u roku od 2 dana
        List<SiteSurvey> GetOverdueForAutoDecline();
    }
}
