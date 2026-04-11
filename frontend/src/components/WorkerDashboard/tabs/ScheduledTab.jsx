import { useState } from "react";
import { Briefcase, Loader2, Play, CalendarClock } from "lucide-react";
import { Link } from "react-router-dom";
import RescheduleModal from "../../RescheduleModal";

const STATUS_STYLES = {
  "U toku":       "bg-blue-600/20 text-blue-400 border-blue-500/40",
  "Zakazano":     "bg-yellow-600/20 text-yellow-400 border-yellow-500/40",
  "Pauzirano":    "bg-orange-600/20 text-orange-400 border-orange-500/40",
};

export default function ScheduledTab({ services, onDelete, isLoading, craftsmanId }) {
  const [rescheduleJob, setRescheduleJob] = useState(null);

  const scheduled = services.filter(s => {
    const st = (s.status || "").toLowerCase();
    return st === "zakazano" || st === "u toku" || st === "pauzirano";
  });

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

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="text-left text-gray-300 font-semibold py-3 px-4 text-sm">ID</th>
              <th className="text-left text-gray-300 font-semibold py-3 px-4 text-sm">Termin</th>
              <th className="text-left text-gray-300 font-semibold py-3 px-4 text-sm">Opis / Naziv</th>
              <th className="text-left text-gray-300 font-semibold py-3 px-4 text-sm">Status</th>
              <th className="text-right text-gray-300 font-semibold py-3 px-4 text-sm">Cena</th>
              <th className="text-center text-gray-300 font-semibold py-3 px-4 text-sm">Akcije</th>
            </tr>
          </thead>
          <tbody>
            {scheduled.map(s => {
              const isZakazano = (s.status || "").toLowerCase() === "zakazano";
              return (
                <tr key={s.jobId} className="border-b border-gray-700/50 hover:bg-gray-700/20 transition">
                  <td className="py-4 px-4">
                    <span className="text-white font-medium">#{s.jobId}</span>
                  </td>
                  <td className="py-4 px-4">
                    <span className="text-gray-300 text-sm">
                      {formatDate(s.scheduledDate, s.scheduledTime)}
                    </span>
                  </td>
                  <td className="py-4 px-4 max-w-[180px]">
                    <span className="text-white text-sm block truncate">
                      {s.title || s.jobDescription || "Bez naziva"}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${STATUS_STYLES[s.status] || "bg-gray-700/30 text-gray-300 border-gray-600"}`}>
                      {s.status}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-right">
                    <span className="text-white font-semibold text-sm">{s.totalPrice?.toLocaleString()} RSD</span>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center justify-center gap-2">
                      {/* Timer */}
                      <Link
                        to={`/job-timer/${s.jobId}`}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-500/40 rounded-lg text-xs font-semibold transition-all"
                      >
                        <Play className="w-3.5 h-3.5" />
                        Timer
                      </Link>

                      {/* Promeni termin — samo za "zakazano" */}
                      {isZakazano && (
                        <button
                          onClick={() => setRescheduleJob(s)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-purple-600/20 hover:bg-purple-600 text-purple-400 hover:text-white border border-purple-500/40 rounded-lg text-xs font-semibold transition-all"
                        >
                          <CalendarClock className="w-3.5 h-3.5" />
                          Pomeri
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {rescheduleJob && (
        <RescheduleModal
          job={rescheduleJob}
          craftsmanId={craftsmanId || rescheduleJob.craftsmanId}
          onClose={() => setRescheduleJob(null)}
          onSuccess={() => window.location.reload()}
        />
      )}
    </>
  );
}
