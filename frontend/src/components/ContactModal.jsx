import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Upload, Image, AlertCircle, CheckCircle, Loader2, Calendar, FileText, AlignLeft, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import api from '../services/api';

const MAX_IMAGES   = 5;
const MAX_SIZE_MB  = 5;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const API_BASE     = "http://localhost:5114";

const MONTH_NAMES  = ["Januar","Februar","Mart","April","Maj","Jun","Jul","Avgust","Septembar","Oktobar","Novembar","Decembar"];
const DAY_SHORT    = ["Ned","Pon","Uto","Sre","Čet","Pet","Sub"];

function toDateKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

// ─── Mini-kalendar za ContactModal ───────────────────────────────────────────
function MiniCalendar({ craftsmanId, selectedDate, onSelectDate, durationHours = 1 }) {
  const [current,      setCurrent]      = useState(new Date());
  const [schedule,     setSchedule]     = useState([]);
  const [jobSlots,     setJobSlots]     = useState([]);
  const [loadingCal,   setLoadingCal]   = useState(false);

  // Fetch calendar kad se promeni mesec
  const fetchCal = useCallback(async () => {
    if (!craftsmanId) return;
    setLoadingCal(true);
    try {
      const year  = current.getFullYear();
      const month = current.getMonth();
      const from  = new Date(year, month, 1).toISOString().slice(0,10);
      const to    = new Date(year, month + 1, 0).toISOString().slice(0,10);
      const res   = await fetch(`${API_BASE}/api/craftsmen/${craftsmanId}/schedule/calendar?from=${from}&to=${to}`);
      if (!res.ok) throw new Error();
      const json  = await res.json();
      setSchedule(json.data?.weeklySchedule  || []);
      setJobSlots(json.data?.jobSlots        || []);
    } catch { /* tiho */ }
    finally { setLoadingCal(false); }
  }, [craftsmanId, current]);

  useEffect(() => { fetchCal(); }, [fetchCal]);

  const schedByDow = {};
  schedule.forEach(s => { schedByDow[s.dayOfWeek] = s; });

  const slotsByDate = {};
  jobSlots.forEach(s => {
    if (!slotsByDate[s.date]) slotsByDate[s.date] = [];
    slotsByDate[s.date].push(s);
  });

  const year      = current.getFullYear();
  const month     = current.getMonth();
  const firstDay  = new Date(year, month, 1).getDay();
  const daysInM   = new Date(year, month + 1, 0).getDate();
  const todayKey  = toDateKey(new Date());
  const tomorrow  = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInM; d++) cells.push(new Date(year, month, d));

  const prev = () => { const d = new Date(current); d.setMonth(d.getMonth() - 1); setCurrent(d); };
  const next = () => { const d = new Date(current); d.setMonth(d.getMonth() + 1); setCurrent(d); };

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-700 p-3">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <button onClick={prev} className="p-1 rounded text-gray-400 hover:text-white hover:bg-gray-700 transition">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-white text-sm font-semibold">
          {MONTH_NAMES[month]} {year}
          {loadingCal && <span className="ml-2 text-gray-500 text-xs">...</span>}
        </span>
        <button onClick={next} className="p-1 rounded text-gray-400 hover:text-white hover:bg-gray-700 transition">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Dani header */}
      <div className="grid grid-cols-7 mb-1">
        {DAY_SHORT.map(d => (
          <div key={d} className="text-center text-[10px] font-semibold text-gray-500 py-1">{d}</div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((date, i) => {
          if (!date) return <div key={`e-${i}`} />;
          const dk    = toDateKey(date);
          const dow   = date.getDay();
          const sch   = schedByDow[dow];
          const slots = slotsByDate[dk] || [];
          const isPast= date < tomorrow;
          const isWorking  = sch && sch.isAvailable && !isPast;
          const hasSlots   = slots.length > 0;
          const isSelected = selectedDate === dk;
          const isToday    = dk === todayKey;

          return (
            <button
              key={dk}
              onClick={() => { if (isWorking) onSelectDate(dk); }}
              disabled={!isWorking}
              className={`
                relative h-8 w-full rounded text-xs font-medium transition
                ${isSelected ? "bg-blue-500 text-white ring-2 ring-blue-300" : ""}
                ${!isSelected && isWorking && !hasSlots  ? "bg-green-900/40 text-green-300 hover:bg-green-700/50" : ""}
                ${!isSelected && isWorking && hasSlots   ? "bg-amber-900/40 text-amber-300 hover:bg-amber-700/50" : ""}
                ${!isWorking  ? "text-gray-700 cursor-not-allowed" : ""}
                ${isToday && !isSelected ? "ring-1 ring-yellow-400/50" : ""}
              `}
            >
              {date.getDate()}
              {isWorking && !hasSlots && !isSelected && (
                <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-green-400" />
              )}
              {isWorking && hasSlots && !isSelected && (
                <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-amber-400" />
              )}
            </button>
          );
        })}
      </div>

      {/* Legenda */}
      <div className="flex gap-3 mt-2 text-[10px] text-gray-500 flex-wrap">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-green-700 inline-block"/>Slobodan</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-amber-700 inline-block"/>Delimično zauzet</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-gray-700 inline-block"/>Neradan</span>
      </div>
    </div>
  );
}

// ─── TimePicker za slobodne termine ──────────────────────────────────────────
function TimeSlotPicker({ craftsmanId, selectedDate, selectedTime, onSelectTime, durationHours = 1 }) {
  const [slots,   setSlots]   = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedDate || !craftsmanId) return;
    setLoading(true);
    fetch(`${API_BASE}/api/craftsmen/${craftsmanId}/schedule/available?date=${selectedDate}&durationHours=${durationHours}`)
      .then(r => r.ok ? r.json() : { data: { slots: [] } })
      .then(json => setSlots(json.slots || []))
      .catch(() => setSlots([]))
      .finally(() => setLoading(false));
  }, [craftsmanId, selectedDate, durationHours]);

  if (!selectedDate) return null;

  return (
    <div className="mt-2">
      <p className="text-xs text-gray-400 mb-2 flex items-center gap-1">
        <Clock className="w-3.5 h-3.5" />
        Slobodni termini za {selectedDate.split("-").reverse().join(".")}:
      </p>
      {loading ? (
        <div className="flex items-center gap-2 text-gray-500 text-xs">
          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Učitavanje...
        </div>
      ) : slots.length === 0 ? (
        <p className="text-gray-500 text-xs italic">Nema slobodnih termina za taj dan.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {slots.map(t => (
            <button
              key={t}
              onClick={() => onSelectTime(t)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition ${
                selectedTime === t
                  ? "bg-blue-600 border-blue-500 text-white"
                  : "bg-gray-800 border-gray-600 text-gray-300 hover:border-blue-500 hover:text-white"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── ContactModal ─────────────────────────────────────────────────────────────
export default function ContactModal({ craftsman, user, onClose, onSuccess }) {
  const [title,         setTitle]         = useState('');
  const [description,   setDescription]   = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [images,        setImages]        = useState([]);
  const [imageError,    setImageError]    = useState('');
  const [submitting,    setSubmitting]    = useState(false);
  const [submitted,     setSubmitted]     = useState(false);
  const [error,         setError]         = useState('');
  const fileInputRef = useRef(null);

  // Estimirano trajanje (u satima) — za provjeru slobodnih slotova
  const durationHours = 1;

  const handleImageAdd = (files) => {
    setImageError('');
    const incoming = Array.from(files);
    if (images.length + incoming.length > MAX_IMAGES) {
      setImageError(`Možete dodati maksimalno ${MAX_IMAGES} slika.`);
      return;
    }
    const validated = [];
    for (const file of incoming) {
      if (!ALLOWED_TYPES.includes(file.type)) { setImageError('Dozvoljeni formati: JPG, PNG, WEBP.'); return; }
      if (file.size > MAX_SIZE_MB * 1024 * 1024) { setImageError(`Maksimalna veličina po slici je ${MAX_SIZE_MB} MB.`); return; }
      validated.push({ file, previewUrl: URL.createObjectURL(file) });
    }
    setImages(prev => [...prev, ...validated]);
  };

  const handleDrop    = (e) => { e.preventDefault(); handleImageAdd(e.dataTransfer.files); };
  const removeImage   = (i)  => {
    setImages(prev => { URL.revokeObjectURL(prev[i].previewUrl); return prev.filter((_,j) => j !== i); });
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    setError('');
    if (!title.trim())                     { setError('Unesite naslov.'); return; }
    if (description.trim().length < 10)    { setError('Opis mora imati najmanje 10 karaktera.'); return; }
    if (!scheduledDate)                    { setError('Odaberite datum.'); return; }
    if (!scheduledTime)                    { setError('Odaberite termin (sat).'); return; }

    setSubmitting(true);
    try {
      // Kombinujemo datum i vreme u ISO string
      const isoDateTime = new Date(`${scheduledDate}T${scheduledTime}:00`).toISOString();

      const res = await api.createJobRequest({
        title:         title.trim(),
        description:   description.trim(),
        scheduledDate: isoDateTime,
        userId:        user.id,
        craftsmanId:   craftsman.craftsmanId,
      });
      if (!res.success) throw new Error(res.message || 'Greška pri kreiranju zahteva.');
      const requestId = res.requestId;
      for (const img of images) {
        await api.uploadJobRequestImage(requestId, img.file);
      }
      setSubmitted(true);
      setTimeout(() => onSuccess?.(), 3000);
    } catch (err) {
      setError(err.message || 'Desila se greška. Pokušajte ponovo.');
    } finally {
      setSubmitting(false);
    }
  };

  // Ekran uspešnog slanja
  if (submitted) {
    return (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-gray-800 border border-gray-700 rounded-2xl p-10 max-w-md w-full text-center shadow-2xl">
          <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
          <h2 className="text-white font-bold text-2xl mb-2">Zahtev poslat!</h2>
          <p className="text-gray-400">
            Vaš zahtev je uspešno poslat majstoru{' '}
            <span className="text-white font-medium">{craftsman.firstName} {craftsman.lastName}</span>.
            Bićete obavešteni čim majstor odgovori.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-800 border border-gray-700 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[92vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700 flex-shrink-0">
          <div>
            <h2 className="text-white font-bold text-lg">Kontaktiraj majstora</h2>
            <p className="text-gray-400 text-sm">{craftsman.firstName} {craftsman.lastName} · {craftsman.profession}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {/* Naslov */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-1.5">
              <FileText className="w-4 h-4" /> Naslov posla
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="npr. Popravka bojlera, Krečenje sobe..."
              maxLength={200}
              className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition text-sm"
            />
          </div>

          {/* Opis */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-1.5">
              <AlignLeft className="w-4 h-4" /> Opis posla
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Opišite šta je potrebno uraditi, u kakvom je stanju, posebne napomene..."
              rows={3}
              maxLength={2000}
              className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition text-sm resize-none"
            />
            <p className="text-right text-xs text-gray-500 mt-1">{description.length}/2000</p>
          </div>

          {/* Kalendar — biranje termina */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
              <Calendar className="w-4 h-4" /> Željeni termin
            </label>

            <MiniCalendar
              craftsmanId={craftsman.craftsmanId}
              selectedDate={scheduledDate}
              onSelectDate={date => { setScheduledDate(date); setScheduledTime(''); }}
              durationHours={durationHours}
            />

            {/* Slobodni termini za izabrani dan */}
            {scheduledDate && (
              <div className="mt-3 bg-gray-900/60 rounded-xl border border-gray-700 p-3">
                <TimeSlotPicker
                  craftsmanId={craftsman.craftsmanId}
                  selectedDate={scheduledDate}
                  selectedTime={scheduledTime}
                  onSelectTime={setScheduledTime}
                  durationHours={durationHours}
                />
              </div>
            )}

            {scheduledDate && scheduledTime && (
              <p className="text-green-400 text-xs mt-2 flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" />
                Izabran termin: {scheduledDate.split("-").reverse().join(".")} u {scheduledTime}h
              </p>
            )}
          </div>

          {/* Upload slika */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-1.5">
              <Image className="w-4 h-4" /> Slike{' '}
              <span className="text-gray-500 font-normal">({images.length}/{MAX_IMAGES})</span>
            </label>

            {images.length < MAX_IMAGES && (
              <div
                onDrop={handleDrop}
                onDragOver={e => e.preventDefault()}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-600 hover:border-blue-500 rounded-xl p-5 text-center cursor-pointer transition group"
              >
                <Upload className="w-6 h-6 text-gray-500 group-hover:text-blue-400 mx-auto mb-1 transition" />
                <p className="text-sm text-gray-400 group-hover:text-gray-300 transition">
                  Prevucite slike ovde ili <span className="text-blue-400">kliknite za odabir</span>
                </p>
                <p className="text-xs text-gray-600 mt-1">JPG, PNG, WEBP · max {MAX_SIZE_MB} MB</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  className="hidden"
                  onChange={e => handleImageAdd(e.target.files)}
                />
              </div>
            )}

            {images.length > 0 && (
              <div className="grid grid-cols-4 gap-2 mt-3">
                {images.map((img, i) => (
                  <div key={i} className="relative group aspect-square">
                    <img src={img.previewUrl} alt={`slika-${i+1}`} className="w-full h-full object-cover rounded-lg border border-gray-600" />
                    <button
                      type="button"
                      onClick={() => removeImage(i)}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 hover:bg-red-400 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                    >
                      <X className="w-3 h-3 text-white" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {imageError && (
              <p className="text-red-400 text-xs mt-2 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> {imageError}
              </p>
            )}
          </div>

          {/* Greška */}
          {error && (
            <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-700 flex gap-3 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="flex-1 py-2.5 rounded-xl border border-gray-600 text-gray-300 hover:text-white hover:border-gray-500 transition text-sm font-medium disabled:opacity-50"
          >
            Otkaži
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {submitting
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Šalje se...</>
              : 'Pošalji zahtev'
            }
          </button>
        </div>
      </div>
    </div>
  );
}
