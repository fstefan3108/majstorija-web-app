import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, Calendar, Clock } from "lucide-react";

// ─── Konstante ────────────────────────────────────────────────────────────────
const DAY_NAMES_SHORT = ["Ned", "Pon", "Uto", "Sre", "Čet", "Pet", "Sub"];
const DAY_NAMES_FULL  = ["Nedelja", "Ponedeljak", "Utorak", "Sreda", "Četvrtak", "Petak", "Subota"];
const MONTH_NAMES = [
  "Januar","Februar","Mart","April","Maj","Jun",
  "Jul","Avgust","Septembar","Oktobar","Novembar","Decembar"
];

// Satnica za nedeljni prikaz (07:00 – 20:00)
const WEEK_HOURS = Array.from({ length: 14 }, (_, i) => i + 7);

function toDateKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function getWeekStart(d) {
  const copy = new Date(d);
  const day  = copy.getDay(); // 0=Sun
  copy.setDate(copy.getDate() - day);
  copy.setHours(0,0,0,0);
  return copy;
}
function addDays(d, n) {
  const c = new Date(d);
  c.setDate(c.getDate() + n);
  return c;
}
function timeToHour(timeStr) {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(":").map(Number);
  return h + m / 60;
}

// ─── CalendarGrid ─────────────────────────────────────────────────────────────
/**
 * Props:
 *   weeklySchedule  — [{ dayOfWeek: 0-6, startTime: "08:00", endTime: "17:00", isAvailable: bool }]
 *   jobSlots        — [{ jobId, date:"yyyy-MM-dd", startTime:"09:00", endTime:"12:00", title, clientName, clientAddress, status }]
 *   readOnly        — bool (true = samo prikaz, false = može kliknuti na dan)
 *   onDayClick      — (dateStr) => void — poziva se samo kad readOnly=false
 *   selectedDate    — "yyyy-MM-dd" | null — za ContactModal highlight
 */
export default function CalendarGrid({
  weeklySchedule = [],
  jobSlots = [],
  readOnly = true,
  onDayClick = null,
  selectedDate = null,
}) {
  const [view, setView]     = useState("month"); // "month" | "week"
  const [current, setCurrent] = useState(new Date());

  // ── Lookup mape ─────────────────────────────────────────────────────────────
  const scheduleByDow = useMemo(() => {
    const m = {};
    weeklySchedule.forEach(s => { m[s.dayOfWeek] = s; });
    return m;
  }, [weeklySchedule]);

  const slotsByDate = useMemo(() => {
    const m = {};
    jobSlots.forEach(s => {
      if (!m[s.date]) m[s.date] = [];
      m[s.date].push(s);
    });
    return m;
  }, [jobSlots]);

  // ── Navigacija ──────────────────────────────────────────────────────────────
  const prev = () => {
    if (view === "month") {
      const d = new Date(current);
      d.setMonth(d.getMonth() - 1);
      setCurrent(d);
    } else {
      setCurrent(addDays(current, -7));
    }
  };
  const next = () => {
    if (view === "month") {
      const d = new Date(current);
      d.setMonth(d.getMonth() + 1);
      setCurrent(d);
    } else {
      setCurrent(addDays(current, 7));
    }
  };
  const goToday = () => setCurrent(new Date());

  // ── Naslov ──────────────────────────────────────────────────────────────────
  const title = useMemo(() => {
    if (view === "month") {
      return `${MONTH_NAMES[current.getMonth()]} ${current.getFullYear()}`;
    }
    const ws = getWeekStart(current);
    const we = addDays(ws, 6);
    return `${ws.getDate()}. ${MONTH_NAMES[ws.getMonth()]} – ${we.getDate()}. ${MONTH_NAMES[we.getMonth()]} ${we.getFullYear()}`;
  }, [view, current]);

  // ── Boja dana (za mesečni prikaz) ───────────────────────────────────────────
  function getDayColor(dateStr, dow) {
    if (selectedDate === dateStr) return "ring-2 ring-blue-400";
    const sch = scheduleByDow[dow];
    const slots = slotsByDate[dateStr] || [];

    if (!sch || !sch.isAvailable) {
      // nije radni dan
      return "bg-gray-800/40 text-gray-600 cursor-not-allowed opacity-60";
    }
    if (slots.length > 0) {
      // ima zakazanih poslova — prikaži kao delimično popunjeno
      return "bg-red-900/30 border-red-500/40 hover:bg-red-900/50";
    }
    return "bg-green-900/20 border-green-500/30 hover:bg-green-900/40";
  }

  // ── MESEČNI PRIKAZ ──────────────────────────────────────────────────────────
  const MonthView = () => {
    const year  = current.getFullYear();
    const month = current.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const todayKey = toDateKey(new Date());

    const cells = [];
    // Praznine na početku
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));

    return (
      <div>
        {/* Header dana */}
        <div className="grid grid-cols-7 mb-1">
          {DAY_NAMES_SHORT.map(d => (
            <div key={d} className="text-center text-xs font-semibold text-gray-400 py-2">{d}</div>
          ))}
        </div>
        {/* Grid ćelija */}
        <div className="grid grid-cols-7 gap-1">
          {cells.map((date, i) => {
            if (!date) return <div key={`e-${i}`} />;
            const dateStr = toDateKey(date);
            const dow     = date.getDay();
            const sch     = scheduleByDow[dow];
            const slots   = slotsByDate[dateStr] || [];
            const isToday = dateStr === todayKey;
            const isWorking = sch && sch.isAvailable;
            const colorCls  = getDayColor(dateStr, dow);
            const isSelected = selectedDate === dateStr;

            return (
              <button
                key={dateStr}
                onClick={() => {
                  if (!readOnly && isWorking && onDayClick) onDayClick(dateStr);
                }}
                disabled={readOnly || !isWorking}
                className={`
                  relative flex flex-col items-center justify-start
                  rounded-xl border p-1.5 min-h-[56px] transition-all
                  ${colorCls}
                  ${isSelected ? "ring-2 ring-blue-400 bg-blue-900/30 border-blue-500" : "border-gray-700/50"}
                  ${isToday ? "ring-1 ring-yellow-400/60" : ""}
                `}
              >
                <span className={`text-xs font-bold mb-1 ${isToday ? "text-yellow-400" : isWorking ? "text-white" : "text-gray-600"}`}>
                  {date.getDate()}
                </span>
                {/* Prikaži max 2 slota */}
                {slots.slice(0, 2).map((s, si) => (
                  <div
                    key={si}
                    className="w-full text-[9px] leading-tight px-1 py-0.5 rounded bg-red-500/80 text-white truncate mb-0.5"
                    title={`${s.startTime}–${s.endTime} · ${s.title || ""} · ${s.clientName || ""}`}
                  >
                    {s.startTime} {s.title ? s.title.slice(0,10) : "Posao"}
                  </div>
                ))}
                {slots.length > 2 && (
                  <span className="text-[8px] text-red-300">+{slots.length - 2}</span>
                )}
                {/* Zelena tačka za slobodan radni dan */}
                {isWorking && slots.length === 0 && (
                  <div className="w-1.5 h-1.5 rounded-full bg-green-400 mt-auto" />
                )}
              </button>
            );
          })}
        </div>
        {/* Legenda */}
        <div className="flex gap-4 mt-4 text-xs text-gray-400">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-900/60 border border-green-500/40 inline-block"/>Slobodan dan</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-900/60 border border-red-500/40 inline-block"/>Zakazan posao</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-gray-800/80 border border-gray-700 inline-block"/>Neradan dan</span>
        </div>
      </div>
    );
  };

  // ── NEDELJNI PRIKAZ ─────────────────────────────────────────────────────────
  const WeekView = () => {
    const ws   = getWeekStart(current);
    const days = Array.from({ length: 7 }, (_, i) => addDays(ws, i));
    const todayKey = toDateKey(new Date());

    return (
      <div className="overflow-x-auto">
        <div className="min-w-[640px]">
          {/* Header — dani */}
          <div className="grid grid-cols-8 mb-1">
            <div className="text-xs text-gray-500 text-center py-2" />
            {days.map(d => {
              const dk = toDateKey(d);
              const isToday = dk === todayKey;
              return (
                <div key={dk} className={`text-center py-2 ${isToday ? "text-yellow-400 font-bold" : "text-gray-300"}`}>
                  <div className="text-xs">{DAY_NAMES_SHORT[d.getDay()]}</div>
                  <div className={`text-sm font-bold ${isToday ? "bg-yellow-400 text-gray-900 rounded-full w-7 h-7 flex items-center justify-center mx-auto" : ""}`}>
                    {d.getDate()}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Sati */}
          {WEEK_HOURS.map(h => (
            <div key={h} className="grid grid-cols-8 border-t border-gray-700/40">
              {/* Sat label */}
              <div className="text-[10px] text-gray-500 text-right pr-2 py-1 select-none">
                {String(h).padStart(2,"0")}:00
              </div>

              {/* Ćelije za svaki dan */}
              {days.map(d => {
                const dk  = toDateKey(d);
                const dow = d.getDay();
                const sch = scheduleByDow[dow];
                const slots = (slotsByDate[dk] || []).filter(s => {
                  const sh = timeToHour(s.startTime);
                  const eh = timeToHour(s.endTime);
                  return sh <= h && eh > h;
                });
                const isWorking = sch && sch.isAvailable &&
                  h >= timeToHour(sch.startTime) &&
                  h < timeToHour(sch.endTime);
                const isSlotStart = slots.some(s => timeToHour(s.startTime) === h);

                return (
                  <div
                    key={dk}
                    onClick={() => {
                      if (!readOnly && isWorking && slots.length === 0 && onDayClick)
                        onDayClick(dk);
                    }}
                    className={`
                      relative h-12 border-l border-gray-700/30 px-0.5
                      ${isWorking && slots.length === 0
                        ? "bg-green-900/10 hover:bg-green-900/30 cursor-pointer"
                        : ""}
                      ${!isWorking ? "bg-gray-800/20" : ""}
                      ${slots.length > 0 ? "bg-red-900/20" : ""}
                    `}
                  >
                    {isSlotStart && slots.map((s, si) => (
                      <div
                        key={si}
                        className="absolute inset-x-0.5 top-0.5 rounded bg-red-500/90 text-white text-[9px] px-1 py-0.5 leading-tight overflow-hidden z-10"
                        style={{
                          height: `${Math.max(1, timeToHour(s.endTime) - timeToHour(s.startTime)) * 48 - 4}px`,
                          maxHeight: "100%",
                        }}
                        title={`${s.startTime}–${s.endTime}\n${s.title || ""}\n${s.clientName || ""}\n${s.clientAddress || ""}`}
                      >
                        <div className="font-semibold truncate">{s.title || "Posao"}</div>
                        {s.clientName && <div className="opacity-80 truncate">{s.clientName}</div>}
                        {s.clientAddress && <div className="opacity-70 truncate">{s.clientAddress}</div>}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="bg-gray-900/60 rounded-2xl border border-gray-700 p-4 select-none">
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
        {/* Naslov + navigacija */}
        <div className="flex items-center gap-2">
          <button
            onClick={prev}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-white font-semibold text-sm min-w-[180px] text-center">{title}</span>
          <button
            onClick={next}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={goToday}
            className="ml-1 px-2 py-1 text-xs rounded-lg bg-gray-700 text-gray-300 hover:text-white hover:bg-gray-600 transition"
          >
            Danas
          </button>
        </div>

        {/* Toggle mesec/nedelja */}
        <div className="flex rounded-lg border border-gray-600 overflow-hidden text-xs">
          <button
            onClick={() => setView("month")}
            className={`px-3 py-1.5 flex items-center gap-1 transition ${view === "month" ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white hover:bg-gray-700"}`}
          >
            <Calendar className="w-3.5 h-3.5" />
            Mesec
          </button>
          <button
            onClick={() => setView("week")}
            className={`px-3 py-1.5 flex items-center gap-1 transition ${view === "week" ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white hover:bg-gray-700"}`}
          >
            <Clock className="w-3.5 h-3.5" />
            Nedelja
          </button>
        </div>
      </div>

      {/* Sadržaj */}
      {view === "month" ? <MonthView /> : <WeekView />}
    </div>
  );
}
