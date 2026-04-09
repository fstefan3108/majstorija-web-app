import { Calendar, Star, History, Loader2 } from "lucide-react";

export default function HistoryTab({ services, isLoading }) {
  const finished = services.filter((s) => {
    const st = (s.status || "").toLowerCase();
    return st === "završeno" || st === "otkazano";
  });

  if (isLoading) {
    return (
      <div className="text-center py-16">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-4" />
        <p className="text-gray-400">Učitavanje poslova...</p>
      </div>
    );
  }

  if (finished.length === 0) {
    return (
      <div className="text-center py-16">
        <History className="w-12 h-12 text-gray-600 mx-auto mb-4" />
        <p className="text-gray-400 text-lg">Nema završenih poslova</p>
        <p className="text-gray-600 text-sm mt-1">
          Završeni poslovi i ocene će se ovde pojaviti
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {finished.map((job) => (
        <div
          key={job.jobId}
          className="bg-gray-800/40 border border-gray-700 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center gap-4"
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-white font-semibold truncate">
                {job.jobDescription || `Posao #${job.jobId}`}
              </span>
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-medium border
                  ${(job.status || "").toLowerCase() === "završeno"
                    ? "bg-green-500/20 text-green-400 border-green-500/30"
                    : "bg-red-500/20 text-red-400 border-red-500/30"
                  }`}
              >
                {job.status}
              </span>
            </div>

            <p className="text-gray-500 text-xs flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {new Date(job.scheduledDate).toLocaleDateString("sr-RS", {
                day: "2-digit", month: "2-digit", year: "numeric",
              })}
            </p>
          </div>

          {/* Cena + ocena */}
          <div className="flex items-center gap-6 flex-shrink-0">
            <div className="text-right">
              <p className="text-xs text-gray-500 mb-0.5">Zarada</p>
              <p className="text-white font-bold">
                {job.totalPrice?.toLocaleString()} RSD
              </p>
            </div>
            {job.rating != null && (
              <div className="flex items-center gap-1.5 bg-yellow-500/10 border border-yellow-500/30 rounded-lg px-3 py-1.5">
                <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                <span className="text-yellow-400 font-bold">
                  {Number(job.rating).toFixed(1)}
                </span>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}