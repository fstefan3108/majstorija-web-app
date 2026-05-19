using WebProdavnica.BusinessLayer.Abstract;
using WebProdavnica.DAL.Abstract;
using WebProdavnica.Entities;

namespace WebProdavnica.BusinessLayer.Impl
{
    public class SiteSurveyService : ISiteSurveyService
    {
        private readonly ISiteSurveyRepository _surveyRepo;
        private readonly IJobRequestRepository _requestRepo;
        private readonly IUserRepository _userRepo;
        private readonly ICraftsmanRepository _craftsmanRepo;
        private readonly INotificationService _notifications;

        public SiteSurveyService(
            ISiteSurveyRepository surveyRepo,
            IJobRequestRepository requestRepo,
            IUserRepository userRepo,
            ICraftsmanRepository craftsmanRepo,
            INotificationService notifications)
        {
            _surveyRepo    = surveyRepo;
            _requestRepo   = requestRepo;
            _userRepo      = userRepo;
            _craftsmanRepo = craftsmanRepo;
            _notifications = notifications;
        }

        public async Task<SiteSurvey> ProposeSurveyAsync(
            int jobRequestId,
            DateTime scheduledDate,
            TimeSpan? scheduledTime,
            decimal surveyPrice)
        {
            var req = _requestRepo.Get(jobRequestId)
                ?? throw new InvalidOperationException("Zahtev za posao nije pronađen.");

            if (req.Status != "pending")
                throw new InvalidOperationException(
                    $"Zahtev je u statusu '{req.Status}' — izviđanje se može predložiti samo za zahteve u statusu 'pending'.");

            // Kreiramo SiteSurvey odmah sa statusom "predloženo" — plaćanje tek sledi
            var survey = new SiteSurvey
            {
                JobRequestId  = jobRequestId,
                UserId        = req.UserId,
                CraftsmanId   = req.CraftsmanId,
                ScheduledDate = scheduledDate,
                ScheduledTime = scheduledTime,
                SurveyPrice   = surveyPrice,
                Status        = "predloženo",
            };

            var surveyId = _surveyRepo.Add(survey);

            // Linkujemo survey na JobRequest i menjamo status
            // SetSurveyId bi promenio status na "survey_scheduled" — previše rano.
            // Koristimo UpdateStatus i ručno setujemo survey_id
            _requestRepo.UpdateStatus(jobRequestId, "survey_proposed");
            SetSurveyIdOnly(jobRequestId, surveyId);

            var user      = _userRepo.Get(req.UserId);
            var craftsman = _craftsmanRepo.Get(req.CraftsmanId);

            if (user != null && craftsman != null)
            {
                var dateStr = scheduledDate.ToString("dd.MM.yyyy");
                var timeStr = scheduledTime.HasValue
                    ? scheduledTime.Value.ToString(@"hh\:mm")
                    : "dogovoreno";

                await _notifications.SendAsync(new Notification
                {
                    RecipientId     = req.UserId,
                    RecipientType   = "user",
                    Type            = "survey_proposed",
                    Title           = "Majstor predlaže izviđanje terena",
                    Message         = $"{craftsman.FirstName} {craftsman.LastName} želi da dođe na izviđanje pre prihvatanja posla \"{req.Title}\". " +
                                      $"Datum: {dateStr} u {timeStr}. Cena izviđanja: {surveyPrice:N0} RSD.",
                    RelatedEntityId = jobRequestId,
                }, user.Email ?? "");
            }

            return survey;
        }

        public async Task DeclineSurveyProposalAsync(int jobRequestId)
        {
            var req = _requestRepo.Get(jobRequestId)
                ?? throw new InvalidOperationException("Zahtev nije pronađen.");

            if (req.Status != "survey_proposed")
                throw new InvalidOperationException("Predlog za izviđanje nije aktivan.");

            // Otkazujemo SiteSurvey koji je bio u statusu "predloženo"
            if (req.SurveyId.HasValue)
                _surveyRepo.UpdateStatus(req.SurveyId.Value, "otkazano");

            _requestRepo.UpdateStatus(jobRequestId, "declined_by_user");

            var craftsman = _craftsmanRepo.Get(req.CraftsmanId);
            var user      = _userRepo.Get(req.UserId);

            if (craftsman != null && user != null)
            {
                await _notifications.SendAsync(new Notification
                {
                    RecipientId     = req.CraftsmanId,
                    RecipientType   = "craftsman",
                    Type            = "survey_declined",
                    Title           = "Korisnik odbio izviđanje",
                    Message         = $"{user.FirstName} {user.LastName} je odbio/la predlog za izviđanje posla \"{req.Title}\".",
                    RelatedEntityId = jobRequestId,
                }, craftsman.Email ?? "");
            }
        }

        public async Task ActivateSurveyAsync(int surveyId)
        {
            var survey = _surveyRepo.Get(surveyId)
                ?? throw new InvalidOperationException("Izviđanje nije pronađeno.");

            if (survey.Status != "predloženo")
                return; // već aktivirano ili otkazano

            _surveyRepo.UpdateStatus(surveyId, "zakazano");
            // Sada možemo da setujemo job_request.status = "survey_scheduled"
            _requestRepo.SetSurveyId(survey.JobRequestId, surveyId);

            var req       = _requestRepo.Get(survey.JobRequestId);
            var user      = _userRepo.Get(survey.UserId);
            var craftsman = _craftsmanRepo.Get(survey.CraftsmanId);
            var dateStr   = survey.ScheduledDate.ToString("dd.MM.yyyy");

            if (user != null)
            {
                await _notifications.SendAsync(new Notification
                {
                    RecipientId     = survey.UserId,
                    RecipientType   = "user",
                    Type            = "survey_scheduled",
                    Title           = "Izviđanje zakazano!",
                    Message         = $"Uplata uspešna. Izviđanje terena za \"{req?.Title}\" zakazano je za {dateStr}.",
                    RelatedEntityId = surveyId,
                }, user.Email ?? "");
            }

            if (craftsman != null)
            {
                await _notifications.SendAsync(new Notification
                {
                    RecipientId     = survey.CraftsmanId,
                    RecipientType   = "craftsman",
                    Type            = "survey_scheduled",
                    Title           = "Izviđanje zakazano!",
                    Message         = $"Korisnik je platio izviđanje terena za \"{req?.Title}\" — {dateStr}.",
                    RelatedEntityId = surveyId,
                }, craftsman.Email ?? "");
            }
        }

        public SiteSurvey? Get(int surveyId) => _surveyRepo.Get(surveyId);

        public SiteSurvey? GetByJobRequest(int jobRequestId) => _surveyRepo.GetByJobRequest(jobRequestId);

        public List<SiteSurvey> GetByUser(int userId) => _surveyRepo.GetByUser(userId);

        public List<SiteSurvey> GetByCraftsman(int craftsmanId) => _surveyRepo.GetByCraftsman(craftsmanId);

        public async Task ProposeRescheduleAsync(int surveyId, DateTime newDate, TimeSpan newTime, string proposedBy)
        {
            var survey = _surveyRepo.Get(surveyId)
                ?? throw new InvalidOperationException("Izviđanje nije pronađeno.");

            if (survey.Status != "zakazano")
                throw new InvalidOperationException("Pomeranje termina moguće je samo za zakazana izviđanja.");

            if (survey.RescheduleProposedBy != null)
                throw new InvalidOperationException("Već postoji predlog za pomeranje termina.");

            var ok = _surveyRepo.ProposeReschedule(surveyId, newDate, newTime, proposedBy);
            if (!ok) throw new InvalidOperationException("Predlog pomeranja nije uspeo.");

            var req = _requestRepo.Get(survey.JobRequestId);

            if (proposedBy == "craftsman")
            {
                var user      = _userRepo.Get(survey.UserId);
                var craftsman = _craftsmanRepo.Get(survey.CraftsmanId);
                if (user != null && craftsman != null)
                {
                    await _notifications.SendAsync(new Notification
                    {
                        RecipientId     = survey.UserId,
                        RecipientType   = "user",
                        Type            = "survey_reschedule_proposed",
                        Title           = "Predlog promene termina izviđanja",
                        Message         = $"{craftsman.FirstName} {craftsman.LastName} predlaže novi termin: {newDate:dd.MM.yyyy} u {newTime:hh\\:mm}.",
                        RelatedEntityId = surveyId,
                    }, user.Email ?? "");
                }
            }
            else
            {
                var craftsman = _craftsmanRepo.Get(survey.CraftsmanId);
                var user      = _userRepo.Get(survey.UserId);
                if (craftsman != null && user != null)
                {
                    await _notifications.SendAsync(new Notification
                    {
                        RecipientId     = survey.CraftsmanId,
                        RecipientType   = "craftsman",
                        Type            = "survey_reschedule_proposed",
                        Title           = "Predlog promene termina izviđanja",
                        Message         = $"{user.FirstName} {user.LastName} predlaže novi termin: {newDate:dd.MM.yyyy} u {newTime:hh\\:mm}.",
                        RelatedEntityId = surveyId,
                    }, craftsman.Email ?? "");
                }
            }
        }

        public async Task AcceptRescheduleAsync(int surveyId)
        {
            var survey = _surveyRepo.Get(surveyId)
                ?? throw new InvalidOperationException("Izviđanje nije pronađeno.");

            var proposedBy  = survey.RescheduleProposedBy;
            var newDateStr  = survey.RescheduleProposedDate?.ToString("dd.MM.yyyy") ?? "";

            var ok = _surveyRepo.AcceptReschedule(surveyId);
            if (!ok) throw new InvalidOperationException("Prihvatanje pomeranja nije uspelo.");

            if (proposedBy == "craftsman")
            {
                var craftsman = _craftsmanRepo.Get(survey.CraftsmanId);
                if (craftsman != null)
                {
                    await _notifications.SendAsync(new Notification
                    {
                        RecipientId     = survey.CraftsmanId,
                        RecipientType   = "craftsman",
                        Type            = "survey_reschedule_accepted",
                        Title           = "Predlog pomeranja prihvaćen",
                        Message         = $"Korisnik je prihvatio novi termin izviđanja: {newDateStr}.",
                        RelatedEntityId = surveyId,
                    }, craftsman.Email ?? "");
                }
            }
            else
            {
                var user = _userRepo.Get(survey.UserId);
                if (user != null)
                {
                    await _notifications.SendAsync(new Notification
                    {
                        RecipientId     = survey.UserId,
                        RecipientType   = "user",
                        Type            = "survey_reschedule_accepted",
                        Title           = "Predlog pomeranja prihvaćen",
                        Message         = $"Majstor je prihvatio novi termin izviđanja: {newDateStr}.",
                        RelatedEntityId = surveyId,
                    }, user.Email ?? "");
                }
            }
        }

        public async Task DeclineRescheduleAsync(int surveyId)
        {
            var survey = _surveyRepo.Get(surveyId)
                ?? throw new InvalidOperationException("Izviđanje nije pronađeno.");

            _surveyRepo.DeclineReschedule(surveyId); // otkazuje survey i briše predlog
            _requestRepo.UpdateStatus(survey.JobRequestId, "cancelled");

            var req       = _requestRepo.Get(survey.JobRequestId);
            var user      = _userRepo.Get(survey.UserId);
            var craftsman = _craftsmanRepo.Get(survey.CraftsmanId);

            if (user != null)
            {
                await _notifications.SendAsync(new Notification
                {
                    RecipientId     = survey.UserId,
                    RecipientType   = "user",
                    Type            = "survey_cancelled",
                    Title           = "Izviđanje otkazano",
                    Message         = $"Izviđanje za \"{req?.Title}\" otkazano je jer predlog za pomeranje termina nije prihvaćen. Novac će biti vraćen.",
                    RelatedEntityId = surveyId,
                }, user.Email ?? "");
            }

            if (craftsman != null)
            {
                await _notifications.SendAsync(new Notification
                {
                    RecipientId     = survey.CraftsmanId,
                    RecipientType   = "craftsman",
                    Type            = "survey_cancelled",
                    Title           = "Izviđanje otkazano",
                    Message         = $"Izviđanje za \"{req?.Title}\" otkazano je jer predlog za pomeranje termina nije prihvaćen.",
                    RelatedEntityId = surveyId,
                }, craftsman.Email ?? "");
            }
        }

        public async Task CompleteSurveyAsync(int surveyId, int estimatedMinutes)
        {
            var survey = _surveyRepo.Get(surveyId)
                ?? throw new InvalidOperationException("Izviđanje nije pronađeno.");

            if (survey.Status != "zakazano")
                throw new InvalidOperationException("Samo zakazana izviđanja mogu biti označena kao završena.");

            _surveyRepo.UpdateStatus(surveyId, "završeno");

            var req       = _requestRepo.Get(survey.JobRequestId);
            var craftsman = _craftsmanRepo.Get(survey.CraftsmanId);

            // Postavi procenu na job_request → vraća ga na "accepted" status (korisnik sad potvrđuje)
            if (req != null && craftsman != null)
            {
                decimal estimatedPrice = JobRequestService.CalculatePrice(estimatedMinutes, craftsman.HourlyRate);
                _requestRepo.SetEstimate(survey.JobRequestId, estimatedMinutes, estimatedPrice);

                var user = _userRepo.Get(survey.UserId);
                if (user != null)
                {
                    int h = estimatedMinutes / 60;
                    int m = estimatedMinutes % 60;
                    string timeStr = h > 0 ? $"{h}h {m}min" : $"{m}min";

                    await _notifications.SendAsync(new Notification
                    {
                        RecipientId     = survey.UserId,
                        RecipientType   = "user",
                        Type            = "survey_completed",
                        Title           = "Izviđanje završeno — majstor šalje ponudu za posao",
                        Message         = $"Majstor je završio izviđanje za \"{req.Title}\". " +
                                          $"Procenjeno vreme: {timeStr}, cena: {estimatedPrice:N0} RSD. " +
                                          $"Potvrdite zahtev u vašem nalogu.",
                        RelatedEntityId = req.RequestId,
                    }, user.Email ?? "");
                }
            }
        }

        public async Task CancelSurveyAsync(int surveyId, string cancelledBy)
        {
            var survey = _surveyRepo.Get(surveyId)
                ?? throw new InvalidOperationException("Izviđanje nije pronađeno.");

            if (survey.Status != "zakazano")
                throw new InvalidOperationException("Samo zakazana izviđanja mogu biti otkazana.");

            _surveyRepo.UpdateStatus(surveyId, "otkazano");
            var req = _requestRepo.Get(survey.JobRequestId);
            _requestRepo.UpdateStatus(survey.JobRequestId, "cancelled");

            var user      = _userRepo.Get(survey.UserId);
            var craftsman = _craftsmanRepo.Get(survey.CraftsmanId);

            if (user != null)
            {
                await _notifications.SendAsync(new Notification
                {
                    RecipientId     = survey.UserId,
                    RecipientType   = "user",
                    Type            = "survey_cancelled",
                    Title           = "Izviđanje otkazano",
                    Message         = cancelledBy == "craftsman"
                        ? $"Majstor je otkazao izviđanje za \"{req?.Title}\". Novac će biti vraćen na vašu karticu."
                        : $"Vaše izviđanje za \"{req?.Title}\" je otkazano. Novac će biti vraćen na vašu karticu.",
                    RelatedEntityId = surveyId,
                }, user.Email ?? "");
            }

            if (craftsman != null)
            {
                await _notifications.SendAsync(new Notification
                {
                    RecipientId     = survey.CraftsmanId,
                    RecipientType   = "craftsman",
                    Type            = "survey_cancelled",
                    Title           = "Izviđanje otkazano",
                    Message         = cancelledBy == "user"
                        ? $"Korisnik je otkazao izviđanje za \"{req?.Title}\"."
                        : $"Otkazali ste izviđanje za \"{req?.Title}\".",
                    RelatedEntityId = surveyId,
                }, craftsman.Email ?? "");
            }
        }

        public async Task AutoDeclineOverdueSurveysAsync()
        {
            var overdue = _surveyRepo.GetOverdueForAutoDecline();
            foreach (var survey in overdue)
                await CancelSurveyAsync(survey.SurveyId, "auto");
        }

        // ── Private helpers ────────────────────────────────────────────────────

        // Setuje samo survey_id kolonu bez promene statusa (za "predloženo" fazu)
        private void SetSurveyIdOnly(int jobRequestId, int surveyId)
        {
            using var conn = new Microsoft.Data.SqlClient.SqlConnection(WebProdavnica.Core.Constant.DataBaseConstant.ConnectionString);
            conn.Open();
            var cmd = conn.CreateCommand();
            cmd.CommandText = "UPDATE dbo.job_requests SET survey_id = @sid WHERE request_id = @id";
            cmd.Parameters.AddWithValue("@sid", surveyId);
            cmd.Parameters.AddWithValue("@id",  jobRequestId);
            cmd.ExecuteNonQuery();
        }
    }
}
