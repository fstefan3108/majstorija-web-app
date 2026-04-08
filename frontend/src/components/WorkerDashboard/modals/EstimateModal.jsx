import { useState } from "react";
import { CheckCircle, Loader2 } from "lucide-react";

export default function EstimateModal({ onConfirm, onCancel, loading }) {
  const [hours, setHours] = useState(1);
  const [minutes, setMinutes] = useState(0);

  const totalMinutes = hours * 60 + minutes;
  const isValid = totalMinutes >= 15;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
      <div className="bg-gray-800 border border-gray-700 rounded-2xl w-full max-w-sm shadow-2xl p-6">
        <h3 className="text-white font-bold text-lg mb-1">Procenjeno vreme</h3>
        <p className="text-gray-400 text-sm mb-6">
          Koliko vam vremena treba za ovaj posao?
        </p>

        <div className="flex gap-4 mb-2">
          <div className="flex-1">
            <label className="text-xs text-gray-400 mb-1.5 block">Sati</label>
            <input
              type="number"
              min={0}
              max={23}
              value={hours}
              onChange={(e) =>
                setHours(Math.max(0, Math.min(23, parseInt(e.target.value) || 0)))
              }
              className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2.5 text-white text-center text-lg font-bold focus:outline-none focus:border-blue-500 transition"
            />
          </div>

          <div className="flex items-end pb-2.5 text-gray-500 text-xl font-bold">:</div>

          <div className="flex-1">
            <label className="text-xs text-gray-400 mb-1.5 block">Minuti</label>
            <select
              value={minutes}
              onChange={(e) => setMinutes(parseInt(e.target.value))}
              className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2.5 text-white text-center text-lg font-bold focus:outline-none focus:border-blue-500 transition"
            >
              {[0, 15, 30, 45].map((m) => (
                <option key={m} value={m}>
                  {String(m).padStart(2, "0")}
                </option>
              ))}
            </select>
          </div>
        </div>

        {!isValid && (
          <p className="text-red-400 text-xs mb-4">Minimum je 15 minuta.</p>
        )}

        <div className="flex gap-3 mt-6">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl border border-gray-600 text-gray-300 hover:text-white transition text-sm font-medium disabled:opacity-50"
          >
            Nazad
          </button>
          <button
            onClick={() => isValid && onConfirm(hours, minutes)}
            disabled={!isValid || loading}
            className="flex-1 py-2.5 rounded-xl bg-green-600 hover:bg-green-500 text-white font-semibold text-sm transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle className="w-4 h-4" />
            )}
            Potvrdi
          </button>
        </div>
      </div>
    </div>
  );
}