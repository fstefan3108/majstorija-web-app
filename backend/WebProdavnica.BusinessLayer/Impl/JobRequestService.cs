using WebProdavnica.BusinessLayer.Abstract;
using WebProdavnica.DAL.Abstract;
using WebProdavnica.Entities;

namespace WebProdavnica.BusinessLayer.Impl
{
    public class JobRequestService : IJobRequestService
    {
        private readonly IJobRequestRepository _requestRepo;
        private readonly IJobOrderRepository _jobOrderRepo;
        private readonly IUserRepository _userRepo;
        private readonly ICraftsmanRepository _craftsmanRepo;
        private readonly INotificationService _notifications;

        public JobRequestService(
            IJobRequestRepository requestRepo,
            IJobOrderRepository jobOrderRepo,
            IUserRepository userRepo,
            ICraftsmanRepository craftsmanRepo,
            INotificationService notifications)
        {
            _requestRepo   = requestRepo;
            _jobOrderRepo  = jobOrderRepo;
            _userRepo      = userRepo;
            _craftsmanRepo = craftsmanRepo;
            _notifications = notifications;
        }

        public int Create(JobRequest request)
        {
            var id = _requestRepo.Add(request);

            // Notifikuj majstora
            var craftsman = _craftsmanRepo.Get(request.CraftsmanId);
            var user      = _userRepo.Get(request.UserId);
            if (craftsman != null)
            {
                _ = _notifications.SendAsync(new Notification
                {
                    RecipientId     = request.CraftsmanId,
                    RecipientType   = "craftsman",
                    Type            = "job_request_received",
                    Title           = "Novi zahtev za posao",
                    Message         = $"{user?.FirstName} {user?.LastName} vam je poslao/la zahtev za posao: \"{request.Title}\"",
                    RelatedEntityId = id,
                }, craftsman.Email ?? "");
            }

            return id;
        }

        public JobRequest? Get(int id) => _requestRepo.Get(id);

        public List<JobRequest> GetByUser(int userId) => _requestRepo.GetByUser(userId);

        public List<JobRequest> GetByCraftsman(int craftsmanId) => _requestRepo.GetByCraftsman(craftsmanId);

        public bool Accept(int requestId, int estimatedMinutes, decimal hourlyRate)
        {
            if (estimatedMinutes <= 0) return false;

            // Cena: minimum 1h, posle toga kvartovi od 15 minuta
            decimal estimatedPrice = CalculatePrice(estimatedMinutes, hourlyRate);

            var ok = _requestRepo.SetEstimate(requestId, estimatedMinutes, estimatedPrice);
            if (!ok) return false;

            // Notifikuj korisnika
            var req       = _requestRepo.Get(requestId);
            var craftsman = req != null ? _craftsmanRepo.Get(req.CraftsmanId) : null;
            var user      = req != null ? _userRepo.Get(req.UserId) : null;

            if (req != null && user != null && craftsman != null)
            {
                int h = estimatedMinutes / 60;
                int m = estimatedMinutes % 60;
                string timeStr = h > 0 ? $"{h}h {m}min" : $"{m}min";

                _ = _notifications.SendAsync(new Notification
                {
                    RecipientId     = req.UserId,
                    RecipientType   = "user",
                    Type            = "job_request_accepted",
                    Title           = "Majstor je prihvatio vaš zahtev",
                    Message         = $"{craftsman.FirstName} {craftsman.LastName} je prihvatio vaš zahtev \"{req.Title}\". " +
                                      $"Procenjeno vreme: {timeStr}, cena: {estimatedPrice:N0} RSD. " +
                                      $"Potvrdite zahtev u vašem nalogu.",
                    RelatedEntityId = requestId,
                }, user.Email ?? "");
            }

            return true;
        }

        public bool Decline(int requestId, string declinedBy)
        {
            var status = declinedBy == "craftsman"
                ? "declined_by_craftsman"
                : "declined_by_user";

            var ok = _requestRepo.UpdateStatus(requestId, status);
            if (!ok) return false;

            var req = _requestRepo.Get(requestId);
            if (req == null) return true;

            if (declinedBy == "craftsman")
            {
                // Obavesti korisnika da je majstor odbio
                var user      = _userRepo.Get(req.UserId);
                var craftsman = _craftsmanRepo.Get(req.CraftsmanId);
                if (user != null && craftsman != null)
                {
                    _ = _notifications.SendAsync(new Notification
                    {
                        RecipientId     = req.UserId,
                        RecipientType   = "user",
                        Type            = "job_request_declined",
                        Title           = "Zahtev odbijen",
                        Message         = $"{craftsman.FirstName} {craftsman.LastName} nije u mogućnosti da prihvati vaš zahtev \"{req.Title}\".",
                        RelatedEntityId = requestId,
                    }, user.Email ?? "");
                }
            }
            else
            {
                // Obavesti majstora da je korisnik odbio ponudu
                var craftsman = _craftsmanRepo.Get(req.CraftsmanId);
                var user      = _userRepo.Get(req.UserId);
                if (craftsman != null && user != null)
                {
                    _ = _notifications.SendAsync(new Notification
                    {
                        RecipientId     = req.CraftsmanId,
                        RecipientType   = "craftsman",
                        Type            = "job_request_declined",
                        Title           = "Korisnik je odbio vašu ponudu",
                        Message         = $"{user.FirstName} {user.LastName} je odbio/la vašu ponudu za posao \"{req.Title}\".",
                        RelatedEntityId = requestId,
                    }, craftsman.Email ?? "");
                }
            }

            return true;
        }

        public bool Confirm(int requestId)
        {
            // Samo menja status na 'confirmed' — JobOrder se kreira tek nakon placanja
            return _requestRepo.UpdateStatus(requestId, "confirmed");
        }

        public int CreateJobOrderFromRequest(int requestId)
        {
            var req = _requestRepo.Get(requestId)
                ?? throw new InvalidOperationException($"JobRequest {requestId} nije pronađen.");

            if (req.EstimatedMinutes == null || req.EstimatedPrice == null)
                throw new InvalidOperationException("Zahtev nema procenu majstora.");

            var craftsman = _craftsmanRepo.Get(req.CraftsmanId)
                ?? throw new InvalidOperationException("Majstor nije pronađen.");

            var jobOrder = new JobOrder
            {
                ScheduledDate    = req.ScheduledDate.Date,
                ScheduledTime    = req.ScheduledDate.TimeOfDay,   // vreme preuzeto iz datuma zahteva
                JobDescription   = req.Description,
                Status           = "zakazano",
                TotalPrice       = req.EstimatedPrice.Value,
                HourlyRate       = craftsman.HourlyRate,
                EstimatedHours   = req.EstimatedMinutes.Value / 60,
                EstimatedMinutes = req.EstimatedMinutes.Value,
                UserId           = req.UserId,
                CraftsmanId      = req.CraftsmanId,
                JobRequestId     = requestId,
            };

            _jobOrderRepo.Add(jobOrder);
            _requestRepo.SetJobOrderId(requestId, jobOrder.JobId);

            return jobOrder.JobId;
        }

        public void AddImage(int requestId, string filePath)
            => _requestRepo.AddImage(requestId, filePath);

        // ── Helpers ──────────────────────────────────────────────────────────

        /// <summary>
        /// Logika naplate:
        /// - Minimum 1 sat (60 min) = 1x satnica
        /// - Svaki zapoceti kvart od 15 minuta iznad 1h = +0.25 satnice
        /// </summary>
        public static decimal CalculatePrice(int totalMinutes, decimal hourlyRate)
        {
            if (totalMinutes <= 60)
                return hourlyRate; // Minimum 1h

            int extraMinutes = totalMinutes - 60;
            // Zaokruziti na sledeci kvart od 15 min (ceil)
            int quarters = (int)Math.Ceiling(extraMinutes / 15.0);
            return hourlyRate + (quarters * hourlyRate / 4m);
        }
    }
}
