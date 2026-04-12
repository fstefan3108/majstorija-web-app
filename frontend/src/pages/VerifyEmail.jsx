import { useEffect, useRef, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { CheckCircle, XCircle, Loader2, Mail } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { useAuth } from '../context/AuthContext';

const API_BASE = "http://localhost:5114";

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();

  const token = searchParams.get('token') || '';
  const email = searchParams.get('email') || '';
  const userType = searchParams.get('type') || 'user';

  const [status, setStatus] = useState('loading'); // 'loading' | 'success' | 'error'
  const [errorMsg, setErrorMsg] = useState('');
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    if (!token || !email) {
      setStatus('error');
      setErrorMsg('Nevažeći verifikacioni link. Parametri nedostaju.');
      return;
    }

    const verify = async () => {
      try {
        const res = await fetch(
          `${API_BASE}/api/auth/verify-email?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}&userType=${userType}`
        );
        const json = await res.json();

        if (json.success && json.data?.accessToken) {
          login(json.data);
          setStatus('success');
          setTimeout(() => {
            navigate(json.data.role === 'Craftsman' ? '/workers/dashboard' : '/');
          }, 2000);
        } else {
          setStatus('error');
          setErrorMsg(json.message || 'Verifikacija nije uspela. Link je možda istekao.');
        }
      } catch {
        setStatus('error');
        setErrorMsg('Greška pri povezivanju sa serverom. Pokušajte ponovo.');
      }
    };

    verify();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex flex-col">
      <Header />

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full">
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-8 border border-gray-700 text-center">

            {status === 'loading' && (
              <>
                <Loader2 className="w-16 h-16 text-blue-400 animate-spin mx-auto mb-6" />
                <h1 className="text-2xl font-bold text-white mb-3">Verifikacija u toku...</h1>
                <p className="text-gray-400">Proveravamo vaš verifikacioni link.</p>
              </>
            )}

            {status === 'success' && (
              <>
                <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="w-10 h-10 text-green-400" />
                </div>
                <h1 className="text-2xl font-bold text-white mb-3">Email potvrđen!</h1>
                <p className="text-gray-300 mb-2">Vaš nalog je uspešno aktiviran.</p>
                <p className="text-gray-400 text-sm">Preusmeravamo vas na dashboard...</p>
              </>
            )}

            {status === 'error' && (
              <>
                <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-6">
                  <XCircle className="w-10 h-10 text-red-400" />
                </div>
                <h1 className="text-2xl font-bold text-white mb-3">Verifikacija nije uspela</h1>
                <p className="text-gray-300 mb-6">{errorMsg}</p>

                <div className="space-y-3">
                  {email && (
                    <Link
                      to="/verify-email-pending"
                      state={{ email, userType }}
                      className="w-full flex items-center justify-center gap-2 py-3 px-6 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition">
                      <Mail className="w-4 h-4" /> Zatraži novi link
                    </Link>
                  )}
                  <Link
                    to="/login"
                    className="w-full flex items-center justify-center py-3 px-6 bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white font-medium rounded-lg transition">
                    Idi na prijavu
                  </Link>
                </div>
              </>
            )}

          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default VerifyEmail;
