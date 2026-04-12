import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';
import Header from "../components/Header";
import Footer from '../components/Footer';
import { useAuth } from '../context/AuthContext';

const API_BASE = "http://localhost:5114";

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState([]);
  const [unverifiedInfo, setUnverifiedInfo] = useState(null); // { email, userType }
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    userType: 'user'
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors([]);
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          userType: formData.userType
        })
      });

      const json = await response.json();

      if (!response.ok || !json.success) {
        if (json.code === 'EMAIL_NOT_VERIFIED') {
          setUnverifiedInfo({ email: json.email, userType: json.userType || formData.userType });
          setErrors([]);
        } else if (json.errors) {
          setErrors(Object.values(json.errors).flat());
        } else {
          setErrors([json.message || 'Pogrešan email ili lozinka']);
        }
        setLoading(false);
        return;
      }

      const data = json.data;
      login(data);
      navigate(data.role === 'Craftsman' ? '/workers/dashboard' : '/');

    } catch {
      setErrors(['Greška pri povezivanju sa serverom. Pokušajte ponovo.']);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setErrors([]);
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          credential: credentialResponse.credential,
          userType: formData.userType
        })
      });
      const json = await res.json();
      if (!json.success) {
        setErrors([json.message || 'Google prijava nije uspela']);
        return;
      }
      login(json.data);
      navigate(json.data.role === 'Craftsman' ? '/workers/dashboard' : '/');
    } catch {
      setErrors(['Greška pri Google prijavi. Pokušajte ponovo.']);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex flex-col">
      <Header />

      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-md w-full">
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-8 border border-gray-700">
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold text-white mb-2">Dobrodošli Nazad</h1>
              <p className="text-gray-300">Prijavite se na Vaš nalog.</p>
            </div>

            {errors.length > 0 && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/40 rounded-lg">
                <p className="text-red-400 text-sm font-semibold mb-2">Molimo ispravite sledeće greške:</p>
                <ul className="space-y-1">
                  {errors.map((err, i) => (
                    <li key={i} className="text-red-400 text-sm flex items-start gap-2">
                      <span className="mt-0.5 text-red-500 flex-shrink-0">•</span>{err}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {unverifiedInfo && (
              <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/40 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-yellow-400 text-sm font-semibold mb-1">Email nije verifikovan</p>
                    <p className="text-gray-300 text-sm mb-3">
                      Proverite vaš inbox i kliknite na link za verifikaciju.
                    </p>
                    <button
                      type="button"
                      onClick={() => navigate('/verify-email-pending', { state: unverifiedInfo })}
                      className="text-sm text-blue-400 hover:text-blue-300 underline transition">
                      Pošalji novi verifikacioni email →
                    </button>
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              {/* Tip korisnika */}
              <div>
                <label className="block text-gray-300 mb-3 font-medium">Prijavljujem se kao:</label>
                <div className="grid grid-cols-2 gap-3">
                  {[['user','Korisnik'],['craftsman','Majstor']].map(([type, label]) => (
                    <button key={type} type="button"
                      onClick={() => setFormData({ ...formData, userType: type })}
                      className={`py-3 px-4 rounded-lg font-medium transition ${formData.userType === type ? 'bg-blue-600 text-white border-2 border-blue-500' : 'bg-gray-700/50 text-gray-300 border-2 border-gray-600 hover:border-gray-500'}`}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Google OAuth — samo za korisnike */}
              {formData.userType === 'user' && (
                <div>
                  <div className="flex justify-center">
                    <GoogleLogin
                      onSuccess={handleGoogleSuccess}
                      onError={() => setErrors(['Google prijava nije uspela'])}
                      text="signin_with"
                      shape="rectangular"
                      theme="filled_black"
                    />
                  </div>
                  <div className="flex items-center gap-3 my-4">
                    <div className="flex-1 h-px bg-gray-700" />
                    <span className="text-gray-500 text-xs">ili sa email/lozinkom</span>
                    <div className="flex-1 h-px bg-gray-700" />
                  </div>
                </div>
              )}

              {/* Email */}
              <div>
                <label className="block text-gray-300 mb-2 font-medium">Email</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Mail className="w-5 h-5 text-gray-400" />
                  </div>
                  <input type="email" name="email" value={formData.email} onChange={handleChange}
                    className="w-full pl-12 pr-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    placeholder="vas.email@primer.com" />
                </div>
              </div>

              {/* Lozinka */}
              <div>
                <label className="block text-gray-300 mb-2 font-medium">Lozinka</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="w-5 h-5 text-gray-400" />
                  </div>
                  <input type={showPassword ? 'text' : 'password'} name="password"
                    value={formData.password} onChange={handleChange}
                    className="w-full pl-12 pr-12 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    placeholder="Unesite Šifru" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-300 transition">
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center">
                  <input type="checkbox"
                    className="w-4 h-4 bg-gray-700 border-gray-600 rounded text-blue-600 focus:ring-2 focus:ring-blue-500" />
                  <span className="ml-2 text-sm text-gray-300">Zapamti me</span>
                </label>
                <Link to="/forgot-password" className="text-sm text-blue-400 hover:text-blue-300 transition">
                  Zaboravljena Šifra?
                </Link>
              </div>

              <button type="submit" disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed">
                {loading ? 'Prijavljivanje...' : 'Prijavi se'}
              </button>
            </form>

            <div className="mt-8 text-center">
              <p className="text-gray-300">
                Nemate nalog?{' '}
                <Link to="/register" className="text-blue-400 hover:text-blue-300 font-semibold transition">Registrujte se</Link>
              </p>
            </div>
          </div>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-400">🔒 Vaši podaci su bezbedni i šifrovani</p>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Login;
