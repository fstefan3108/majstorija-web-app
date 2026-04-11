import { useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Mail, RefreshCw, CheckCircle, ArrowLeft } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';

const API_BASE = "http://localhost:5114";

const EmailVerificationPending = () => {
  const { state } = useLocation();
  const email = state?.email || '';
  const userType = state?.userType || 'user';

  const [resending, setResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [resendError, setResendError] = useState('');

  const handleResend = async () => {
    setResending(true);
    setResendError('');
    setResendSuccess(false);
    try {
      const res = await fetch(`${API_BASE}/api/auth/resend-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, userType })
      });
      const json = await res.json();
      if (json.success) {
        setResendSuccess(true);
      } else {
        setResendError('Slanje nije uspelo. Pokušajte ponovo.');
      }
    } catch {
      setResendError('Greška pri povezivanju sa serverom.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex flex-col">
      <Header />

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full">
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-8 border border-gray-700 text-center">

            <div className="w-20 h-20 rounded-full bg-blue-500/20 flex items-center justify-center mx-auto mb-6">
              <Mail className="w-10 h-10 text-blue-400" />
            </div>

            <h1 className="text-2xl font-bold text-white mb-3">Proverite vaš inbox</h1>

            <p className="text-gray-300 mb-2">
              Poslali smo email za verifikaciju na:
            </p>
            <p className="text-white font-semibold text-lg mb-6">
              {email || 'vaš email'}
            </p>

            <div className="bg-gray-700/40 rounded-xl p-4 mb-6 text-left space-y-2">
              <p className="text-gray-300 text-sm flex items-start gap-2">
                <span className="text-blue-400 flex-shrink-0 mt-0.5">1.</span>
                Otvorite email koji smo vam poslali
              </p>
              <p className="text-gray-300 text-sm flex items-start gap-2">
                <span className="text-blue-400 flex-shrink-0 mt-0.5">2.</span>
                Kliknite na dugme <strong className="text-white">"Potvrdi email adresu"</strong>
              </p>
              <p className="text-gray-300 text-sm flex items-start gap-2">
                <span className="text-blue-400 flex-shrink-0 mt-0.5">3.</span>
                Bićete automatski prijavljeni i preusmereni na dashboard
              </p>
            </div>

            <p className="text-gray-500 text-xs mb-6">
              Link važi <span className="text-gray-300">24 sata</span>. Proverite i spam folder.
            </p>

            {resendSuccess && (
              <div className="mb-4 p-3 bg-green-500/10 border border-green-500/40 rounded-lg flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                <p className="text-green-400 text-sm">Novi verifikacioni email je poslat!</p>
              </div>
            )}

            {resendError && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/40 rounded-lg">
                <p className="text-red-400 text-sm">{resendError}</p>
              </div>
            )}

            <button
              onClick={handleResend}
              disabled={resending || resendSuccess}
              className="w-full flex items-center justify-center gap-2 py-3 px-6 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition mb-4">
              <RefreshCw className={`w-4 h-4 ${resending ? 'animate-spin' : ''}`} />
              {resending ? 'Slanje...' : resendSuccess ? 'Email je poslat' : 'Pošalji ponovo'}
            </button>

            <Link
              to="/login"
              className="inline-flex items-center gap-2 text-gray-400 hover:text-gray-300 transition text-sm">
              <ArrowLeft className="w-4 h-4" /> Nazad na prijavu
            </Link>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default EmailVerificationPending;
