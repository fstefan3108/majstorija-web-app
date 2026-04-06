import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Play, Pause, Square, Clock, Loader2, CheckCircle } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';

const API_BASE = 'http://localhost:5114';

const formatTime = (totalSeconds) => {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

export default function JobTimer() {
  const { jobId } = useParams();
  const navigate = useNavigate();

  const [job, setJob] = useState(null);
  const [accumulated, setAccumulated] = useState(0);
  const [intervalStartedAt, setIntervalStartedAt] = useState(null); // UTC ISO string or null
  const [elapsed, setElapsed] = useState(0);
  const [actionLoading, setActionLoading] = useState(false);
  const [finishResult, setFinishResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const timerRef = useRef(null);

  const loadTimerState = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/joborders/${jobId}/timer-state`);
      const data = await res.json();
      setJob(data);
      setAccumulated(data.accumulatedSeconds);
      setIntervalStartedAt(data.currentIntervalStartedAt);
      // Set initial elapsed so display is correct immediately
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

  useEffect(() => {
    loadTimerState();
  }, [jobId]);

  // Live tick — only when there is an open interval
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
    try {
      const res = await fetch(`${API_BASE}/api/joborders/${jobId}/${action}`, { method: 'POST' });
      const data = await res.json();

      if (action === 'finish') {
        setFinishResult(data);
        setIntervalStartedAt(null);
        setJob(prev => ({ ...prev, status: 'Ceka potvrdu' }));
      } else {
        await loadTimerState(); // Reload to sync state from server
      }
    } catch {
      setError('Greška pri slanju zahteva.');
    } finally {
      setActionLoading(false);
    }
  };

  const currentPrice = job ? ((elapsed / 3600) * job.hourlyRate).toFixed(2) : '0.00';
  const isActive = !!intervalStartedAt;
  const isPaused = job?.status === 'Pauzirano';
  const isNotStarted = job?.status === 'U toku' && !isActive && accumulated === 0;
  const isAwaiting = job?.status === 'Ceka potvrdu';

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex flex-col">
      <Header />

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg space-y-6">

          {/* Job info */}
          <div className="bg-gray-800/60 border border-gray-700 rounded-2xl p-6">
            <p className="text-gray-400 text-sm mb-1">Posao #{job.jobId}</p>
            <h1 className="text-white font-bold text-xl mb-3">{job.jobDescription || 'Bez opisa'}</h1>
            <div className="flex gap-6 text-sm text-gray-400">
              <span>Satnica: <span className="text-white font-medium">{job.hourlyRate?.toLocaleString()} RSD/h</span></span>
              <span>Procena: <span className="text-white font-medium">{job.estimatedHours}h</span></span>
            </div>
          </div>

          {/* Timer display */}
          <div className="bg-gray-800/60 border border-gray-700 rounded-2xl p-8 text-center">
            <div className="flex items-center justify-center gap-2 text-gray-400 text-sm mb-4">
              <Clock className="w-4 h-4" />
              {isActive ? 'Posao u toku' : isPaused ? 'Pauzirano' : isAwaiting ? 'Čeka potvrdu klijenta' : 'Nije početo'}
            </div>

            <div className={`text-7xl font-mono font-bold mb-4 tabular-nums tracking-tight
              ${isActive ? 'text-white' : 'text-gray-500'}`}>
              {formatTime(elapsed)}
            </div>

            <div className="text-2xl font-bold text-blue-400">
              {Number(currentPrice).toLocaleString('sr-RS', { minimumFractionDigits: 2 })} RSD
            </div>
            <p className="text-gray-500 text-xs mt-1">Tekuća cena na osnovu utrošenog vremena</p>
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

          {/* Controls */}
          {!finishResult && (
            <div className="flex gap-3">
              {isNotStarted && (
                <button
                  onClick={() => call('start')}
                  disabled={actionLoading}
                  className="flex-1 flex items-center justify-center gap-2 py-4 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold text-lg transition disabled:opacity-50"
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
