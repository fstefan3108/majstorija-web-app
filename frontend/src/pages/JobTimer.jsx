import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Play, Pause, Square, Clock, Loader2, CheckCircle, AlertTriangle } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';

const API_BASE = 'http://localhost:5114';
const MAX_OVERTIME_SECONDS = 2 * 3600; // 2h max extension

const formatTime = (totalSeconds) => {
  const abs = Math.abs(totalSeconds);
  const h = Math.floor(abs / 3600);
  const m = Math.floor((abs % 3600) / 60);
  const s = abs % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

// Min 1h billing, then each 15-min quarter above 1h = +hourlyRate/4
const calculatePrice = (totalSeconds, hourlyRate) => {
  const totalMinutes = Math.ceil(totalSeconds / 60);
  if (totalMinutes <= 60) return hourlyRate;
  const quartersAboveHour = Math.ceil((totalMinutes - 60) / 15);
  return hourlyRate + quartersAboveHour * (hourlyRate / 4);
};

export default function JobTimer() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isReadOnly = searchParams.get('view') === '1';

  const [job, setJob] = useState(null);
  const [accumulated, setAccumulated] = useState(0);
  const [intervalStartedAt, setIntervalStartedAt] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [actionLoading, setActionLoading] = useState(false);
  const [finishResult, setFinishResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionError, setActionError] = useState(null);
const timerRef = useRef(null);

  const status = job?.status?.toLowerCase() ?? '';
  const isNotStarted = !intervalStartedAt && accumulated === 0 && status !== 'pauzirano' && status !== 'ceka potvrdu';
  const isActive = !!intervalStartedAt;
  const isPaused = !intervalStartedAt && accumulated > 0 && status !== 'ceka potvrdu';
  const isAwaiting = status === 'ceka potvrdu';

  // Estimated seconds from craftsman's estimate
  const estimatedSeconds = job?.estimatedMinutes != null
    ? job.estimatedMinutes * 60
    : (job?.estimatedHours ?? 0) * 3600;

  // remaining: positive = time left, negative = overtime
  const remaining = estimatedSeconds - elapsed;
  const isOvertime = elapsed > 0 && remaining < 0;
  const overtimeSeconds = isOvertime ? Math.abs(remaining) : 0;
  const isNearLimit = overtimeSeconds >= MAX_OVERTIME_SECONDS * 0.9;

  // Current price using the billing formula
  const currentPrice = elapsed > 0 ? calculatePrice(elapsed, job?.hourlyRate ?? 0) : 0;

  // Today check
  const isScheduledToday = job
    ? new Date(job.scheduledDate).toDateString() === new Date().toDateString()
    : null;

  const loadTimerState = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/joborders/${jobId}/timer-state`);
      const data = await res.json();
      setJob(data);
      setAccumulated(data.accumulatedSeconds);
      setIntervalStartedAt(data.currentIntervalStartedAt);
      if (data.currentIntervalStartedAt) {
        const diff = Math.floor((Date.now() - new Date(data.currentIntervalStartedAt).getTime()) / 1000);
        setElapsed(data.accumulatedSeconds + Math.max(0, diff));
      } else {
        setElapsed(data.accumulatedSeconds);
      }
    } catch {
      setError('Nije moguće učitati podatke o poslu.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadTimerState(); }, [jobId]);

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (!intervalStartedAt) return;

    timerRef.current = setInterval(() => {
      const diff = Math.floor((Date.now() - new Date(intervalStartedAt).getTime()) / 1000);
      setElapsed(accumulated + Math.max(0, diff));
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [intervalStartedAt, accumulated]);

  const call = async (action) => {
    setActionLoading(true);
    setActionError(null);
    try {
      const res = await fetch(`${API_BASE}/api/joborders/${jobId}/${action}`, { method: 'POST' });
      const data = await res.json();

      if (!res.ok) {
        setActionError(data.message || 'Greška pri slanju zahteva.');
        return;
      }

      if (action === 'finish') {
        setFinishResult(data);
        setIntervalStartedAt(null);
        setJob(prev => ({ ...prev, status: 'Ceka potvrdu' }));
      } else {
        await loadTimerState();
      }
    } catch {
      setActionError('Greška pri slanju zahteva.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <p className="text-red-400">{error}</p>
      </div>
    );
  }

  // Countdown display: show remaining if positive, show overtime if negative
  const displaySeconds = remaining >= 0 ? remaining : 0;
  const displayLabel = isOvertime
    ? `Prekoračenje: +${formatTime(overtimeSeconds)}`
    : remaining === 0 && elapsed > 0
      ? 'Procenjeno vreme isteklo'
      : isActive ? 'Preostalo vreme' : isPaused ? 'Pauzirano' : isAwaiting ? 'Čeka potvrdu klijenta' : 'Nije početo';

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex flex-col">
      <Header />

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg space-y-6">

          {/* Job info */}
          <div className="bg-gray-800/60 border border-gray-700 rounded-2xl p-6">
            <p className="text-gray-400 text-sm mb-1">Posao #{job.jobId}</p>
            <h1 className="text-white font-bold text-xl mb-3">{job.jobDescription || 'Bez opisa'}</h1>
            <div className="flex flex-wrap gap-4 text-sm text-gray-400">
              <span>Satnica: <span className="text-white font-medium">{job.hourlyRate?.toLocaleString()} RSD/h</span></span>
              {job.estimatedMinutes != null
                ? <span>Procena: <span className="text-white font-medium">{Math.floor(job.estimatedMinutes / 60)}h {job.estimatedMinutes % 60}min</span></span>
                : <span>Procena: <span className="text-white font-medium">{job.estimatedHours}h</span></span>
              }
            </div>
          </div>

          {/* Not scheduled today warning */}
          {isScheduledToday === false && !isActive && !isPaused && (
            <div className="flex items-start gap-3 bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 text-yellow-400 text-sm">
              <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>
                Ovaj posao je zakazan za {new Date(job.scheduledDate).toLocaleDateString('sr-RS', { day: '2-digit', month: 'long', year: 'numeric' })}.
                Timer možete pokrenuti samo tog dana.
              </span>
            </div>
          )}

          {/* Timer display */}
          <div className={`border rounded-2xl p-8 text-center transition-colors ${
            isOvertime
              ? 'bg-red-900/20 border-red-500/40'
              : 'bg-gray-800/60 border-gray-700'
          }`}>
            <div className="flex items-center justify-center gap-2 text-gray-400 text-sm mb-4">
              <Clock className="w-4 h-4" />
              {displayLabel}
            </div>

            {/* Main countdown */}
            <div className={`text-7xl font-mono font-bold mb-2 tabular-nums tracking-tight ${
              isOvertime ? 'text-red-400' : isActive ? 'text-white' : 'text-gray-500'
            }`}>
              {isOvertime ? formatTime(overtimeSeconds) : formatTime(displaySeconds)}
            </div>

            {/* Elapsed (secondary) */}
            {elapsed > 0 && (
              <div className="text-gray-500 text-sm mb-4">
                Utrošeno: {formatTime(elapsed)}
              </div>
            )}

            <div className="text-2xl font-bold text-blue-400">
              {currentPrice.toLocaleString('sr-RS', { minimumFractionDigits: 2 })} RSD
            </div>
            <p className="text-gray-500 text-xs mt-1">Tekuća cena (min. 1h, zatim kvartovi od 15min)</p>

            {/* Near limit warning */}
            {isNearLimit && (
              <div className="mt-4 flex items-center justify-center gap-2 text-red-400 text-sm font-medium">
                <AlertTriangle className="w-4 h-4" />
                Blizu maksimalnog prekoračenja od 2h!
              </div>
            )}
          </div>

          {/* Finish result */}
          {finishResult && (
            <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-6 text-center">
              <CheckCircle className="w-10 h-10 text-green-400 mx-auto mb-3" />
              <h2 className="text-white font-bold text-xl mb-1">Posao završen!</h2>
              <p className="text-gray-400 mb-3">Trajanje: <span className="text-white font-medium">{finishResult.formattedDuration}</span></p>
              <p className="text-3xl font-bold text-white mb-1">
                {Number(finishResult.actualPrice).toLocaleString()} RSD
              </p>
              <p className="text-gray-500 text-sm">Čeka se potvrda klijenta</p>
            </div>
          )}

          {/* Action error */}
          {actionError && (
            <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              {actionError}
            </div>
          )}

          {/* Controls */}
          {!finishResult && !isReadOnly && (
            <div className="flex gap-3">
              {isNotStarted && (
                <button
                  onClick={() => call('start')}
                  disabled={actionLoading}
                  className="flex-1 flex items-center justify-center gap-2 py-4 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold text-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {actionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}
                  Počni
                </button>
              )}

              {isActive && (
                <>
                  <button
                    onClick={() => call('pause')}
                    disabled={actionLoading}
                    className="flex-1 flex items-center justify-center gap-2 py-4 bg-yellow-600 hover:bg-yellow-500 text-white rounded-xl font-bold transition disabled:opacity-50"
                  >
                    {actionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Pause className="w-5 h-5" />}
                    Pauziraj
                  </button>
                  <button
                    onClick={() => call('finish')}
                    disabled={actionLoading}
                    className="flex-1 flex items-center justify-center gap-2 py-4 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold transition disabled:opacity-50"
                  >
                    <Square className="w-5 h-5" />
                    Završi
                  </button>
                </>
              )}

              {isPaused && (
                <>
                  <button
                    onClick={() => call('resume')}
                    disabled={actionLoading}
                    className="flex-1 flex items-center justify-center gap-2 py-4 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold transition disabled:opacity-50"
                  >
                    {actionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}
                    Nastavi
                  </button>
                  <button
                    onClick={() => call('finish')}
                    disabled={actionLoading}
                    className="flex-1 flex items-center justify-center gap-2 py-4 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold transition disabled:opacity-50"
                  >
                    <Square className="w-5 h-5" />
                    Završi
                  </button>
                </>
              )}

              {isAwaiting && (
                <div className="flex-1 py-4 text-center text-gray-400 bg-gray-800/60 border border-gray-700 rounded-xl">
                  Čekamo potvrdu klijenta...
                </div>
              )}
            </div>
          )}

          <button
            onClick={() => navigate('/dashboard')}
            className="w-full py-3 text-gray-400 hover:text-white transition text-sm"
          >
            ← Nazad na dashboard
          </button>

        </div>
      </div>

      <Footer />
    </div>
  );
}
