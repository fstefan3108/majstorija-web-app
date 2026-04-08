import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  CreditCard, Shield, Clock, MapPin, Briefcase, Loader2, AlertCircle,
  ArrowRight, Lock, Calendar, FileText, CheckCircle
} from 'lucide-react';
import Header from "../components/Header";
import Footer from "../components/Footer";
import { useAuth } from '../context/AuthContext';

const API_BASE = "http://localhost:5114";

export default function Checkout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [savedCard, setSavedCard] = useState(null);
  const [tokenChecked, setTokenChecked] = useState(false);
  const [craftsman, setCraftsman] = useState(null);
  const [craftsmanLoading, setCraftsmanLoading] = useState(false);
  const [payError, setPayError] = useState('');
  const [loading, setLoading] = useState(false);

  // Persist data across AllSecure redirect
  useEffect(() => {
    if (location.state) {
      sessionStorage.setItem('checkoutData', JSON.stringify(location.state));
    }
  }, [location.state]);

  const bookingData = location.state || JSON.parse(sessionStorage.getItem('checkoutData') || 'null');

  useEffect(() => {
    if (!bookingData) navigate('/browse-tasks');
  }, []);

  // Check for saved card
  useEffect(() => {
    if (!user?.id) return;
    fetch(`${API_BASE}/api/payments/card-token/${user.id}`)
      .then(r => r.json())
      .then(data => {
        if (data.hasToken) setSavedCard({ cardBrand: data.cardBrand, maskedNumber: data.maskedNumber });
      })
      .finally(() => setTokenChecked(true));
  }, [user?.id]);

  // Novi flow: fetchuj craftsman-a po craftsmanId iz job request-a
  useEffect(() => {
    if (!bookingData?.fromRequest?.craftsmanId) return;
    setCraftsmanLoading(true);
    fetch(`${API_BASE}/api/craftsmen/${bookingData.fromRequest.craftsmanId}`)
      .then(r => r.json())
      .then(data => setCraftsman(data.data || data))
      .catch(() => {})
      .finally(() => setCraftsmanLoading(false));
  }, [bookingData?.fromRequest?.craftsmanId]);

  if (!bookingData) return null;

  // ── Odredjivanje podataka za prikaz ──────────────────────────────────────
  // Novi flow dolazi sa: { fromRequest, jobOrderId }
  // Stari flow dolazi sa: { craftsman, jobOrder, jobId }
  const isNewFlow = !!bookingData.fromRequest;
  const req = bookingData.fromRequest;             // job_request objekat
  const jobOrderId = bookingData.jobOrderId;       // kreirani job_order ID
  const displayCraftsman = isNewFlow ? craftsman : bookingData.craftsman;
  const jobId = isNewFlow ? jobOrderId : bookingData.jobId;

  // Cena i detalji
  const estimatedPrice = isNewFlow
    ? req.estimatedPrice
    : bookingData.jobOrder?.totalPrice;
  const scheduledDate = isNewFlow
    ? req.scheduledDate
    : bookingData.jobOrder?.scheduledDate;
  const description = isNewFlow
    ? req.description
    : bookingData.jobOrder?.jobDescription;
  const isUrgent = isNewFlow ? req.urgent : bookingData.jobOrder?.urgent;
  const estimatedMinutes = isNewFlow ? req.estimatedMinutes : null;

  const handlePayment = async () => {
    if (!jobId || !displayCraftsman || !estimatedPrice) {
      setPayError('Nedostaju podaci za plaćanje.');
      return;
    }

    setPayError('');
    setLoading(true);

    const body = {
      jobId:       jobId,
      userId:      user?.id,
      craftsmanId: displayCraftsman.craftsmanId,
      amount:      estimatedPrice,
      cardBrand:   savedCard?.cardBrand ?? null,
    };

    try {
      const res = await fetch(`${API_BASE}/api/payments/initiate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (data.status === 'preauthorized') {
        // Vracajuci korisnik — preauth odmah prosao
        sessionStorage.removeItem('checkoutData');
        navigate(`/payment-success?jobId=${jobId}`);
      } else if (data.status === 'redirect') {
        // Prvi put — sacuvaj context i preusmeri na AllSecure stranicu za unos kartice
        sessionStorage.setItem('pendingTransactionId', data.transactionId);
        sessionStorage.setItem('pendingJobId', jobId);
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

  const isReady = tokenChecked && (!isNewFlow || !craftsmanLoading) && displayCraftsman;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex flex-col">
      <Header />

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-2xl">
          <h1 className="text-3xl font-bold text-white mb-2">Plaćanje</h1>
          <p className="text-gray-400 mb-8">Pregledajte detalje pre plaćanja</p>

          {(!isReady) ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
            </div>
          ) : (
            <div className="grid gap-6">

              {/* Detalji usluge */}
              <div className="bg-gray-800/60 border border-gray-700 rounded-2xl p-6">
                <h2 className="text-white font-semibold text-lg mb-4">Detalji usluge</h2>

                {/* Majstor */}
                <div className="flex items-center gap-4 mb-5 pb-5 border-b border-gray-700">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xl flex-shrink-0">
                    {displayCraftsman.firstName?.[0]}{displayCraftsman.lastName?.[0]}
                  </div>
                  <div>
                    <p className="text-white font-bold text-lg">{displayCraftsman.firstName} {displayCraftsman.lastName}</p>
                    <p className="text-blue-400 text-sm capitalize">{displayCraftsman.profession}</p>
                  </div>
                </div>

                {/* Info */}
                <div className="space-y-3">
                  {isNewFlow && req.title && (
                    <div className="flex items-start gap-3 text-gray-300 text-sm">
                      <FileText className="w-4 h-4 text-gray-500 flex-shrink-0 mt-0.5" />
                      <span>Posao: <span className="text-white font-medium">{req.title}</span></span>
                    </div>
                  )}
                  <div className="flex items-start gap-3 text-gray-300 text-sm">
                    <Briefcase className="w-4 h-4 text-gray-500 flex-shrink-0 mt-0.5" />
                    <span>Opis: <span className="text-white">{description}</span></span>
                  </div>
                  <div className="flex items-center gap-3 text-gray-300 text-sm">
                    <Calendar className="w-4 h-4 text-gray-500" />
                    <span>Datum: <span className="text-white">
                      {new Date(scheduledDate).toLocaleDateString('sr-RS', {
                        weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'
                      })}
                    </span></span>
                  </div>
                  {displayCraftsman.location && (
                    <div className="flex items-center gap-3 text-gray-300 text-sm">
                      <MapPin className="w-4 h-4 text-gray-500" />
                      <span>Lokacija: <span className="text-white">{displayCraftsman.location}</span></span>
                    </div>
                  )}
                  {estimatedMinutes != null && (
                    <div className="flex items-center gap-3 text-gray-300 text-sm">
                      <Clock className="w-4 h-4 text-gray-500" />
                      <span>Procenjeno vreme: <span className="text-white font-medium">
                        {Math.floor(estimatedMinutes / 60)}h {estimatedMinutes % 60}min
                      </span></span>
                    </div>
                  )}
                  {isUrgent && (
                    <div className="inline-flex items-center gap-1.5 bg-orange-500/10 border border-orange-500/30 text-orange-400 text-xs px-3 py-1 rounded-full">
                      ⚡ Hitna intervencija
                    </div>
                  )}
                </div>
              </div>

              {/* Pregled cene */}
              <div className="bg-gray-800/60 border border-gray-700 rounded-2xl p-6">
                <h2 className="text-white font-semibold text-lg mb-4">Pregled cene</h2>
                <div className="space-y-3">
                  <div className="flex justify-between text-gray-300 text-sm">
                    <span>Satnica majstora</span>
                    <span>{Number(displayCraftsman.hourlyRate).toLocaleString()} RSD/h</span>
                  </div>
                  {estimatedMinutes != null && (
                    <div className="flex justify-between text-gray-300 text-sm">
                      <span>Procenjeno vreme</span>
                      <span>{Math.floor(estimatedMinutes / 60)}h {estimatedMinutes % 60}min</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-gray-500 text-xs pt-1">
                    <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                    Minimum 1h naplate · Svaki kvart iznad 1h se zaračunava posebno
                  </div>
                  <div className="border-t border-gray-700 pt-3 flex justify-between">
                    <span className="text-white font-bold text-lg">Procenjena cena</span>
                    <span className="text-white font-bold text-2xl">
                      {Number(estimatedPrice).toLocaleString('sr-RS')} RSD
                    </span>
                  </div>
                  <p className="text-gray-500 text-xs">
                    Na kartici će biti rezervisano {(Number(estimatedPrice) * 1.5).toLocaleString('sr-RS')} RSD
                    (procena + 50% buffer). Tačan iznos naplaćuje se tek po završetku posla.
                  </p>
                </div>
              </div>

              {/* Podaci kartice */}
              <div className="bg-gray-800/60 border border-gray-700 rounded-2xl p-6 space-y-4">
                <h2 className="text-white font-semibold text-lg mb-2">Podaci kartice</h2>

                {savedCard ? (
                  <div className="flex items-center gap-4 p-4 bg-gray-700/50 rounded-xl border border-gray-600">
                    <CreditCard className="w-8 h-8 text-blue-400 flex-shrink-0" />
                    <div>
                      <p className="text-white font-medium">{savedCard.cardBrand} {savedCard.maskedNumber}</p>
                      <p className="text-gray-400 text-sm">Sačuvana kartica</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-4 p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
                    <Lock className="w-6 h-6 text-blue-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-white font-medium mb-1">Sigurna stranica za unos kartice</p>
                      <p className="text-gray-400 text-sm">
                        Bićete preusmereni na AllSecure-ovu zaštićenu stranicu.
                        Podaci kartice nikad ne prolaze kroz naše servere.
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

              {/* Dugmad */}
              <div className="flex gap-3">
                <button
                  onClick={() => navigate(-1)}
                  className="flex-1 py-4 bg-gray-800 hover:bg-gray-700 border border-gray-600 text-white rounded-xl transition font-medium"
                >
                  Nazad
                </button>
                <button
                  onClick={handlePayment}
                  disabled={loading || !isReady}
                  className="flex-1 flex items-center justify-center gap-3 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <><Loader2 className="w-5 h-5 animate-spin" /> Procesiranje...</>
                  ) : savedCard ? (
                    <><CreditCard className="w-5 h-5" /> Rezerviši {Number(estimatedPrice).toLocaleString()} RSD</>
                  ) : (
                    <>Nastavi na unos kartice <ArrowRight className="w-5 h-5" /></>
                  )}
                </button>
              </div>

            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
}
