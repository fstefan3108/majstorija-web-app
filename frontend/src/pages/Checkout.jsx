import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CreditCard, Shield, Clock, MapPin, Briefcase, Loader2, AlertCircle } from 'lucide-react';
import Header from "../components/Header";
import Footer from "../components/Footer";
import { useAuth } from '../context/AuthContext';

const API_BASE = "http://localhost:5114";

export default function Checkout() {

  const [savedCard, setSavedCard] = useState(null);
  const [tokenChecked, setTokenChecked] = useState(false);
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardBrand, setCardBrand] = useState('VISA');
  const [payError, setPayError] = useState('');

  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Persist booking data across refreshes
  useEffect(() => {
    if (location.state) {
      sessionStorage.setItem('checkoutData', JSON.stringify(location.state));
    }
  }, [location.state]);

  // Check if this user already has a saved card token
  useEffect(() => {
    if (!user?.id) return;
    fetch(`${API_BASE}/api/payments/card-token/${user.id}`)
      .then(r => r.json())
      .then(data => {
        if (data.hasToken) setSavedCard({ cardBrand: data.cardBrand, maskedNumber: data.maskedNumber });
      })
      .finally(() => setTokenChecked(true));
  }, [user?.id]);

  const bookingData = location.state || JSON.parse(sessionStorage.getItem('checkoutData') || 'null');

  useEffect(() => {
    if (!bookingData) navigate('/browse-tasks');
  }, []);

  if (!bookingData) return null;

  const { craftsman, jobOrder } = bookingData;

  const handlePayment = async () => {
    setPayError('');
    setLoading(true);

    const body = {
      jobId:       bookingData.jobId,
      userId:      user?.id,
      craftsmanId: craftsman.craftsmanId,
      amount:      jobOrder.totalPrice,
      cardBrand:   savedCard?.cardBrand ?? cardBrand,
    };

    // Only include card fields when there is no saved token
    if (!savedCard) {
      const [expiryMonth, expiryYear] = cardExpiry.split('/').map(s => s.trim());
      body.cardNumber      = cardNumber.replace(/\s/g, '');
      body.cardExpiryMonth = expiryMonth;
      body.cardExpiryYear  = expiryYear;
      body.cardCvv         = cardCvv;
    }

    try {
      const res  = await fetch(`${API_BASE}/api/payments/initiate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (data.status === 'preauthorized') {
        navigate(`/payment-success?jobId=${bookingData.jobId}`);
      } else if (data.status === 'redirect') {
        sessionStorage.setItem('pendingTransactionId', data.transactionId);
        sessionStorage.setItem('pendingJobId', bookingData.jobId);
        window.location.href = data.redirectUrl;
      } else {
        setPayError(data.description || 'Plaćanje nije uspelo. Proverite podatke kartice.');
      }
    } catch {
      setPayError('Greška pri obradi plaćanja. Pokušajte ponovo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex flex-col">
      <Header />

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-2xl">
          <h1 className="text-3xl font-bold text-white mb-2">Plaćanje</h1>
          <p className="text-gray-400 mb-8">Pregledajte detalje pre plaćanja</p>

          <div className="grid gap-6">

            {/* Service details */}
            <div className="bg-gray-800/60 border border-gray-700 rounded-2xl p-6">
              <h2 className="text-white font-semibold text-lg mb-4">Detalji usluge</h2>
              <div className="flex items-center gap-4 mb-5 pb-5 border-b border-gray-700">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xl">
                  {craftsman.firstName?.[0]}{craftsman.lastName?.[0]}
                </div>
                <div>
                  <p className="text-white font-bold text-lg">{craftsman.firstName} {craftsman.lastName}</p>
                  <p className="text-blue-400 text-sm capitalize">{craftsman.profession}</p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-gray-300 text-sm">
                  <Clock className="w-4 h-4 text-gray-500" />
                  <span>Datum: <span className="text-white">{new Date(jobOrder.scheduledDate).toLocaleString('sr-RS')}</span></span>
                </div>
                <div className="flex items-center gap-3 text-gray-300 text-sm">
                  <MapPin className="w-4 h-4 text-gray-500" />
                  <span>Lokacija: <span className="text-white">{craftsman.location}</span></span>
                </div>
                <div className="flex items-center gap-3 text-gray-300 text-sm">
                  <Briefcase className="w-4 h-4 text-gray-500" />
                  <span>Opis: <span className="text-white">{jobOrder.jobDescription}</span></span>
                </div>
                {jobOrder.urgent && (
                  <div className="inline-flex items-center gap-1.5 bg-orange-500/10 border border-orange-500/30 text-orange-400 text-xs px-3 py-1 rounded-full">
                    ⚡ Hitna intervencija
                  </div>
                )}
              </div>
            </div>

            {/* Price breakdown */}
            <div className="bg-gray-800/60 border border-gray-700 rounded-2xl p-6">
              <h2 className="text-white font-semibold text-lg mb-4">Pregled cene</h2>
              <div className="space-y-3">
                <div className="flex justify-between text-gray-300 text-sm">
                  <span>Cena po satu</span>
                  <span>{craftsman.hourlyRate.toLocaleString()} RSD</span>
                </div>
                <div className="flex justify-between text-gray-300 text-sm">
                  <span>Procenjeni sati</span>
                  <span>{jobOrder.estimatedHours}h</span>
                </div>
                {jobOrder.urgent && (
                  <div className="flex justify-between text-orange-400 text-sm">
                    <span>Hitna intervencija</span>
                    <span>uključeno</span>
                  </div>
                )}
                <div className="border-t border-gray-700 pt-3 flex justify-between">
                  <span className="text-white font-bold text-lg">Procenjena cena</span>
                  <span className="text-white font-bold text-2xl">{jobOrder.totalPrice.toLocaleString()} RSD</span>
                </div>
                <p className="text-gray-500 text-xs">
                  Na kartici će biti rezervisano {(jobOrder.totalPrice * 1.5).toLocaleString()} RSD (procena + 50% buffer).
                  Tačan iznos će biti naplaćen po završetku posla.
                </p>
              </div>
            </div>

            {/* Card section */}
            <div className="bg-gray-800/60 border border-gray-700 rounded-2xl p-6 space-y-4">
              <h2 className="text-white font-semibold text-lg mb-2">Podaci kartice</h2>

              {savedCard ? (
                // Returning user — show saved card, no input needed
                <div className="flex items-center gap-4 p-4 bg-gray-700/50 rounded-xl border border-gray-600">
                  <CreditCard className="w-8 h-8 text-blue-400 flex-shrink-0" />
                  <div>
                    <p className="text-white font-medium">{savedCard.cardBrand} {savedCard.maskedNumber}</p>
                    <p className="text-gray-400 text-sm">Sačuvana kartica</p>
                  </div>
                </div>
              ) : (
                // First-time user — collect card data
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Broj kartice</label>
                    <input
                      type="text"
                      maxLength={19}
                      placeholder="1234 5678 9012 3456"
                      value={cardNumber}
                      onChange={e => setCardNumber(e.target.value)}
                      className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-300 mb-1">Datum isteka</label>
                      <input
                        type="text"
                        placeholder="MM/YYYY"
                        value={cardExpiry}
                        onChange={e => setCardExpiry(e.target.value)}
                        className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div className="w-28">
                      <label className="block text-sm font-medium text-gray-300 mb-1">CVV</label>
                      <input
                        type="text"
                        maxLength={4}
                        placeholder="123"
                        value={cardCvv}
                        onChange={e => setCardCvv(e.target.value)}
                        className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Vrsta kartice</label>
                    <select
                      value={cardBrand}
                      onChange={e => setCardBrand(e.target.value)}
                      className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                    >
                      <option value="VISA">Visa</option>
                      <option value="MASTER">Mastercard</option>
                    </select>
                  </div>
                </>
              )}
              {payError && <p className="text-red-400 text-sm">{payError}</p>}
            </div>

            {/* Security badge */}
            <div className="flex items-center gap-3 text-gray-400 text-sm bg-gray-800/30 rounded-xl p-4">
              <Shield className="w-5 h-5 text-green-400 flex-shrink-0" />
              <span>Plaćanje je sigurno i zaštićeno od strane <span className="text-white font-medium">AllSecure</span>.</span>
            </div>

            {error && (
              <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                {error}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => navigate(-1)}
                className="flex-1 py-4 bg-gray-800 hover:bg-gray-700 border border-gray-600 text-white rounded-xl transition font-medium"
              >
                Nazad
              </button>
              <button
                onClick={handlePayment}
                disabled={loading || !tokenChecked}
                className="flex-1 flex items-center justify-center gap-3 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Procesiranje...
                  </>
                ) : (
                  <>
                    <CreditCard className="w-5 h-5" />
                    Rezerviši {jobOrder.totalPrice.toLocaleString()} RSD
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}