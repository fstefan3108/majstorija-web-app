import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CreditCard, Shield, Clock, MapPin, Briefcase, Loader2, AlertCircle, ArrowRight, Lock } from 'lucide-react';
import Header from "../components/Header";
import Footer from "../components/Footer";
import { useAuth } from '../context/AuthContext';

const API_BASE = "http://localhost:5114";

export default function Checkout() {

  const [savedCard, setSavedCard] = useState(null);
  const [tokenChecked, setTokenChecked] = useState(false);
  const [payError, setPayError] = useState('');
  const [loading, setLoading] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Persist booking data across refreshes (needed after AllSecure redirect)
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
      cardBrand:   savedCard?.cardBrand ?? null,
    };

    try {
      const res  = await fetch(`${API_BASE}/api/payments/initiate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (data.status === 'preauthorized') {
        // Returning user — preauth completed immediately, no redirect needed
        navigate(`/payment-success?jobId=${bookingData.jobId}`);
      } else if (data.status === 'redirect') {
        // First-time user — store context and redirect to AllSecure's hosted card entry page
        sessionStorage.setItem('pendingTransactionId', data.transactionId);
        sessionStorage.setItem('pendingJobId', bookingData.jobId);
        window.location.href = data.redirectUrl;
      } else {
        setPayError(data.message || 'Plaćanje nije uspelo. Pokušajte ponovo.');
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
                // Returning user — show saved card, payment goes through immediately
                <div className="flex items-center gap-4 p-4 bg-gray-700/50 rounded-xl border border-gray-600">
                  <CreditCard className="w-8 h-8 text-blue-400 flex-shrink-0" />
                  <div>
                    <p className="text-white font-medium">{savedCard.cardBrand} {savedCard.maskedNumber}</p>
                    <p className="text-gray-400 text-sm">Sačuvana kartica</p>
                  </div>
                </div>
              ) : (
                // First-time user — card is entered on AllSecure's secure hosted page
                <div className="flex items-start gap-4 p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
                  <Lock className="w-6 h-6 text-blue-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-white font-medium mb-1">Sigurna stranica za unos kartice</p>
                    <p className="text-gray-400 text-sm">
                      Bićete preusmereni na AllSecure-ovu zaštićenu stranicu gde ćete uneti podatke kartice.
                      Vaši podaci kartice nikad ne prolaze kroz naše servere.
                    </p>
                  </div>
                </div>
              )}

              {payError && (
                <div className="flex items-center gap-2 text-red-400 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {payError}
                </div>
              )}
            </div>

            {/* Security badge */}
            <div className="flex items-center gap-3 text-gray-400 text-sm bg-gray-800/30 rounded-xl p-4">
              <Shield className="w-5 h-5 text-green-400 flex-shrink-0" />
              <span>Plaćanje je sigurno i zaštićeno od strane <span className="text-white font-medium">AllSecure</span>. PCI-DSS usklađeno.</span>
            </div>

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
                ) : savedCard ? (
                  <>
                    <CreditCard className="w-5 h-5" />
                    Rezerviši {jobOrder.totalPrice.toLocaleString()} RSD
                  </>
                ) : (
                  <>
                    Nastavi na unos kartice
                    <ArrowRight className="w-5 h-5" />
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
