import { useState, useEffect } from "react";
import { Loader2, Search, CheckCircle, XCircle, CalendarClock } from "lucide-react";
import api from "../../../services/api";

export default function SurveysTab({ craftsmanId }) {
  const [surveys,             setSurveys]             = useState([]);
  const [surveysLoading,      setSurveysLoading]      = useState(false);
  const [surveyActionId,      setSurveyActionId]      = useState(null);
  const [completeSurveyId,    setCompleteSurveyId]    = useState(null);
  const [surveyEstimate,      setSurveyEstimate]      = useState("");
  const [completingId,        setCompletingId]        = useState(null);
  const [surveyRescheduleId,  setSurveyRescheduleId]  = useState(null);
  const [surveyRescheduleDate,setSurveyRescheduleDate]= useState("");
  const [surveyRescheduleTime,setSurveyRescheduleTime]= useState("");
  const [surveyRescheduling,  setSurveyRescheduling]  = useState(false);

  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    if (!craftsmanId) return;
    setSurveysLoading(true);
    api.getSurveysByCraftsman(craftsmanId)
      .then(res => {
        const list = res.data || res;
        setSurveys(Array.isArray(list) ? list.filter(s => s.status === "zakazano") : []);
      })
      .catch(() => setSurveys([]))
      .finally(() => setSurveysLoading(false));
  }, [craftsmanId]);

  const formatDate = (date, time) => {
    const d = new Date(date).toLocaleDateString("sr-RS", {
      day: "2-digit", month: "2-digit", year: "numeric"
    });
    if (!time) return d;
    return `${d} u ${time.slice(0, 5)}h`;
  };

  const formatProposedDate = (date, time) => {
    if (!date) return "";
    const d = new Date(date).toLocaleDateString("sr-RS", {
      day: "2-digit", month: "2-digit", year: "numeric"
    });
    if (!time) return d;
    const hm = typeof time === "string" ? time.slice(0, 5) : "";
    return `${d} u ${hm}h`;
  };

  const handleSurveyRescheduleAccept = async (survey) => {
    if (!confirm("Da li prihvatate predlog novog termina za izviđanje?")) return;
    setSurveyActionId(survey.surveyId);
    try {
      await api.acceptSurveyReschedule(survey.surveyId);
      window.location.reload();
    } catch (e) {
      alert("Greška: " + e.message);
    } finally {
      setSurveyActionId(null);
    }
  };

  const handleSurveyRescheduleDecline = async (survey) => {
    if (!confirm("Da li odbijate predlog? Izviđanje će biti OTKAZANO i novac vraćen korisniku.")) return;
    setSurveyActionId(survey.surveyId);
    try {
      await api.declineSurveyReschedule(survey.surveyId);
      window.location.reload();
    } catch (e) {
      alert("Greška: " + e.message);
    } finally {
      setSurveyActionId(null);
    }
  };

  const handleCompleteSurvey = async () => {
    const hours = parseFloat(surveyEstimate);
    if (!hours || hours <= 0) { alert("Unesite procenu vremena u satima (npr. 1.5 za sat i po)."); return; }
    const mins = Math.round(hours * 60);
    setCompletingId(completeSurveyId);
    try {
      await api.completeSurvey(completeSurveyId, mins);
      window.location.reload();
    } catch (e) {
      alert("Greška: " + e.message);
    } finally {
      setCompletingId(null);
      setCompleteSurveyId(null);
      setSurveyEstimate("");
    }
  };

  const handleSurveyRescheduleSubmit = async () => {
    if (!surveyRescheduleDate) { alert("Izaberite novi datum."); return; }
    setSurveyRescheduling(true);
    try {
      await api.proposeSurveyReschedule(surveyRescheduleId, surveyRescheduleDate, surveyRescheduleTime || null, "craftsman");
      window.location.reload();
    } catch (e) {
      alert("Greška: " + e.message);
    } finally {
      setSurveyRescheduling(false);
      setSurveyRescheduleId(null);
      setSurveyRescheduleDate("");
      setSurveyRescheduleTime("");
    }
  };

  if (surveysLoading) {
    return (
      <div className="text-center py-16">
        <Loader2 className="w-8 h-8 text-amber-500 animate-spin mx-auto mb-4" />
        <p className="text-gray-400">Učitavanje izviđanja...</p>
      </div>
    );
  }

  if (surveys.length === 0) {
    return (
      <div className="text-center py-16">
        <Search className="w-12 h-12 text-gray-600 mx-auto mb-4" />
        <p className="text-gray-400 text-lg">Nema zakazanih izviđanja</p>
        <p className="text-gray-600 text-sm mt-1">Zakazana izviđanja će se ovde pojaviti nakon što korisnik plati predlog</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {surveys.map(survey => {
        const hasPending     = !!survey.rescheduleProposedBy;
        const proposedByUser = survey.rescheduleProposedBy === "user";
        const isActioning    = surveyActionId === survey.surveyId;
        const isCompleting   = completeSurveyId === survey.surveyId;
        const isRescheduling = surveyRescheduleId === survey.surveyId;

        return (
          <div key={survey.surveyId} className="rounded-xl border border-amber-500/30 bg-amber-900/10 p-4">
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="text-amber-400 font-semibold text-xs uppercase tracking-wide">Izviđanje</span>
                  <span className="text-white font-semibold">#{survey.surveyId}</span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-600/20 text-amber-300 border border-amber-500/40">
                    Zakazano
                  </span>
                  {hasPending && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-600/20 text-purple-300 border border-purple-500/40">
                      Predlog termina
                    </span>
                  )}
                </div>
                <p className="text-white text-sm truncate mb-0.5">
                  {survey.jobRequest?.title || "Izviđanje terena"}
                </p>
                <p className="text-gray-400 text-xs">
                  Termin: {formatDate(survey.scheduledDate, survey.scheduledTime)}
                </p>
                <p className="text-amber-300 font-semibold text-sm mt-1">
                  Cena izviđanja: {Number(survey.surveyPrice).toLocaleString()} RSD
                </p>

                {hasPending && (
                  <div className={`mt-2 rounded-lg border px-3 py-2 text-xs space-y-1 ${
                    proposedByUser
                      ? "bg-purple-900/20 border-purple-500/30"
                      : "bg-blue-900/20 border-blue-500/30"
                  }`}>
                    <p className="font-semibold text-purple-300">
                      {proposedByUser ? "Korisnik predlaže novi termin:" : "Vaš predlog čeka odgovor:"}
                    </p>
                    <p className="text-gray-300">
                      {formatProposedDate(survey.rescheduleProposedDate, survey.rescheduleProposedTime)}
                    </p>
                  </div>
                )}

                {/* Inline complete form */}
                {isCompleting && (
                  <div className="mt-3 space-y-2">
                    <p className="text-gray-300 text-xs font-medium">Unesite procenu vremena za posao (u satima):</p>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0.25"
                        step="0.25"
                        placeholder="sati (npr. 2 ili 1.5)"
                        value={surveyEstimate}
                        onChange={e => setSurveyEstimate(e.target.value)}
                        className="flex-1 px-3 py-1.5 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-amber-500"
                      />
                      <button
                        onClick={handleCompleteSurvey}
                        disabled={completingId === survey.surveyId}
                        className="px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white rounded-lg text-xs font-semibold disabled:opacity-50 whitespace-nowrap"
                      >
                        {completingId === survey.surveyId ? "..." : "Potvrdi"}
                      </button>
                      <button
                        onClick={() => { setCompleteSurveyId(null); setSurveyEstimate(""); }}
                        className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg text-xs whitespace-nowrap"
                      >
                        Otkaži
                      </button>
                    </div>
                  </div>
                )}

                {/* Inline reschedule form */}
                {isRescheduling && (
                  <div className="mt-3 space-y-2">
                    <p className="text-gray-300 text-xs font-medium">Predloži novi termin izviđanja:</p>
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
                        onClick={handleSurveyRescheduleSubmit}
                        disabled={surveyRescheduling || !surveyRescheduleDate}
                        className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-semibold disabled:opacity-50"
                      >
                        {surveyRescheduling ? "..." : "Pošalji predlog"}
                      </button>
                      <button
                        onClick={() => { setSurveyRescheduleId(null); setSurveyRescheduleDate(""); setSurveyRescheduleTime(""); }}
                        className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg text-xs"
                      >
                        Otkaži
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex flex-col gap-2 items-end flex-shrink-0">
                {hasPending && proposedByUser && !isCompleting && !isRescheduling && (
                  <>
                    <button
                      onClick={() => handleSurveyRescheduleDecline(survey)}
                      disabled={isActioning}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white border border-red-500/40 rounded-lg text-xs font-semibold transition-all disabled:opacity-50"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      Odbij
                    </button>
                    <button
                      onClick={() => handleSurveyRescheduleAccept(survey)}
                      disabled={isActioning}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-green-600/20 hover:bg-green-600 text-green-400 hover:text-white border border-green-500/40 rounded-lg text-xs font-semibold transition-all disabled:opacity-50"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      Prihvati
                    </button>
                  </>
                )}

                {!hasPending && !isCompleting && !isRescheduling && (
                  <>
                    <button
                      onClick={() => { setCompleteSurveyId(survey.surveyId); setSurveyRescheduleId(null); setSurveyEstimate(""); }}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-green-600/20 hover:bg-green-600 text-green-400 hover:text-white border border-green-500/40 rounded-lg text-xs font-semibold transition-all"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      Završi
                    </button>
                    <button
                      onClick={() => { setSurveyRescheduleId(survey.surveyId); setCompleteSurveyId(null); setSurveyRescheduleDate(""); setSurveyRescheduleTime(""); }}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-purple-600/20 hover:bg-purple-600 text-purple-400 hover:text-white border border-purple-500/40 rounded-lg text-xs font-semibold transition-all"
                    >
                      <CalendarClock className="w-3.5 h-3.5" />
                      Pomeri
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
