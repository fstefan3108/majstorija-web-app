import { useState, useEffect, useCallback } from "react";
import { Save, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import CalendarGrid from "../../CalendarGrid";

const API_BASE = "http://localhost:5114";

const DAYS = [
  { dow: 1, label: "Ponedeljak" },
  { dow: 2, label: "Utorak"    },
  { dow: 3, label: "Sreda"     },
  { dow: 4, label: "Četvrtak"  },
  { dow: 5, label: "Petak"     },
  { dow: 6, label: "Subota"    },
  { dow: 0, label: "Nedelja"   },
];

const DEFAULT_SCHEDULE = DAYS.map(d => ({
  dayOfWeek:   d.dow,
  startTime:   "08:00",
  endTime:     "17:00",
  isAvailable: d.dow >= 1 && d.dow <= 5, // pon-pet radni, sub-ned slobodni
}));

export default function AvailabilityTab({ craftsmanId }) {
  const [schedule,   setSchedule]   = useState(DEFAULT_SCHEDULE);
  const [jobSlots,   setJobSlots]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [saving,     setSaving]     = useState(false);
  const [saveStatus, setSaveStatus] = useState(null); // "ok" | "error" | null

  // ── Fetch rasporeda i poslova ─────────────────────────────────────────────
  const fetchCalendar = useCallback(async () => {
    if (!craftsmanId) return;
    setLoading(true);
    try {
      const from = new Date();
      const to   = new Date();
      to.setDate(to.getDate() + 60);
      const fmt  = d => d.toISOString().slice(0,10);

      const res  = await fetch(
        `${API_BASE}/api/craftsmen/${craftsmanId}/schedule/calendar?from=${fmt(from)}&to=${fmt(to)}`
      );
      if (!res.ok) throw new Error();
      const json = await res.json();

      if (json.data?.weeklySchedule?.length > 0) {
        // Merge server rasporeda sa default (da uvek imamo 7 dana)
        const serverByDow = {};
        json.data.weeklySchedule.forEach(s => {
          serverByDow[s.dayOfWeek] = {
            dayOfWeek:   s.dayOfWeek,
            startTime:   s.startTime?.slice(0,5) || "08:00",
            endTime:     s.endTime?.slice(0,5)   || "17:00",
            isAvailable: s.isAvailable,
          };
        });
        setSchedule(DAYS.map(d => serverByDow[d.dow] ?? DEFAULT_SCHEDULE.find(x => x.dayOfWeek === d.dow)));
      }

      setJobSlots(json.data?.jobSlots || []);
    } catch {
      // Tiho — ostaje default
    } finally {
      setLoading(false);
    }
  }, [craftsmanId]);

  useEffect(() => { fetchCalendar(); }, [fetchCalendar]);

  // ── Čuvanje rasporeda ─────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    setSaveStatus(null);
    try {
      const res = await fetch(`${API_BASE}/api/craftsmen/${craftsmanId}/schedule`, {
        method:  "PUT",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(schedule),
      });
      if (!res.ok) throw new Error();
      setSaveStatus("ok");
      setTimeout(() => setSaveStatus(null), 3000);
    } catch {
      setSaveStatus("error");
    } finally {
      setSaving(false);
    }
  };

  // ── Update jednog dana ────────────────────────────────────────────────────
  const updateDay = (dow, field, value) => {
    setSchedule(prev => prev.map(d =>
      d.dayOfWeek === dow ? { ...d, [field]: value } : d
    ));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">

      {/* ── Sekcija 1: Nedeljni raspored ──────────────────────────────────── */}
      <div className="bg-gray-900/40 rounded-2xl border border-gray-700 p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-white font-semibold text-lg">Radno vreme po danima</h3>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-semibold transition disabled:opacity-50"
          >
            {saving
              ? <><Loader2 className="w-4 h-4 animate-spin" />Čuva se...</>
              : <><Save className="w-4 h-4" />Sačuvaj raspored</>
            }
          </button>
        </div>

        {saveStatus === "ok" && (
          <div className="flex items-center gap-2 mb-4 text-green-400 text-sm bg-green-500/10 border border-green-500/30 rounded-lg px-4 py-2">
            <CheckCircle className="w-4 h-4" /> Raspored uspešno sačuvan!
          </div>
        )}
        {saveStatus === "error" && (
          <div className="flex items-center gap-2 mb-4 text-red-400 text-sm bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-2">
            <AlertCircle className="w-4 h-4" /> Greška pri čuvanju rasporeda.
          </div>
        )}

        <div className="space-y-3">
          {DAYS.map(({ dow, label }) => {
            const day = schedule.find(d => d.dayOfWeek === dow) || DEFAULT_SCHEDULE[0];
            return (
              <div
                key={dow}
                className={`flex items-center gap-4 p-3 rounded-xl border transition ${
                  day.isAvailable
                    ? "bg-green-900/10 border-green-500/20"
                    : "bg-gray-800/30 border-gray-700/30 opacity-60"
                }`}
              >
                {/* Toggle */}
                <button
                  onClick={() => updateDay(dow, "isAvailable", !day.isAvailable)}
                  className={`w-10 h-5 rounded-full relative transition-colors ${
                    day.isAvailable ? "bg-green-500" : "bg-gray-600"
                  }`}
                >
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                    day.isAvailable ? "translate-x-5" : "translate-x-0.5"
                  }`} />
                </button>

                {/* Naziv dana */}
                <span className="text-white text-sm font-medium w-24 flex-shrink-0">{label}</span>

                {/* Vreme */}
                {day.isAvailable ? (
                  <div className="flex items-center gap-2 flex-1">
                    <input
                      type="time"
                      value={day.startTime}
                      onChange={e => updateDay(dow, "startTime", e.target.value)}
                      className="bg-gray-800 border border-gray-600 text-white rounded-lg px-2 py-1 text-sm [color-scheme:dark]"
                    />
                    <span className="text-gray-500 text-sm">–</span>
                    <input
                      type="time"
                      value={day.endTime}
                      onChange={e => updateDay(dow, "endTime", e.target.value)}
                      className="bg-gray-800 border border-gray-600 text-white rounded-lg px-2 py-1 text-sm [color-scheme:dark]"
                    />
                    <span className="text-gray-500 text-xs ml-1">
                      ({Math.round((parseInt(day.endTime) - parseInt(day.startTime)))} h radnog vremena)
                    </span>
                  </div>
                ) : (
                  <span className="text-gray-500 text-sm italic">Neradan dan</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Sekcija 2: Pregled kalendara ──────────────────────────────────── */}
      <div>
        <h3 className="text-white font-semibold text-lg mb-4">Moj kalendar</h3>
        <CalendarGrid
          weeklySchedule={schedule}
          jobSlots={jobSlots}
          readOnly={true}
        />
      </div>

    </div>
  );
}
