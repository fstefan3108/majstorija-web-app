import { useState } from "react";
import { Briefcase, Loader2, Play, CalendarClock, CheckCircle, XCircle } from "lucide-react";
import { Link } from "react-router-dom";

const STATUS_STYLES = {
  "U toku":    "bg-blue-600/20 text-blue-400 border-blue-500/40",
  "Zakazano":  "bg-yellow-600/20 text-yellow-400 border-yellow-500/40",
  "Pauzirano": "bg-orange-600/20 text-orange-400 border-orange-500/40",
};

export default function ScheduledTab({ services, onDelete, isLoading, craftsmanId, onReschedule }) {
  const [actionId, setActionId] = useState(null);

  const scheduled = services.filter(s => {
    const st = (s.status || "").toLowerCase();
    return st === "zakazano" || st === "u toku" || st === "pauzirano";
  });

  const handleAcceptReschedule = async (job) => {
    if (!confirm("Da li prihvatate novi predloženi termin?")) return;
    setActionId(job.jobId);
    try {
      await api.acceptReschedule(job.jobId);
      window.location.reload();
    } catch (e) {
      alert("Greška: " + e.message);
    } finally {
      setActionId(null);
    }
  };

  const handleDeclineReschedule = async (job) => {
    if (!confirm("Da li odbijate predlog? Posao će biti OTKAZAN.")) return;
    setActionId(job.jobId);
    try {
      await api.declineReschedule(job.jobId);
      window.location.reload();
    } catch (e) {
      alert("Greška: " + e.message);
    } finally {
      setActionId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-16">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-4" />
        <p className="text-gray-400">Učitavanje poslova...</p>
      </div>
    );
  }

  if (scheduled.length === 0) {
    return (
      <div className="text-center py-16">
        <Briefcase className="w-12 h-12 text-gray-600 mx-auto mb-4" />
        <p className="text-gray-400 text-lg">Nema zakazanih poslova</p>
        <p className="text-gray-600 text-sm mt-1">
          Zakazani poslovi će se ovde pojaviti nakon što korisnik potvrdi zahtev
        </p>
      </div>
    );
  }

  const formatDate = (date, time) => {
    const d = new Date(date).toLocaleDateString("sr-RS", {
      day: "2-digit", month: "2-digit", year: "numeric"
    });
    if (!time) return d;
    const hm = time.slice(0, 5);
    return `${d} u ${hm}h`;
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

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-3">
      {/* ── Job orders ── */}
      {scheduled.map(s => {
        const isZakazano  = (s.status || "").toLowerCase() === "zakazano";
        const hasPending  = !!s.rescheduleProposedBy;
        const proposedByUser = s.rescheduleProposedBy === "user";
        const isActioning = actionId === s.jobId;

        return (
          <div key={s.jobId} className="rounded-xl border border-gray-700/60 bg-gray-800/40 p-4">
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="text-white font-semibold">#{s.jobId}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${STATUS_STYLES[s.status] || "bg-gray-700/30 text-gray-300 border-gray-600"}`}>
                    {s.status}
                  </span>
                  {hasPending && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-600/20 text-purple-300 border border-purple-500/40">
                      Predlog termina
                    </span>
                  )}
                </div>
                <p className="text-white text-sm truncate mb-0.5">
                  {s.title || s.jobDescription || "Bez naziva"}
                </p>
                <p className="text-gray-400 text-xs">
                  Termin: {formatDate(s.scheduledDate, s.scheduledTime)}
                </p>
                <p className="text-white font-semibold text-sm mt-1">
                  {s.totalPrice?.toLocaleString()} RSD
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
                      {formatProposedDate(s.rescheduleProposedDate, s.rescheduleProposedTime)}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex flex-row gap-2 items-center flex-shrink-0">
                <Link
                  to={`/job-timer/${s.jobId}`}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-500/40 rounded-lg text-xs font-semibold transition-all"
                >
                  <Play className="w-3.5 h-3.5" />
                  Timer
                </Link>

                {isZakazano && hasPending && proposedByUser && (
                  <>
                    <button
                      onClick={() => handleDeclineReschedule(s)}
                      disabled={isActioning}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white border border-red-500/40 rounded-lg text-xs font-semibold transition-all disabled:opacity-50"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      Odbij
                    </button>
                    <button
                      onClick={() => handleAcceptReschedule(s)}
                      disabled={isActioning}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-green-600/20 hover:bg-green-600 text-green-400 hover:text-white border border-green-500/40 rounded-lg text-xs font-semibold transition-all disabled:opacity-50"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      Prihvati
                    </button>
                  </>
                )}

                {isZakazano && !hasPending && (
                  <button
                    onClick={() => onReschedule(s)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-purple-600/20 hover:bg-purple-600 text-purple-400 hover:text-white border border-purple-500/40 rounded-lg text-xs font-semibold transition-all"
                  >
                    <CalendarClock className="w-3.5 h-3.5" />
                    Pomeri
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}

    </div>
  );
}
