import { Calendar, AlertTriangle, ChevronRight, InboxIcon } from "lucide-react";

export default function RequestsTab({ requests, onRequestClick }) {
  if (requests.length === 0) {
    return (
      <div className="text-center py-16">
        <InboxIcon className="w-12 h-12 text-gray-600 mx-auto mb-4" />
        <p className="text-gray-400 text-lg">Nema aktivnih zahteva za posao</p>
        <p className="text-gray-600 text-sm mt-1">
          Novi zahtevi od korisnika će se ovde pojaviti
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {requests.map((req) => (
        <button
          key={req.requestId}
          onClick={() => onRequestClick(req.requestId)}
          className="w-full text-left rounded-xl border p-4 flex items-center gap-4 transition hover:-translate-y-0.5 hover:shadow-lg bg-blue-900/10 border-blue-500/30 hover:border-blue-400/60"
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-white font-semibold truncate">{req.title}</span>

              {req.status === "pending" && (
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 flex-shrink-0">
                  Čeka odgovor
                </span>
              )}
              {req.status === "accepted" && (
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/30 flex-shrink-0">
                  Prihvaćen
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
              {new Date(req.scheduledDate).toLocaleDateString("sr-RS", {
                day: "2-digit", month: "2-digit", year: "numeric",
              })}
            </p>
          </div>

          <ChevronRight className="w-5 h-5 text-gray-500 flex-shrink-0" />
        </button>
      ))}
    </div>
  );
}