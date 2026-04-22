import { useState, useEffect, useRef } from "react";
import { MessageCircle, Search, CheckCircle, Clock, AlertCircle, ChevronRight, Calendar, AlertTriangle, XCircle, CalendarClock } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";
// import UserProfile from "../components/UserProfile";
import ServicesTable from "../components/ServicesTable";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import ReviewForm from "../components/ReviewForm";
import RescheduleModal from "../components/RescheduleModal";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5114";
const AUTO_CONFIRM_SECONDS = 30 * 60; // 30 minutes

// Countdown card shown for each "Ceka potvrdu" job
function CaptureCard({ service, onCapture, capturing }) {
  const [secondsLeft, setSecondsLeft] = useState(null);
  const autoFiredRef = useRef(false);

  useEffect(() => {
    const base = service.endedAt ? new Date(service.endedAt).getTime() : Date.now();
    const deadline = base + AUTO_CONFIRM_SECONDS * 1000;

    const tick = () => {
      const remaining = Math.max(0, Math.floor((deadline - Date.now()) / 1000));
      setSecondsLeft(remaining);
      if (remaining === 0 && !autoFiredRef.current) {
        autoFiredRef.current = true;
        onCapture(service.jobId);
      }
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [service.endedAt, service.jobId]);

  const formatCountdown = (s) => {
    if (s === null) return "--:--";
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const isUrgent = secondsLeft !== null && secondsLeft < 120;

  return (
    <div className={`rounded-xl border p-5 flex flex-col sm:flex-row sm:items-center gap-4 ${
      isUrgent
        ? "bg-red-900/20 border-red-500/50"
        : "bg-yellow-900/20 border-yellow-500/40"
    }`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-white font-semibold">#{service.jobId}</span>
          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-600/20 text-purple-400 border border-purple-500/40">
            Čeka potvrdu
          </span>
          {service.urgent && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-600 text-white text-xs">
              <AlertCircle className="w-3 h-3" /> Hitno
            </span>
          )}
        </div>
        <p className="text-gray-300 text-sm truncate">{service.jobDescription || "Bez opisa"}</p>
        <p className="text-white font-bold text-lg mt-1">
          {service.totalPrice.toLocaleString()} RSD
        </p>
      </div>

      <div className="flex flex-col items-center gap-1 min-w-[90px]">
        <div className={`flex items-center gap-1.5 text-sm font-mono font-semibold ${isUrgent ? "text-red-400" : "text-yellow-400"}`}>
          <Clock className="w-4 h-4" />
          {formatCountdown(secondsLeft)}
        </div>
        <p className="text-gray-500 text-xs text-center">auto-potvrda</p>
      </div>

      <button
        onClick={() => onCapture(service.jobId)}
        disabled={capturing === service.jobId}
        className="flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-500 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-lg font-semibold text-sm transition"
      >
        <CheckCircle className="w-4 h-4" />
        {capturing === service.jobId ? "Obrađuje se..." : "Potvrdi"}
      </button>
    </div>
  );
}

export default function UserDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [userData, setUserData] = useState(null);
  const [originalUserData, setOriginalUserData] = useState(null);
  const [services, setServices] = useState([]);
  const [jobRequests, setJobRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [capturingId, setCapturingId] = useState(null);
  const [cancellingId, setCancellingId] = useState(null);
  const [requestActionId, setRequestActionId] = useState(null);
  const [reviewJobId, setReviewJobId] = useState(null);
  const [rescheduleJob, setRescheduleJob] = useState(null);
  const [rescheduleActionId, setRescheduleActionId] = useState(null);
  const [surveys, setSurveys] = useState([]);
  const [surveyActionId, setSurveyActionId] = useState(null);
  const [surveyRescheduleId, setSurveyRescheduleId] = useState(null);
  const [surveyRescheduleDate, setSurveyRescheduleDate] = useState("");
  const [surveyRescheduleTime, setSurveyRescheduleTime] = useState("");
  const [surveyRescheduling, setSurveyRescheduling] = useState(false);

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchJobs();
      fetchJobRequests();
      fetchSurveys();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      const response = await api.getUserProfile(user.id);
      const userProfile = response.data || response;
      setOriginalUserData(userProfile);
      setUserData({
        userId: userProfile.userId,
        firstName: userProfile.firstName,
        lastName: userProfile.lastName,
        email: userProfile.email,
        phone: userProfile.phone,
        location: userProfile.location || '',
      });
    } catch (err) {
      console.error('Error fetching profile:', err);
      setError('Greška pri učitavanju profila');
    }
  };

  const fetchJobRequests = async () => {
    try {
      const res = await api.getJobRequestsByUser(user.id);
      const list = res.data || res;
      const active = Array.isArray(list)
        ? list.filter(r => r.status === 'pending' || r.status === 'accepted')
        : [];
      setJobRequests(active);
    } catch {
      // Tiho ignoriši
    }
  };

  const fetchSurveys = async () => {
    try {
      const res = await api.getSurveysByUser(user.id);
      const list = res.data || res;
      setSurveys(Array.isArray(list) ? list : []);
    } catch {
      // Tiho ignoriši
    }
  };

  const handleConfirmRequest = async (req) => {
    setRequestActionId(req.requestId);
    try {
      await api.confirmJobRequest(req.requestId);
      const createRes = await api.createJobOrderFromRequest(req.requestId);
      if (!createRes.success) throw new Error('Kreiranje posla nije uspelo.');
      setJobRequests(prev => prev.filter(r => r.requestId !== req.requestId));
      navigate('/checkout', {
        state: {
          fromRequest: req,
          jobOrderId: createRes.jobOrderId,
        }
      });
    } catch (err) {
      alert('Greška: ' + err.message);
    } finally {
      setRequestActionId(null);
    }
  };

  const handleDeclineRequest = async (requestId) => {
    if (!confirm('Da li ste sigurni da želite da odbijete ponudu majstora?')) return;
    setRequestActionId(requestId);
    try {
      await api.declineJobRequest(requestId, 'user');
      setJobRequests(prev => prev.filter(r => r.requestId !== requestId));
    } catch (err) {
      alert('Greška: ' + err.message);
    } finally {
      setRequestActionId(null);
    }
  };

  const fetchJobs = async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await api.getJobOrdersByUser(user.id);
      const jobs = response.data || response;
      setServices(Array.isArray(jobs) ? jobs : []);
    } catch (err) {
      console.error('Error fetching jobs:', err);
      setError('Greška pri učitavanju poslova');
      setServices([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCapture = async (jobId) => {
    if (capturingId) return;
    setCapturingId(jobId);
    try {
      const res = await fetch(`${API_BASE}/api/payments/${jobId}/capture`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${user?.accessToken}` },
      });
      const data = await res.json();
      if (data.success) {
        await fetchJobs();
        setReviewJobId(jobId);
      } else {
        alert('Greška pri potvrdi plaćanja. Pokušajte ponovo.');
      }
    } catch (err) {
      alert('Greška: ' + err.message);
    } finally {
      setCapturingId(null);
    }
  };

  const handleCancel = async (jobId) => {
    if (!confirm('Da li ste sigurni da želite da otkažete posao? Novac će biti vraćen na vašu karticu.')) return;
    setCancellingId(jobId);
    try {
      const res = await fetch(`${API_BASE}/api/payments/${jobId}/cancel`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${user?.accessToken}` },
      });
      const data = await res.json();
      if (data.success) {
        await fetchJobs();
        alert('Posao je uspešno otkazan. Novac će biti vraćen na vašu karticu.');
      } else {
        alert(data.message || 'Greška pri otkazivanju posla.');
      }
    } catch (err) {
      alert('Greška: ' + err.message);
    } finally {
      setCancellingId(null);
    }
  };

  const handleProfileUpdate = async (updatedData) => {
    try {
      const userUpdate = {
        ...originalUserData,
        firstName: updatedData.firstName,
        lastName: updatedData.lastName,
        phone: updatedData.phone,
        location: updatedData.location,
      };
      const response = await api.updateUser(user.id, userUpdate);
      if (response.success) {
        setOriginalUserData(userUpdate);
        setUserData(updatedData);
        alert('Profil uspešno ažuriran!');
      }
    } catch (err) {
      console.error('Error updating profile:', err);
      alert('Greška pri ažuriranju profila: ' + err.message);
      throw err;
    }
  };

  const handleFindWorker = () => {
    navigate('/browse-tasks');
  };

  const handleAcceptReschedule = async (jobId) => {
    if (!confirm('Da li prihvatate predloženi novi termin?')) return;
    setRescheduleActionId(jobId);
    try {
      await api.acceptReschedule(jobId);
      await fetchJobs();
    } catch (err) {
      alert('Greška: ' + err.message);
    } finally {
      setRescheduleActionId(null);
    }
  };

  const handleDeclineReschedule = async (jobId) => {
    if (!confirm('Da li odbijate predlog? Posao će biti OTKAZAN.')) return;
    setRescheduleActionId(jobId);
    try {
      await api.declineReschedule(jobId);
      await fetchJobs();
    } catch (err) {
      alert('Greška: ' + err.message);
    } finally {
      setRescheduleActionId(null);
    }
  };

  const handleDeclineSurveyProposal = async (survey) => {
    if (!confirm('Da li odbijate predlog izviđanja? Predlog će biti poništen.')) return;
    setSurveyActionId(survey.surveyId);
    try {
      await api.declineSurveyProposal(survey.surveyId);
      await fetchSurveys();
    } catch (err) {
      alert('Greška: ' + err.message);
    } finally {
      setSurveyActionId(null);
    }
  };

  const handleAcceptSurveyProposal = (survey) => {
    navigate('/checkout', {
      state: {
        fromSurvey: true,
        survey: {
          surveyId: survey.surveyId,
          craftsmanId: survey.craftsmanId,
          scheduledDate: survey.scheduledDate,
          scheduledTime: survey.scheduledTime,
          surveyPrice: survey.surveyPrice,
          requestTitle: survey.jobRequest?.title,
        },
      },
    });
  };

  const handleCancelSurvey = async (survey) => {
    if (!confirm('Da li ste sigurni da želite da otkažete izviđanje? Novac će biti vraćen na vašu karticu.')) return;
    setSurveyActionId(survey.surveyId);
    try {
      await api.cancelSurvey(survey.surveyId, 'user');
      await fetchSurveys();
    } catch (err) {
      alert('Greška: ' + err.message);
    } finally {
      setSurveyActionId(null);
    }
  };

  const handleAcceptSurveyReschedule = async (survey) => {
    if (!confirm('Da li prihvatate predloženi novi termin?')) return;
    setSurveyActionId(survey.surveyId);
    try {
      await api.acceptSurveyReschedule(survey.surveyId);
      await fetchSurveys();
    } catch (err) {
      alert('Greška: ' + err.message);
    } finally {
      setSurveyActionId(null);
    }
  };

  const handleDeclineSurveyReschedule = async (survey) => {
    if (!confirm('Da li odbijate predlog? Izviđanje će biti OTKAZANO i novac vraćen.')) return;
    setSurveyActionId(survey.surveyId);
    try {
      await api.declineSurveyReschedule(survey.surveyId);
      await fetchSurveys();
    } catch (err) {
      alert('Greška: ' + err.message);
    } finally {
      setSurveyActionId(null);
    }
  };

  const handleProposeSurveyReschedule = async (surveyId) => {
    if (!surveyRescheduleDate) { alert('Izaberite datum.'); return; }
    setSurveyRescheduling(true);
    try {
      await api.proposeSurveyReschedule(surveyId, surveyRescheduleDate, surveyRescheduleTime || null, 'user');
      setSurveyRescheduleId(null);
      setSurveyRescheduleDate('');
      setSurveyRescheduleTime('');
      await fetchSurveys();
    } catch (err) {
      alert('Greška: ' + err.message);
    } finally {
      setSurveyRescheduling(false);
    }
  };

  const pendingConfirmation = services.filter(s => s.status === 'Ceka potvrdu');
  const scheduledJobs = services.filter(s => s.status?.toLowerCase() === 'zakazano');

  if (!userData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-400">Učitavanje...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex flex-col">
      <Header />

      <main className="flex-1 p-6 lg:p-10">
        <div className="max-w-6xl mx-auto">
          <div className="mb-6 flex justify-between items-center">
            <div className="text-white">
              <h1 className="text-2xl font-bold">Dobrodošli, {userData.firstName}!</h1>
              <p className="text-gray-300">Email: {userData.email}</p>
            </div>
            <Link to="/chat">
              <button className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition font-semibold">
                <MessageCircle className="w-5 h-5" />
                Moje Poruke
              </button>
            </Link>
          </div>

          {/* <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-8 border border-gray-700">
            <UserProfile
              data={userData}
              onUpdate={handleProfileUpdate}
            />
          </div>

          {error && (
            <div className="mt-6 bg-red-500/20 border border-red-500 rounded-2xl p-4">
              <p className="text-red-400">{error}</p>
            </div>
          )} */}

          {/* Zahtevi za posao — pending i accepted */}
          {jobRequests.length > 0 && (
            <div className="mt-10 bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 lg:p-8 border border-blue-500/30">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-pulse" />
                <h2 className="text-xl font-bold text-white">Zahtevi za posao</h2>
                <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400 text-sm font-semibold border border-blue-500/30">
                  {jobRequests.length}
                </span>
              </div>
              <div className="flex flex-col gap-3">
                {jobRequests.map((req) => (
                  <div
                    key={req.requestId}
                    className={`rounded-xl border p-4 flex flex-col sm:flex-row sm:items-center gap-4 transition ${
                      req.status === 'accepted'
                        ? 'bg-green-900/10 border-green-500/30'
                        : 'bg-blue-900/10 border-blue-500/20'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-white font-semibold truncate">{req.title}</span>
                        {req.status === 'pending' && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 flex-shrink-0">
                            Čeka majstora
                          </span>
                        )}
                        {req.status === 'accepted' && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/30 flex-shrink-0">
                            Majstor prihvatio
                          </span>
                        )}
                        {req.urgent && (
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-600 text-white text-xs flex-shrink-0">
                            <AlertTriangle className="w-3 h-3" /> Hitno
                          </span>
                        )}
                      </div>
                      <p className="text-gray-400 text-sm truncate">{req.description}</p>
                      <p className="text-gray-500 text-xs mt-1 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(req.scheduledDate).toLocaleDateString('sr-RS', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                      </p>

                      {/* Procena majstora */}
                      {req.status === 'accepted' && req.estimatedMinutes != null && (
                        <div className="mt-2 flex gap-4 text-sm">
                          <span className="text-gray-300">
                            Vreme: <span className="text-white font-medium">
                              {Math.floor(req.estimatedMinutes / 60)}h {req.estimatedMinutes % 60}min
                            </span>
                          </span>
                          {req.estimatedPrice != null && (
                            <span className="text-gray-300">
                              Cena: <span className="text-white font-medium">
                                {Number(req.estimatedPrice).toLocaleString('sr-RS')} RSD
                              </span>
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Akcije — samo za accepted */}
                    {req.status === 'accepted' && (
                      <div className="flex gap-2 flex-shrink-0">
                        <button
                          onClick={() => handleDeclineRequest(req.requestId)}
                          disabled={requestActionId === req.requestId}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-red-500/40 text-red-400 hover:bg-red-500/10 transition text-sm font-medium disabled:opacity-50"
                        >
                          <XCircle className="w-4 h-4" /> Odbij
                        </button>
                        <button
                          onClick={() => handleConfirmRequest(req)}
                          disabled={requestActionId === req.requestId}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white transition text-sm font-semibold disabled:opacity-50"
                        >
                          <CheckCircle className="w-4 h-4" />
                          {requestActionId === req.requestId ? 'Obrađuje...' : 'Prihvati'}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Predlozi za izviđanje — survey_proposed */}
          {surveys.filter(s => s.status === 'predloženo').length > 0 && (
            <div className="mt-10 bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 lg:p-8 border border-amber-500/30">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
                <h2 className="text-xl font-bold text-white">Predlozi za izviđanje</h2>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-sm font-semibold border border-amber-500/30">
                  {surveys.filter(s => s.status === 'predloženo').length}
                </span>
              </div>
              <p className="text-gray-400 text-sm mb-5">
                Majstor predlaže izviđanje terena pre nego što prihvati posao. Prihvatite i platite da biste zakazali izviđanje.
              </p>
              <div className="flex flex-col gap-3">
                {surveys.filter(s => s.status === 'predloženo').map(survey => {
                  const isActioning = surveyActionId === survey.surveyId;
                  return (
                    <div key={survey.surveyId} className="rounded-xl border border-amber-500/30 bg-amber-900/10 p-4">
                      <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="text-white font-semibold truncate">{survey.jobRequest?.title || 'Izviđanje terena'}</span>
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/20 text-amber-400 border border-amber-500/30 flex-shrink-0">
                              Predlog izviđanja
                            </span>
                          </div>
                          <p className="text-gray-400 text-sm">{survey.jobRequest?.description}</p>
                          <div className="mt-2 flex flex-wrap gap-4 text-sm">
                            <span className="text-gray-300 flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 text-gray-500" />
                              {new Date(survey.scheduledDate).toLocaleDateString('sr-RS', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                              {survey.scheduledTime && ` u ${survey.scheduledTime.slice(0, 5)}h`}
                            </span>
                            <span className="text-amber-300 font-semibold">
                              Cena izviđanja: {Number(survey.surveyPrice).toLocaleString('sr-RS')} RSD
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          <button
                            onClick={() => handleDeclineSurveyProposal(survey)}
                            disabled={isActioning}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-red-500/40 text-red-400 hover:bg-red-500/10 transition text-sm font-medium disabled:opacity-50"
                          >
                            <XCircle className="w-4 h-4" /> Odbij
                          </button>
                          <button
                            onClick={() => handleAcceptSurveyProposal(survey)}
                            disabled={isActioning}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white transition text-sm font-semibold disabled:opacity-50"
                          >
                            <CheckCircle className="w-4 h-4" />
                            {isActioning ? 'Obrađuje...' : 'Prihvati i plati'}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Zakazana izviđanja — survey_scheduled */}
          {surveys.filter(s => s.status === 'zakazano').length > 0 && (
            <div className="mt-10 bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 lg:p-8 border border-amber-500/20">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                <h2 className="text-xl font-bold text-white">Zakazana izviđanja</h2>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-sm font-semibold border border-amber-500/30">
                  {surveys.filter(s => s.status === 'zakazano').length}
                </span>
              </div>
              <p className="text-gray-400 text-sm mb-5">
                Majstor će doći na izviđanje, proceniti posao i predložiti termin i cenu.
              </p>
              <div className="flex flex-col gap-3">
                {surveys.filter(s => s.status === 'zakazano').map(survey => {
                  const hasPending = !!survey.rescheduleProposedBy;
                  const proposedByCraftsman = survey.rescheduleProposedBy === 'craftsman';
                  const isActioning = surveyActionId === survey.surveyId;
                  const isRescheduling = surveyRescheduleId === survey.surveyId;

                  const formatProposedDate = (date, time) => {
                    if (!date) return '';
                    const d = new Date(date).toLocaleDateString('sr-RS', { day: '2-digit', month: '2-digit', year: 'numeric' });
                    if (!time) return d;
                    const hm = typeof time === 'string' ? time.slice(0, 5) : '';
                    return `${d} u ${hm}h`;
                  };

                  const today = new Date().toISOString().slice(0, 10);

                  return (
                    <div key={survey.surveyId} className="rounded-xl border border-amber-500/20 bg-amber-900/10 p-4">
                      <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="text-white font-semibold">{survey.jobRequest?.title || 'Izviđanje terena'}</span>
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-600/20 text-amber-400 border border-amber-500/40">
                              Zakazano
                            </span>
                            {hasPending && (
                              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-600/20 text-purple-300 border border-purple-500/40">
                                Predlog termina
                              </span>
                            )}
                          </div>
                          <p className="text-gray-500 text-xs mt-1 flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            {new Date(survey.scheduledDate).toLocaleDateString('sr-RS', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                            {survey.scheduledTime && ` u ${survey.scheduledTime.slice(0, 5)}h`}
                          </p>
                          <p className="text-amber-300 font-semibold text-sm mt-1">
                            Cena izviđanja: {Number(survey.surveyPrice).toLocaleString('sr-RS')} RSD
                          </p>

                          {hasPending && proposedByCraftsman && (
                            <div className="mt-2 rounded-lg border border-purple-500/30 bg-purple-900/20 px-3 py-2 text-xs space-y-2">
                              <p className="font-semibold text-purple-300">Majstor predlaže novi termin:</p>
                              <p className="text-gray-300">{formatProposedDate(survey.rescheduleProposedDate, survey.rescheduleProposedTime)}</p>
                              <div className="flex gap-2 pt-1">
                                <button
                                  onClick={() => handleDeclineSurveyReschedule(survey)}
                                  disabled={isActioning}
                                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-red-500/40 text-red-400 hover:bg-red-500/10 transition text-xs font-medium disabled:opacity-50"
                                >
                                  <XCircle className="w-3.5 h-3.5" /> Odbij
                                </button>
                                <button
                                  onClick={() => handleAcceptSurveyReschedule(survey)}
                                  disabled={isActioning}
                                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-600/20 border border-green-500/40 text-green-400 hover:bg-green-600/40 transition text-xs font-medium disabled:opacity-50"
                                >
                                  <CheckCircle className="w-3.5 h-3.5" /> Prihvati
                                </button>
                              </div>
                            </div>
                          )}

                          {hasPending && !proposedByCraftsman && (
                            <div className="mt-2 rounded-lg border border-blue-500/30 bg-blue-900/20 px-3 py-2 text-xs">
                              <p className="text-blue-300">Vaš predlog čeka odgovor majstora: {formatProposedDate(survey.rescheduleProposedDate, survey.rescheduleProposedTime)}</p>
                            </div>
                          )}

                          {isRescheduling && (
                            <div className="mt-3 space-y-2">
                              <p className="text-gray-300 text-xs font-medium">Predloži novi termin:</p>
                              <div className="flex items-center gap-2">
                                <input
                                  type="date"
                                  min={today}
                                  value={surveyRescheduleDate}
                                  onChange={e => setSurveyRescheduleDate(e.target.value)}
                                  className="flex-1 px-3 py-1.5 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500"
                                />
                                <input
                                  type="time"
                                  value={surveyRescheduleTime}
                                  onChange={e => setSurveyRescheduleTime(e.target.value)}
                                  className="px-3 py-1.5 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500 w-28"
                                />
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleProposeSurveyReschedule(survey.surveyId)}
                                  disabled={surveyRescheduling || !surveyRescheduleDate}
                                  className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-semibold disabled:opacity-50"
                                >
                                  {surveyRescheduling ? '...' : 'Pošalji predlog'}
                                </button>
                                <button
                                  onClick={() => { setSurveyRescheduleId(null); setSurveyRescheduleDate(''); setSurveyRescheduleTime(''); }}
                                  className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg text-xs"
                                >
                                  Otkaži
                                </button>
                              </div>
                            </div>
                          )}
                        </div>

                        {!isRescheduling && (
                          <div className="flex gap-2 flex-shrink-0">
                            {!hasPending && (
                              <button
                                onClick={() => { setSurveyRescheduleId(survey.surveyId); setSurveyRescheduleDate(''); setSurveyRescheduleTime(''); }}
                                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-purple-500/40 text-purple-400 hover:bg-purple-500/10 transition text-sm font-medium"
                              >
                                <CalendarClock className="w-4 h-4" />
                                Pomeri
                              </button>
                            )}
                            <button
                              onClick={() => handleCancelSurvey(survey)}
                              disabled={isActioning || hasPending}
                              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-red-500/40 text-red-400 hover:bg-red-500/10 transition text-sm font-medium disabled:opacity-50"
                              title={hasPending ? 'Nije moguće otkazati dok postoji aktivan predlog' : ''}
                            >
                              <XCircle className="w-4 h-4" />
                              {isActioning ? 'Otkazuje...' : 'Otkaži'}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Pending confirmation panel */}
          {pendingConfirmation.length > 0 && (
            <div className="mt-10 bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 lg:p-8 border border-yellow-500/30">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-400 animate-pulse" />
                <h2 className="text-xl font-bold text-white">Potrebna potvrda</h2>
                <span className="px-2.5 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 text-sm font-semibold border border-yellow-500/30">
                  {pendingConfirmation.length}
                </span>
              </div>
              <p className="text-gray-400 text-sm mb-5">
                Majstor je završio posao. Potvrdite kako biste odobrili naplatu stvarnog iznosa.
                Ako ne potvrdite u roku od 30 minuta, naplate će biti automatski obrađena.
              </p>
              <div className="flex flex-col gap-3">
                {pendingConfirmation.map(service => (
                  <CaptureCard
                    key={service.jobId}
                    service={service}
                    onCapture={handleCapture}
                    capturing={capturingId}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Zakazani poslovi — sa mogućnošću otkazivanja u roku od 24h */}
          {scheduledJobs.length > 0 && (
            <div className="mt-10 bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 lg:p-8 border border-blue-500/30">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-400" />
                <h2 className="text-xl font-bold text-white">Zakazani poslovi</h2>
                <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400 text-sm font-semibold border border-blue-500/30">
                  {scheduledJobs.length}
                </span>
              </div>
              <p className="text-gray-400 text-sm mb-5">
                Poslovi koje čekaju na realizaciju. Možete otkazati u roku od 24h od zakazivanja i novac će biti vraćen.
              </p>
              <div className="flex flex-col gap-3">
                {scheduledJobs.map(service => {
                  const hasPending = !!service.rescheduleProposedBy;
                  const proposedByCraftsman = service.rescheduleProposedBy === 'craftsman';
                  const isActioning = rescheduleActionId === service.jobId;

                  const formatProposedDate = (date, time) => {
                    if (!date) return '';
                    const d = new Date(date).toLocaleDateString('sr-RS', { day: '2-digit', month: '2-digit', year: 'numeric' });
                    if (!time) return d;
                    const hm = typeof time === 'string' ? time.slice(0, 5) : '';
                    return `${d} u ${hm}h`;
                  };

                  return (
                    <div key={service.jobId} className="rounded-xl border border-blue-500/20 bg-blue-900/10 p-4">
                      <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="text-white font-semibold">#{service.jobId}</span>
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-600/20 text-blue-400 border border-blue-500/40">
                              Zakazano
                            </span>
                            {hasPending && (
                              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-600/20 text-purple-300 border border-purple-500/40">
                                Predlog termina
                              </span>
                            )}
                          </div>
                          <p className="text-gray-300 text-sm truncate">{service.title || service.jobDescription || 'Bez naziva'}</p>
                          <p className="text-gray-500 text-xs mt-1 flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            {new Date(service.scheduledDate).toLocaleDateString('sr-RS', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                          </p>
                          <p className="text-white font-bold text-base mt-1">{Number(service.totalPrice).toLocaleString()} RSD</p>

                          {/* Pending reschedule proposal od majstora */}
                          {hasPending && proposedByCraftsman && (
                            <div className="mt-2 rounded-lg border border-purple-500/30 bg-purple-900/20 px-3 py-2 text-xs space-y-2">
                              <p className="font-semibold text-purple-300">Majstor predlaže novi termin:</p>
                              <p className="text-gray-300">{formatProposedDate(service.rescheduleProposedDate, service.rescheduleProposedTime)}</p>
                              <div className="flex gap-2 pt-1">
                                <button
                                  onClick={() => handleDeclineReschedule(service.jobId)}
                                  disabled={isActioning}
                                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-red-500/40 text-red-400 hover:bg-red-500/10 transition text-xs font-medium disabled:opacity-50"
                                >
                                  <XCircle className="w-3.5 h-3.5" /> Odbij
                                </button>
                                <button
                                  onClick={() => handleAcceptReschedule(service.jobId)}
                                  disabled={isActioning}
                                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-600/20 border border-green-500/40 text-green-400 hover:bg-green-600/40 transition text-xs font-medium disabled:opacity-50"
                                >
                                  <CheckCircle className="w-3.5 h-3.5" /> Prihvati
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Čeka odgovor majstora na naš predlog */}
                          {hasPending && !proposedByCraftsman && (
                            <div className="mt-2 rounded-lg border border-blue-500/30 bg-blue-900/20 px-3 py-2 text-xs">
                              <p className="text-blue-300">Vaš predlog čeka odgovor majstora: {formatProposedDate(service.rescheduleProposedDate, service.rescheduleProposedTime)}</p>
                            </div>
                          )}
                        </div>

                        <div className="flex gap-2 flex-shrink-0">
                          {/* Pomeri termin — samo bez aktivnog predloga */}
                          {!hasPending && (
                            <button
                              onClick={() => setRescheduleJob(service)}
                              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-purple-500/40 text-purple-400 hover:bg-purple-500/10 transition text-sm font-medium flex-shrink-0"
                            >
                              <CalendarClock className="w-4 h-4" />
                              Pomeri
                            </button>
                          )}
                          <button
                            onClick={() => handleCancel(service.jobId)}
                            disabled={cancellingId === service.jobId || hasPending}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-red-500/40 text-red-400 hover:bg-red-500/10 transition text-sm font-medium disabled:opacity-50 flex-shrink-0"
                            title={hasPending ? 'Nije moguće otkazati dok postoji aktivan predlog' : ''}
                          >
                            <XCircle className="w-4 h-4" />
                            {cancellingId === service.jobId ? 'Otkazuje se...' : 'Otkaži'}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="mt-10 bg-gray-800/50 backdrop-blur-sm rounded-2xl p-8 border border-gray-700">
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-gray-400">Učitavanje poslova...</p>
              </div>
            ) : (
              <ServicesTable
                services={services}
                onAddService={handleFindWorker}
                buttonText="Pronađi Majstora"
                buttonIcon={<Search className="w-5 h-5" />}
              />
            )}
          </div>
        </div>
      </main>

      {reviewJobId && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <ReviewForm
            jobOrderId={reviewJobId}
            onReviewSubmitted={() => {
              setReviewJobId(null);
              alert('Hvala na oceni! Vaše mišljenje je važno.');
            }}
            onCancel={() => setReviewJobId(null)}
          />
        </div>
      )}

      {rescheduleJob && (
        <RescheduleModal
          job={rescheduleJob}
          craftsmanId={rescheduleJob.craftsmanId}
          proposedBy="user"
          onClose={() => setRescheduleJob(null)}
          onSuccess={() => { setRescheduleJob(null); fetchJobs(); }}
        />
      )}

      <Footer />
    </div>
  );
}