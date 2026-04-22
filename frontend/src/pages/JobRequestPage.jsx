import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Calendar, Clock, User, CheckCircle,
  XCircle, Loader2, Image, ChevronLeft, ChevronRight, X, Search, DollarSign
} from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const API_BASE = 'http://localhost:5114';

const STATUS_LABELS = {
  pending:              { label: 'Čeka odgovor',    color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  accepted:             { label: 'Prihvaćen',       color: 'bg-green-500/20 text-green-400 border-green-500/30'   },
  confirmed:            { label: 'Potvrđen',        color: 'bg-blue-500/20 text-blue-400 border-blue-500/30'      },
  declined_by_craftsman:{ label: 'Odbijen',         color: 'bg-red-500/20 text-red-400 border-red-500/30'         },
  declined_by_user:     { label: 'Korisnik odbio',  color: 'bg-red-500/20 text-red-400 border-red-500/30'         },
};

// Lightbox za slike
function ImageLightbox({ images, startIndex, onClose }) {
  const [current, setCurrent] = useState(startIndex);
  const prev = () => setCurrent((i) => (i - 1 + images.length) % images.length);
  const next = () => setCurrent((i) => (i + 1) % images.length);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <button onClick={onClose} className="absolute top-4 right-4 p-2 text-white/70 hover:text-white">
        <X className="w-7 h-7" />
      </button>
      {images.length > 1 && (
        <>
          <button onClick={(e) => { e.stopPropagation(); prev(); }} className="absolute left-4 p-2 text-white/70 hover:text-white">
            <ChevronLeft className="w-8 h-8" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); next(); }} className="absolute right-14 p-2 text-white/70 hover:text-white">
            <ChevronRight className="w-8 h-8" />
          </button>
        </>
      )}
      <img
        src={`${API_BASE}/${images[current]}`}
        alt={`slika-${current + 1}`}
        className="max-h-[85vh] max-w-full rounded-xl object-contain"
        onClick={(e) => e.stopPropagation()}
      />
      <p className="absolute bottom-4 text-white/50 text-sm">{current + 1} / {images.length}</p>
    </div>
  );
}

// Modal za unos procene vremena
function EstimateModal({ onConfirm, onCancel, loading }) {
  const [hours, setHours] = useState(1);
  const [minutes, setMinutes] = useState(0);

  const totalMinutes = hours * 60 + minutes;
  const isValid = totalMinutes >= 15;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-800 border border-gray-700 rounded-2xl w-full max-w-sm shadow-2xl p-6">
        <h3 className="text-white font-bold text-lg mb-1">Procenjeno vreme</h3>
        <p className="text-gray-400 text-sm mb-6">Koliko vam vremena treba za ovaj posao?</p>

        <div className="flex gap-4 mb-2">
          {/* Sati */}
          <div className="flex-1">
            <label className="text-xs text-gray-400 mb-1.5 block">Sati</label>
            <input
              type="number"
              min={0}
              max={23}
              value={hours}
              onChange={(e) => setHours(Math.max(0, Math.min(23, parseInt(e.target.value) || 0)))}
              className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2.5 text-white text-center text-lg font-bold focus:outline-none focus:border-blue-500 transition"
            />
          </div>
          <div className="flex items-end pb-2.5 text-gray-500 text-xl font-bold">:</div>
          {/* Minuti */}
          <div className="flex-1">
            <label className="text-xs text-gray-400 mb-1.5 block">Minuti</label>
            <select
              value={minutes}
              onChange={(e) => setMinutes(parseInt(e.target.value))}
              className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2.5 text-white text-center text-lg font-bold focus:outline-none focus:border-blue-500 transition"
            >
              {[0, 15, 30, 45].map((m) => (
                <option key={m} value={m}>{String(m).padStart(2, '0')}</option>
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
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            Potvrdi
          </button>
        </div>
      </div>
    </div>
  );
}

export default function JobRequestPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lightboxIndex, setLightboxIndex] = useState(null);
  const [showEstimateModal, setShowEstimateModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionDone, setActionDone] = useState(null); // 'accepted' | 'declined' | 'survey_proposed'

  const [showSurveyForm, setShowSurveyForm] = useState(false);
  const [surveyDate, setSurveyDate]         = useState('');
  const [surveyTime, setSurveyTime]         = useState('');
  const [surveyPrice, setSurveyPrice]       = useState('');

  const isCraftsman = user?.role === 'Craftsman';

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.getJobRequest(id);
        if (!res.success) throw new Error('Zahtev nije pronađen.');
        setRequest(res.data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const handleAccept = async (hours, mins) => {
    setActionLoading(true);
    try {
      await api.acceptJobRequest(id, hours, mins);
      setActionDone('accepted');
      setShowEstimateModal(false);
    } catch (err) {
      alert('Greška pri prihvatanju: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDecline = async () => {
    if (!confirm('Da li ste sigurni da želite da odbijete ovaj zahtev?')) return;
    setActionLoading(true);
    try {
      await api.declineJobRequest(id, 'craftsman');
      setActionDone('declined');
    } catch (err) {
      alert('Greška pri odbijanju: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleProposeSurvey = async () => {
    if (!surveyDate || !surveyPrice || Number(surveyPrice) <= 0) {
      alert('Unesite datum i cenu izviđanja.');
      return;
    }
    setActionLoading(true);
    try {
      const scheduledTime = surveyTime ? surveyTime + ':00' : null;
      await api.proposeSurvey(id, surveyDate, scheduledTime, Number(surveyPrice));
      setActionDone('survey_proposed');
    } catch (err) {
      alert('Greška pri slanju predloga: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // ── Ekrani za loading / error ─────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
        </div>
        <Footer />
      </div>
    );
  }

  if (error || !request) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-red-400 mb-4">{error || 'Zahtev nije pronađen.'}</p>
            <button onClick={() => navigate(-1)} className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition">Nazad</button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // ── Ekran nakon akcije ────────────────────────────────────────────────────

  if (actionDone) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-2xl p-10 max-w-md w-full text-center">
            {actionDone === 'accepted' ? (
              <>
                <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
                <h2 className="text-white font-bold text-2xl mb-2">Zahtev prihvaćen!</h2>
                <p className="text-gray-400">Korisnik će biti obavešten o vašoj proceni i ceni. Čekajte njegovu potvrdu.</p>
              </>
            ) : actionDone === 'survey_proposed' ? (
              <>
                <Search className="w-16 h-16 text-amber-400 mx-auto mb-4" />
                <h2 className="text-white font-bold text-2xl mb-2">Predlog poslat!</h2>
                <p className="text-gray-400">Korisnik će biti obavešten o predlogu za izviđanje. Čekajte njegovu potvrdu i uplatu.</p>
              </>
            ) : (
              <>
                <XCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
                <h2 className="text-white font-bold text-2xl mb-2">Zahtev odbijen</h2>
                <p className="text-gray-400">Korisnik će biti obavešten da ste odbili zahtev.</p>
              </>
            )}
            <button
              onClick={() => navigate('/dashboard')}
              className="mt-8 px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition"
            >
              Idi na Dashboard
            </button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // ── Prikaz zahteva ────────────────────────────────────────────────────────

  const statusMeta = STATUS_LABELS[request.status] ?? { label: request.status, color: 'bg-gray-500/20 text-gray-400 border-gray-500/30' };
  const scheduledFormatted = new Date(request.scheduledDate).toLocaleDateString('sr-RS', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex flex-col">
      <Header />

      <div className="flex-1 px-4 sm:px-6 lg:px-8 py-10">
        <div className="max-w-2xl mx-auto">

          {/* Nazad */}
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-400 hover:text-white transition mb-8 group">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Nazad
          </button>

          {/* Naslov + status */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-6 mb-4">
            <div className="flex items-start justify-between gap-4 mb-4">
              <h1 className="text-white font-bold text-2xl leading-tight">{request.title}</h1>
              <span className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-semibold border ${statusMeta.color}`}>
                {statusMeta.label}
              </span>
            </div>

            <div className="flex flex-wrap gap-4 text-sm text-gray-400">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" /> {scheduledFormatted}
              </span>
              <span className="flex items-center gap-1.5">
                <User className="w-4 h-4" /> Zahtev #{request.requestId}
              </span>
            </div>
          </div>

          {/* Opis */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-6 mb-4">
            <h2 className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-3">Opis posla</h2>
            <p className="text-white leading-relaxed whitespace-pre-wrap">{request.description}</p>
          </div>

          {/* Slike */}
          {request.imagePaths?.length > 0 && (
            <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-6 mb-4">
              <h2 className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-2">
                <Image className="w-4 h-4" /> Priložene slike ({request.imagePaths.length})
              </h2>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {request.imagePaths.map((path, i) => (
                  <button
                    key={i}
                    onClick={() => setLightboxIndex(i)}
                    className="aspect-square rounded-xl overflow-hidden border border-gray-600 hover:border-blue-500 transition group"
                  >
                    <img
                      src={`${API_BASE}/${path}`}
                      alt={`slika-${i + 1}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Procena (ako postoji) */}
          {request.estimatedMinutes != null && (
            <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-6 mb-4">
              <h2 className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4" /> Procena majstora
              </h2>
              <div className="flex gap-6">
                <div>
                  <p className="text-gray-400 text-xs mb-1">Vreme</p>
                  <p className="text-white font-bold text-xl">
                    {Math.floor(request.estimatedMinutes / 60)}h {request.estimatedMinutes % 60}min
                  </p>
                </div>
                {request.estimatedPrice != null && (
                  <div>
                    <p className="text-gray-400 text-xs mb-1">Procenjena cena</p>
                    <p className="text-white font-bold text-xl">
                      {Number(request.estimatedPrice).toLocaleString('sr-RS')} RSD
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Akcije — samo za majstora kad je status pending */}
          {isCraftsman && request.status === 'pending' && !showSurveyForm && (
            <div className="flex gap-3 mt-2">
              <button
                onClick={handleDecline}
                disabled={actionLoading}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl border border-red-500/40 text-red-400 hover:bg-red-500/10 transition font-semibold disabled:opacity-50"
              >
                <XCircle className="w-5 h-5" /> Odbij
              </button>
              <button
                onClick={() => setShowSurveyForm(true)}
                disabled={actionLoading}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl border border-amber-500/40 text-amber-400 hover:bg-amber-500/10 transition font-semibold disabled:opacity-50"
              >
                <Search className="w-5 h-5" /> Izviđanje
              </button>
              <button
                onClick={() => setShowEstimateModal(true)}
                disabled={actionLoading}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl bg-green-600 hover:bg-green-500 text-white font-semibold transition disabled:opacity-50"
              >
                <CheckCircle className="w-5 h-5" /> Prihvati
              </button>
            </div>
          )}

          {/* Forma za predlog izviđanja */}
          {isCraftsman && request.status === 'pending' && showSurveyForm && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-5 mt-2 space-y-4">
              <h3 className="text-amber-300 font-semibold flex items-center gap-2">
                <Search className="w-4 h-4" /> Predlog za izviđanje
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 mb-1.5 block">Datum*</label>
                  <input
                    type="date"
                    value={surveyDate}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={e => setSurveyDate(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500 transition"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1.5 block">Vreme (opciono)</label>
                  <input
                    type="time"
                    value={surveyTime}
                    onChange={e => setSurveyTime(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500 transition"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1.5 block">Cena izviđanja (RSD)*</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="number"
                    min={1}
                    value={surveyPrice}
                    onChange={e => setSurveyPrice(e.target.value)}
                    placeholder="npr. 2000"
                    className="w-full bg-gray-900 border border-gray-600 rounded-lg pl-9 pr-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500 transition"
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowSurveyForm(false)}
                  disabled={actionLoading}
                  className="flex-1 py-2.5 rounded-xl border border-gray-600 text-gray-300 hover:text-white transition text-sm font-medium disabled:opacity-50"
                >
                  Nazad
                </button>
                <button
                  onClick={handleProposeSurvey}
                  disabled={actionLoading || !surveyDate || !surveyPrice || Number(surveyPrice) <= 0}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold text-sm transition disabled:opacity-50"
                >
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  Pošalji predlog
                </button>
              </div>
            </div>
          )}

          {/* Info poruka ako nije majstor ili status nije pending */}
          {(!isCraftsman || request.status !== 'pending') && request.status !== 'accepted' && (
            <div className="mt-2 text-center text-gray-500 text-sm py-3">
              {request.status === 'confirmed' && 'Korisnik je potvrdio zahtev — posao je zakazan.'}
              {request.status === 'declined_by_craftsman' && 'Ovaj zahtev je odbijen.'}
              {request.status === 'declined_by_user' && 'Korisnik je odbio vašu ponudu.'}
              {request.status === 'survey_proposed' && 'Predlog za izviđanje je poslat — čekate korisnikovu potvrdu i uplatu.'}
              {request.status === 'survey_scheduled' && 'Izviđanje je zakazano.'}
            </div>
          )}

        </div>
      </div>

      <Footer />

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <ImageLightbox
          images={request.imagePaths}
          startIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}

      {/* Modal za procenu */}
      {showEstimateModal && (
        <EstimateModal
          onConfirm={handleAccept}
          onCancel={() => setShowEstimateModal(false)}
          loading={actionLoading}
        />
      )}
    </div>
  );
}
