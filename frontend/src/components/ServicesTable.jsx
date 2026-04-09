import { Plus, Play, Eye } from "lucide-react";
import { Link } from "react-router-dom";

const STATUS_STYLES = {
  "U toku":        "bg-blue-600/20 text-blue-400 border-blue-500/40",
  "Zakazano":      "bg-yellow-600/20 text-yellow-400 border-yellow-500/40",
  "Završeno":      "bg-green-600/20 text-green-400 border-green-500/40",
  "Otkazano":      "bg-red-600/20 text-red-400 border-red-500/40",
  "Pauzirano":     "bg-orange-600/20 text-orange-400 border-orange-500/40",
  "Ceka potvrdu":  "bg-purple-600/20 text-purple-400 border-purple-500/40",
};

export default function ServicesTable({
  services,
  onAddService,
  buttonText = "Dodaj Novi Posao",
  buttonIcon = <Plus className="w-5 h-5" />,
  isWorker = false,
}) {
  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('sr-RS', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  const timerLink = (service) => {
    const s = service.status;
    if (isWorker) {
      // Worker can open timer for zakazano (to start), U toku, Pauzirano
      if (s === 'Zakazano' || s === 'zakazano' || s === 'U toku' || s === 'Pauzirano') {
        return (
          <Link
            to={`/job-timer/${service.jobId}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-500/40 rounded-lg text-xs font-semibold transition-all"
          >
            <Play className="w-3.5 h-3.5" />
            Zapocni
          </Link>
        );
      }
    } else {
      // User — read-only view only when job is active
      if (s === 'U toku' || s === 'Pauzirano') {
        return (
          <Link
            to={`/job-timer/${service.jobId}?view=1`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-700/50 hover:bg-gray-600 text-gray-400 hover:text-white border border-gray-600 rounded-lg text-xs font-semibold transition-all"
          >
            <Eye className="w-3.5 h-3.5" />
            Pogledaj
          </Link>
        );
      }
    }
    return <span className="text-gray-600 text-xs">—</span>;
  };

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 lg:p-8 border border-gray-700">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-white">Evidencija Servisa</h2>
        {onAddService && (
          <button
            onClick={onAddService}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition font-semibold"
          >
            {buttonIcon}
            {buttonText}
          </button>
        )}
      </div>

      {services.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-300 text-lg mb-4">Nema poslova za prikaz</p>
          {onAddService && (
            <button
              onClick={onAddService}
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition font-semibold"
            >
              {buttonIcon}
              {buttonText}
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left text-gray-300 font-semibold py-3 px-4">ID</th>
                <th className="text-left text-gray-300 font-semibold py-3 px-4">Datum</th>
                <th className="text-left text-gray-300 font-semibold py-3 px-4">Naziv posla</th>
                <th className="text-left text-gray-300 font-semibold py-3 px-4">Status</th>
                <th className="text-right text-gray-300 font-semibold py-3 px-4">Cena</th>
                <th className="text-center text-gray-300 font-semibold py-3 px-4">
                  {isWorker ? 'Timer' : 'Pregled'}
                </th>
              </tr>
            </thead>
            <tbody>
              {services.map((service) => (
                <tr
                  key={service.jobId}
                  className="border-b border-gray-700/50 hover:bg-gray-700/20 transition"
                >
                  <td className="py-4 px-4">
                    <span className="text-white font-medium">#{service.jobId}</span>
                  </td>
                  <td className="py-4 px-4">
                    <span className="text-gray-300">{formatDate(service.scheduledDate)}</span>
                  </td>
                  <td className="py-4 px-4 max-w-[180px]">
                    <span className="text-white block truncate">{service.title || service.jobDescription || 'Bez naziva'}</span>
                  </td>
                  <td className="py-4 px-4">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium border ${STATUS_STYLES[service.status] || "bg-gray-700/30 text-gray-300 border-gray-600"}`}>
                      {service.status}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-right">
                    <span className="text-white font-semibold">{service.totalPrice.toLocaleString()} RSD</span>
                  </td>
                  <td className="py-4 px-4 text-center">
                    {timerLink(service)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
