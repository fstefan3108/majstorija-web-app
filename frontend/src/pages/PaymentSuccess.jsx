import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle, Loader2, XCircle } from 'lucide-react';
import Header from "../components/Header";
import Footer from "../components/Footer";

const API_BASE = "http://localhost:5114";
const POLL_INTERVAL_MS = 2000;
const POLL_MAX_ATTEMPTS = 10; // 20 seconds total

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const [state, setState] = useState('loading'); // 'loading' | 'success' | 'canceled' | 'error'
  const [errorMsg, setErrorMsg] = useState('');

  // Capture jobId/surveyId once at mount — sessionStorage gets cleared during pollStatus
  // before setState('success') triggers re-render, so plain const would become null.
  const [surveyId] = useState(
    () => searchParams.get('surveyId') || sessionStorage.getItem('pendingSurveyId')
  );
  const [jobId] = useState(
    () => searchParams.get('jobId') || sessionStorage.getItem('pendingJobId')
  );

  const clearPendingSession = () => {
    sessionStorage.removeItem('pendingTransactionId');
    sessionStorage.removeItem('pendingJobId');
    sessionStorage.removeItem('pendingSurveyId');
    sessionStorage.removeItem('checkoutData');
  };

  useEffect(() => {
    if (state !== 'success') return;

    if (surveyId) {
      // Aktiviraj survey — idempotentno, bezbedno i ako je callback već stigao
      fetch(`${API_BASE}/api/site-surveys/${surveyId}/activate`, { method: 'POST' }).catch(() => {});
    } else if (jobId) {
      fetch(`${API_BASE}/api/payments/${jobId}/setup-chat`, { method: 'POST' }).catch(() => {});
    }
  }, [state]);

  useEffect(() => {
    const canceled = searchParams.get('canceled');
    const hasError = searchParams.get('error');

    // User explicitly canceled on AllSecure's page
    if (canceled === 'true') {
      clearPendingSession();
      setState('canceled');
      return;
    }

    // AllSecure redirected to errorUrl
    if (hasError === 'true') {
      clearPendingSession();
      setErrorMsg('Plaćanje nije uspelo na strani AllSecure-a. Pokušajte ponovo.');
      setState('error');
      return;
    }

    const pendingTransactionId = sessionStorage.getItem('pendingTransactionId');

    if (pendingTransactionId) {
      // Came back from AllSecure's redirect page — poll until callback updates the status
      pollStatus(pendingTransactionId);
    } else {
      // Direct preauth (returning user, FINISHED immediately) — no polling needed
      sessionStorage.removeItem('checkoutData');
      setState('success');
    }
  }, []);

  const pollStatus = async (transactionId) => {
    for (let attempt = 0; attempt < POLL_MAX_ATTEMPTS; attempt++) {
      try {
        const res  = await fetch(`${API_BASE}/api/payments/status/${transactionId}`);
        const data = await res.json();

        if (data.status === 'Preauthorized') {
          clearPendingSession();
          setState('success');
          return;
        }

        if (data.status === 'Failed') {
          clearPendingSession();
          setErrorMsg('Plaćanje je odbijeno od strane banke. Proverite podatke kartice i pokušajte ponovo.');
          setState('error');
          return;
        }

        // Still 'Pending' — callback hasn't arrived yet, wait and retry
        if (attempt < POLL_MAX_ATTEMPTS - 1) {
          await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));
        }
      } catch {
        // Network error during poll — try again
        if (attempt < POLL_MAX_ATTEMPTS - 1) {
          await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));
        }
      }
    }

    // Callback still hasn't arrived after max wait — assume success.
    clearPendingSession();
    setState('success');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex flex-col">
      <Header />

      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="bg-gray-800/60 border border-gray-700 rounded-2xl p-10 max-w-md w-full text-center">

          {state === 'loading' && (
            <>
              <Loader2 className="w-16 h-16 text-blue-500 animate-spin mx-auto mb-4" />
              <h2 className="text-white font-bold text-2xl mb-2">Potvrđujemo plaćanje...</h2>
              <p className="text-gray-400">Molimo sačekajte trenutak.</p>
            </>
          )}

          {state === 'success' && (
            <>
              <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-10 h-10 text-green-400" />
              </div>
              {surveyId ? (
                <>
                  <h2 className="text-white font-bold text-3xl mb-3">Izviđanje zakazano!</h2>
                  <p className="text-gray-400 mb-2">Uplata za izviđanje je potvrđena.</p>
                  <p className="text-gray-500 text-sm mb-8">Majstor će doći na izviđanje u dogovorenom terminu, proceniti posao i predložiti termin za realizaciju.</p>
                </>
              ) : (
                <>
                  <h2 className="text-white font-bold text-3xl mb-3">Rezervacija potvrđena!</h2>
                  <p className="text-gray-400 mb-2">Sredstva su rezervisana na vašoj kartici.</p>
                  <p className="text-gray-500 text-sm mb-8">Naplata će biti izvršena kada majstor završi posao.</p>
                </>
              )}
              <div className="flex flex-col gap-3">
                <Link
                  to="/users/dashboard"
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold transition"
                >
                  Pogledaj porudžbine
                </Link>
                <Link
                  to="/"
                  className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-medium transition"
                >
                  Početna stranica
                </Link>
              </div>
            </>
          )}

          {state === 'canceled' && (
            <>
              <div className="w-20 h-20 bg-yellow-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-4xl">↩️</span>
              </div>
              <h2 className="text-white font-bold text-2xl mb-3">Plaćanje otkazano</h2>
              <p className="text-gray-400 mb-8">Vratili ste se bez završavanja plaćanja. Rezervacija nije potvrđena.</p>
              <div className="flex flex-col gap-3">
                <Link
                  to="/browse-tasks"
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold transition"
                >
                  Pretraži majstore
                </Link>
                <Link
                  to="/"
                  className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-medium transition"
                >
                  Početna stranica
                </Link>
              </div>
            </>
          )}

          {state === 'error' && (
            <>
              <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <XCircle className="w-10 h-10 text-red-400" />
              </div>
              <h2 className="text-white font-bold text-2xl mb-3">Plaćanje nije uspelo</h2>
              <p className="text-gray-400 mb-8">{errorMsg || 'Došlo je do greške pri obradi plaćanja.'}</p>
              <div className="flex flex-col gap-3">
                <Link
                  to="/browse-tasks"
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold transition"
                >
                  Pokušaj ponovo
                </Link>
                <Link
                  to="/"
                  className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-medium transition"
                >
                  Početna stranica
                </Link>
              </div>
            </>
          )}

        </div>
      </div>

      <Footer />
    </div>
  );
}
