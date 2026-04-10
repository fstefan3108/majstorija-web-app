import { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Lock, Eye, EyeOff, ArrowLeft, CheckCircle } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';

const API_BASE = "http://localhost:5114";

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const token = searchParams.get('token') || '';
  const email = searchParams.get('email') || '';
  const userType = searchParams.get('type') || 'user';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState([]);

  const validate = () => {
    const errs = [];
    if (newPassword.length < 8) errs.push('Lozinka mora imati najmanje 8 karaktera.');
    else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(newPassword))
      errs.push('Lozinka mora sadržati bar jedno veliko slovo, malo slovo i broj.');
    if (newPassword !== confirmPassword) errs.push('Lozinke se ne poklapaju.');
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors([]);
    const errs = validate();
    if (errs.length > 0) { setErrors(errs); return; }

    if (!token || !email) {
      setErrors(['Nevažeći link za resetovanje. Zatražite novi.']);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, email, userType, newPassword })
      });
      const json = await res.json();

      if (!json.success) {
        setErrors([json.message || 'Resetovanje nije uspelo. Link možda više nije važeći.']);
      } else {
        setSuccess(true);
      }
    } catch {
      setErrors(['Greška pri povezivanju sa serverom. Pokušajte ponovo.']);
    } finally {
      setLoading(false);
    }
  };

  if (!token || !email) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center px-4 py-12">
          <div className="max-w-md w-full bg-gray-800/50 backdrop-blur-sm rounded-2xl p-8 border border-gray-700 text-center">
            <p className="text-red-400 mb-4">Nevažeći link za resetovanje lozinke.</p>
            <Link to="/forgot-password" className="text-blue-400 hover:text-blue-300 transition font-medium">
              Zatražite novi link
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex flex-col">
      <Header />

      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-md w-full">
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-8 border border-gray-700">

            {success ? (
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-green-400" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-3">Lozinka promenjena!</h2>
                <p className="text-gray-300 mb-6">
                  Vaša lozinka je uspešno resetovana. Možete se prijaviti sa novom lozinkom.
                </p>
                <button
                  onClick={() => navigate('/login')}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition">
                  Idi na prijavu
                </button>
              </div>
            ) : (
              <>
                <div className="mb-8">
                  <Link to="/login" className="inline-flex items-center gap-2 text-gray-400 hover:text-gray-300 transition text-sm mb-6">
                    <ArrowLeft className="w-4 h-4" /> Nazad na prijavu
                  </Link>
                  <h1 className="text-3xl font-bold text-white mb-2">Nova lozinka</h1>
                  <p className="text-gray-300">
                    Unesite novu lozinku za <span className="text-white font-medium">{email}</span>.
                  </p>
                </div>

                {errors.length > 0 && (
                  <div className="mb-6 p-4 bg-red-500/10 border border-red-500/40 rounded-lg">
                    <ul className="space-y-1">
                      {errors.map((err, i) => (
                        <li key={i} className="text-red-400 text-sm flex items-start gap-2">
                          <span className="text-red-500 flex-shrink-0">•</span>{err}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label className="block text-gray-300 mb-2 font-medium">Nova lozinka</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Lock className="w-5 h-5 text-gray-400" />
                      </div>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                        className="w-full pl-12 pr-12 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                        placeholder="Unesite novu lozinku"
                      />
                      <button type="button" onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-300 transition">
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-gray-300 mb-2 font-medium">Potvrdi lozinku</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Lock className="w-5 h-5 text-gray-400" />
                      </div>
                      <input
                        type={showConfirm ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        className="w-full pl-12 pr-12 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                        placeholder="Ponovite lozinku"
                      />
                      <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-300 transition">
                        {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  <div className="bg-gray-700/30 rounded-lg p-3">
                    <p className="text-gray-400 text-xs">Minimum 8 karaktera, jedno veliko slovo i jedan broj.</p>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed">
                    {loading ? 'Čuvanje...' : 'Sačuvaj novu lozinku'}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default ResetPassword;
