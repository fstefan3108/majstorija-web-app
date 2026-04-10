import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';

const API_BASE = "http://localhost:5114";

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [userType, setUserType] = useState('user');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, userType })
      });
      const json = await res.json();

      if (!json.success) {
        setError(json.message || 'Greška pri slanju emaila.');
      } else {
        setSuccess(true);
      }
    } catch {
      setError('Greška pri povezivanju sa serverom. Pokušajte ponovo.');
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

            {success ? (
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                  <Mail className="w-8 h-8 text-green-400" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-3">Email poslat!</h2>
                <p className="text-gray-300 mb-6">
                  Ukoliko nalog sa adresom <span className="text-white font-medium">{email}</span> postoji,
                  poslali smo vam link za resetovanje lozinke. Proverite vaš inbox.
                </p>
                <p className="text-gray-400 text-sm mb-6">
                  Link važi <span className="text-white">60 minuta</span>. Proverite i spam folder.
                </p>
                <Link to="/login" className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 transition font-medium">
                  <ArrowLeft className="w-4 h-4" /> Nazad na prijavu
                </Link>
              </div>
            ) : (
              <>
                <div className="mb-8">
                  <Link to="/login" className="inline-flex items-center gap-2 text-gray-400 hover:text-gray-300 transition text-sm mb-6">
                    <ArrowLeft className="w-4 h-4" /> Nazad na prijavu
                  </Link>
                  <h1 className="text-3xl font-bold text-white mb-2">Zaboravljena lozinka?</h1>
                  <p className="text-gray-300">Unesite vaš email i poslaćemo vam link za resetovanje.</p>
                </div>

                {error && (
                  <div className="mb-6 p-4 bg-red-500/10 border border-red-500/40 rounded-lg">
                    <p className="text-red-400 text-sm">{error}</p>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label className="block text-gray-300 mb-3 font-medium">Prijavljujem se kao:</label>
                    <div className="grid grid-cols-2 gap-3">
                      {[['user', 'Korisnik'], ['craftsman', 'Majstor']].map(([type, label]) => (
                        <button key={type} type="button"
                          onClick={() => setUserType(type)}
                          className={`py-3 px-4 rounded-lg font-medium transition ${userType === type ? 'bg-blue-600 text-white border-2 border-blue-500' : 'bg-gray-700/50 text-gray-300 border-2 border-gray-600 hover:border-gray-500'}`}>
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-gray-300 mb-2 font-medium">Email adresa</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Mail className="w-5 h-5 text-gray-400" />
                      </div>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="w-full pl-12 pr-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                        placeholder="vas.email@primer.com"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed">
                    {loading ? 'Slanje...' : 'Pošalji link za resetovanje'}
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

export default ForgotPassword;
