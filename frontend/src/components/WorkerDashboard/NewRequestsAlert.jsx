import { Bell, X } from "lucide-react";

export default function NewRequestsAlert({ count, onView, onDismiss }) {
  return (
    <div className="relative flex items-center gap-4 bg-blue-600/15 border border-blue-500/40 rounded-2xl px-5 py-4 mb-6 overflow-hidden">
      {/* Pulsing bell */}
      <div className="relative flex-shrink-0">
        <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
          <Bell className="w-5 h-5 text-blue-400" />
        </div>
        <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-blue-500 rounded-full animate-ping" />
        <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-blue-500 rounded-full" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-white font-semibold text-sm">
          {count === 1
            ? "Imate 1 novi zahtev za posao"
            : `Imate ${count} nova zahteva za posao`}
        </p>
        <p className="text-blue-300/70 text-xs mt-0.5">
          Kliknite na zahtev u tabeli ispod da ga pregledate
        </p>
      </div>

      <button
        onClick={onView}
        className="flex-shrink-0 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-lg transition"
      >
        Pogledaj
      </button>

      <button
        onClick={onDismiss}
        className="flex-shrink-0 p-1.5 text-blue-400/60 hover:text-blue-300 transition"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}