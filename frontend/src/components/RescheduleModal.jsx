import { useState, useEffect, useCallback } from "react";
import { X, CheckCircle, AlertCircle, Loader2, ChevronLeft, ChevronRight, Clock } from "lucide-react";

const API_BASE    = "http://localhost:5114";
const MONTH_NAMES = ["Januar","Februar","Mart","April","Maj","Jun","Jul","Avgust","Septembar","Oktobar","Novembar","Decembar"];
const DAY_SHORT   = ["Ned","Pon","Uto","Sre","Čet","Pet","Sub"];

function toDateKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

function MiniCalendar({ craftsmanId, selectedDate, onSelectDate }) {
  const [current,    setCurrent]    = useState(new Date());
  const [schedule,   setSchedule]   = useState([]);
  const [jobSlots,   setJobSlots]   = useState([]);
  const [loading,    setLoading]    = useState(false);

  const fetch_ = useCallback(async () => {
    if (!craftsmanId) return;
    setLoading(true);
    try {
      const year  = current.getFullYear();
      const month = current.getMonth();
      const from  = new Date(year, month, 1).toISOString().slice(0,10);
      const to    = new Date(year, month + 1, 0).toISOString().slice(0,10);
      const res   = await fetch(`${API_BASE}/api/craftsmen/${craftsmanId}/schedule/calendar?from=${from}&to=${to}`);
      if (!res.ok) throw new Error();
      const json  = await res.json();
      setSchedule(json.data?.weeklySchedule || []);
      setJobSlots(json.data?.jobSlots       || []);
    } catch { /* tiho */ } finally { setLoading(false); }
  }, [craftsmanId, current]);

  useEffect(() => { fetch_(); }, [fetch_]);

  const schedByDow  = {};
  schedule.forEach(s => { schedByDow[s.dayOfWeek] = s; });
  const slotsByDate = {};
  jobSlots.forEach(s => { if (!slotsByDate[s.date]) slotsByDate[s.date] = []; slotsByDate[s.date].push(s); });

  const year     = current.getFullYear();
  const month    = current.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInM  = new Date(year, month + 1, 0).getDate();
  const todayKey = toDateKey(new Date());
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInM; d++) cells.push(new Date(year, month, d));

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-700 p-3">
      <div className="flex items-center justify-between mb-2">
        <button onClick={() => { const d = new Date(current); d.setMonth(d.getMonth()-1); setCurrent(d); }}
          className="p-1 rounded text-gray-400 hover:text-white hover:bg-gray-700 transition">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-white text-sm font-semibold">
          {MONTH_NAMES[month]} {year}
          {loading && <span className="ml-1 text-gray-500 text-xs">...</span>}
        </span>
        <button onClick={() => { const d = new Date(current); d.setMonth(d.getMonth()+1); setCurrent(d); }}
          className="p-1 rounded text-gray-400 hover:text-white hover:bg-gray-700 transition">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
      <div className="grid grid-cols-7 mb-1">
        {DAY_SHORT.map(d => <div key={d} className="text-center text-[10px] font-semibold text-gray-500 py-1">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((date, i) => {
          if (!date) return <div key={`e-${i}`} />;
          const dk      = toDateKey(date);
          const dow     = date.getDay();
          const sch     = schedByDow[dow];
          const slots   = slotsByDate[dk] || [];
          const isPast  = date < tomorrow;
          const isWork  = sch && sch.isAvailable && !isPast;
          const hasSlots = slots.length > 0;
          const isSel    = selectedDate === dk;
          const isToday  = dk === todayKey;
          return (
            <button key={dk} onClick={() => { if (isWork) onSelectDate(dk); }} disabled={!isWork}
              className={`h-8 w-full rounded text-xs font-medium transition relative
                ${isSel                              ? "bg-blue-500 text-white ring-2 ring-blue-300" : ""}
                ${!isSel && isWork && !hasSlots      ? "bg-green-900/40 text-green-300 hover:bg-green-700/50" : ""}
                ${!isSel && isWork && hasSlots       ? "bg-amber-900/40 text-amber-300 hover:bg-amber-700/50" : ""}
                ${!isWork                            ? "text-gray-700 cursor-not-allowed" : ""}
                ${isToday && !isSel                  ? "ring-1 ring-yellow-400/50" : ""}
              `}
            >
              {date.getDate()}
              {isWork && !hasSlots && !isSel && <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-green-400" />}
              {isWork && hasSlots  && !isSel && <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-amber-400" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function TimePicker({ craftsmanId, selectedDate, selectedTime, onSelectTime }) {
  const [slots,   setSlots]   = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedDate || !craftsmanId) return;
    setLoading(true);
    fetch(`${API_BASE}/api/craftsmen/${craftsmanId}/schedule/available?date=${selectedDate}&durationHours=1`)
      .then(r => r.ok ? r.json() : { slots: [] })
      .then(j => setSlots(j.slots || []))
      .catch(() => setSlots([]))
      .finally(() => setLoading(false));
  }, [craftsmanId, selectedDate]);

  if (!selectedDate) return null;
  return (
    <div className="mt-3">
      <p className="text-xs text-gray-400 mb-2 flex items-center gap-1">
        <Clock className="w-3.5 h-3.5" /> Slobodni termini za {selectedDate.split("-").reverse().join(".")}:
      </p>
      {loading
        ? <span className="text-gray-500 text-xs flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin"/>Učitavanje...</span>
        : slots.length === 0
          ? <p className="text-gray-500 text-xs italic">Nema slobodnih termina.</p>
          : <div className="flex flex-wrap gap-2">
              {slots.map(t => (
                <button key={t} onClick={() => onSelectTime(t)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition ${
                    selectedTime === t
                      ? "bg-blue-600 border-blue-500 text-white"
                      : "bg-gray-800 border-gray-600 text-gray-300 hover:border-blue-500 hover:text-white"
                  }`}
                >{t}</button>
              ))}
            </div>
      }
    </div>
  );
}

// ─── RescheduleModal ──────────────────────────────────────────────────────────
// proposedBy: "craftsman" | "user" — ko inicira predlog
export default function RescheduleModal({ job, craftsmanId, proposedBy, onClose, onSuccess }) {
  const [newDate,  setNewDate]  = useState("");
  const [newTime,  setNewTime]  = useState("");
  const [saving,   setSaving]   = useState(false);
  const [status,   setStatus]   = useState(null); // "ok"|"error"|null
  const [errMsg,   setErrMsg]   = useState("");

  const handleSave = async () => {
    if (!newDate || !newTime) return;
    setSaving(true);
    setStatus(null);
    setErrMsg("");
    try {
      const res = await fetch(`${API_BASE}/api/joborders/${job.jobId}/propose-reschedule`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ newDate, newTime, proposedBy: proposedBy || "craftsman" }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Greška");
      setStatus("ok");
      setTimeout(() => { onSuccess?.(); onClose(); }, 2000);
    } catch (e) {
      setErrMsg(e.message || "Greška pri slanju predloga.");
      setStatus("error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-800 border border-gray-700 rounded-2xl w-full max-w-md shadow-2xl">

        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
          <div>
            <h2 className="text-white font-bold text-lg">Predloži novi termin</h2>
            <p className="text-gray-400 text-sm">Posao #{job.jobId} · {job.title || job.jobDescription || "Bez naziva"}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-gray-400 text-sm">
            Izaberite novi slobodan datum. Druga strana mora da prihvati predlog.
          </p>

          <MiniCalendar
            craftsmanId={craftsmanId}
            selectedDate={newDate}
            onSelectDate={d => { setNewDate(d); setNewTime(""); }}
          />

          <TimePicker
            craftsmanId={craftsmanId}
            selectedDate={newDate}
            selectedTime={newTime}
            onSelectTime={setNewTime}
          />

          {newDate && newTime && (
            <p className="text-green-400 text-xs flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5" />
              Predlog termina: {newDate.split("-").reverse().join(".")} u {newTime}h
            </p>
          )}

          {status === "ok" && (
            <div className="flex items-center gap-2 text-green-400 text-sm bg-green-500/10 border border-green-500/30 rounded-lg px-3 py-2">
              <CheckCircle className="w-4 h-4" /> Predlog je poslat! Čeka se odgovor druge strane.
            </div>
          )}
          {status === "error" && (
            <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
              <AlertCircle className="w-4 h-4" /> {errMsg || "Greška pri slanju predloga."}
            </div>
          )}
        </div>

        <div className="px-6 pb-5 flex gap-3">
          <button onClick={onClose} disabled={saving}
            className="flex-1 py-2.5 rounded-xl border border-gray-600 text-gray-300 hover:text-white hover:border-gray-500 transition text-sm font-medium disabled:opacity-50">
            Otkaži
          </button>
          <button onClick={handleSave} disabled={saving || !newDate || !newTime}
            className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-sm transition disabled:opacity-50 flex items-center justify-center gap-2">
            {saving ? <><Loader2 className="w-4 h-4 animate-spin"/>Šalje se...</> : "Pošalji predlog"}
          </button>
        </div>
      </div>
    </div>
  );
}
