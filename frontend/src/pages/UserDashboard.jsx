import { useState, useEffect, useRef } from "react";
import { MessageCircle, Search, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";
import UserProfile from "../components/UserProfile";
import ServicesTable from "../components/ServicesTable";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5114";
const AUTO_CONFIRM_SECONDS = 30 * 60; // 30 minutes

// Countdown card shown for each "Ceka potvrdu" job
function CaptureCard({ service, onCapture, capturing }) {
  const [secondsLeft, setSecondsLeft] = useState(null);
  const autoFiredRef = useRef(false);

  useEffect(() => {
    // Fallback: if endedAt is missing, use "now" so countdown starts from full 30 min
    const base = service.endedAt ? new Date(service.endedAt).getTime() : Date.now();
    const deadline = base + AUTO_CONFIRM_SECONDS * 1000;

    const tick = () => {
      const remaining = Math.max(0, Math.floor((deadline - Date.now()) / 1000));
      setSecondsLeft(remaining);
      if (remaining === 0 && !autoFiredRef.current) {
        autoFiredRef.current = true;
        onCapture(service.jobId);
      }
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [service.endedAt, service.jobId]);

  const formatCountdown = (s) => {
    if (s === null) return "--:--";
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const isUrgent = secondsLeft !== null && secondsLeft < 120;

  return (
    <div className={`rounded-xl border p-5 flex flex-col sm:flex-row sm:items-center gap-4 ${
      isUrgent
        ? "bg-red-900/20 border-red-500/50"
        : "bg-yellow-900/20 border-yellow-500/40"
    }`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-white font-semibold">#{service.jobId}</span>
          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-600/20 text-purple-400 border border-purple-500/40">
            Čeka potvrdu
          </span>
          {service.urgent && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-600 text-white text-xs">
              <AlertCircle className="w-3 h-3" /> Hitno
            </span>
          )}
        </div>
        <p className="text-gray-300 text-sm truncate">{service.jobDescription || "Bez opisa"}</p>
        <p className="text-white font-bold text-lg mt-1">
          {service.totalPrice.toLocaleString()} RSD
        </p>
      </div>

      <div className="flex flex-col items-center gap-1 min-w-[90px]">
        <div className={`flex items-center gap-1.5 text-sm font-mono font-semibold ${isUrgent ? "text-red-400" : "text-yellow-400"}`}>
          <Clock className="w-4 h-4" />
          {formatCountdown(secondsLeft)}
        </div>
        <p className="text-gray-500 text-xs text-center">auto-potvrda</p>
      </div>

      <button
        onClick={() => onCapture(service.jobId)}
        disabled={capturing === service.jobId}
        className="flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-500 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-lg font-semibold text-sm transition"
      >
        <CheckCircle className="w-4 h-4" />
        {capturing === service.jobId ? "Obrađuje se..." : "Potvrdi"}
      </button>
    </div>
  );
}

export default function UserDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [userData, setUserData] = useState(null);
  const [originalUserData, setOriginalUserData] = useState(null);
  const [services, setServices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [capturingId, setCapturingId] = useState(null);

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchJobs();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      const response = await api.getUserProfile(user.id);
      const userProfile = response.data || response;

      setOriginalUserData(userProfile);

      setUserData({
        userId: userProfile.userId,
        firstName: userProfile.firstName,
        lastName: userProfile.lastName,
        email: userProfile.email,
        phone: userProfile.phone,
        location: userProfile.location || '',
      });
    } catch (err) {
      console.error('Error fetching profile:', err);
      setError('Greška pri učitavanju profila');
    }
  };

  const fetchJobs = async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await api.getJobOrdersByUser(user.id);
      const jobs = response.data || response;
      setServices(Array.isArray(jobs) ? jobs : []);
    } catch (err) {
      console.error('Error fetching jobs:', err);
      setError('Greška pri učitavanju poslova');
      setServices([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCapture = async (jobId) => {
    if (capturingId) return; // prevent double-click
    setCapturingId(jobId);
    try {
      const res = await fetch(`${API_BASE}/api/payments/${jobId}/capture`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${user?.accessToken}` },
      });
      const data = await res.json();
      if (data.success) {
        await fetchJobs();
      } else {
        alert('Greška pri potvrdi plaćanja. Pokušajte ponovo.');
      }
    } catch (err) {
      alert('Greška: ' + err.message);
    } finally {
      setCapturingId(null);
    }
  };

  const handleProfileUpdate = async (updatedData) => {
    try {
      const userUpdate = {
        ...originalUserData,
        firstName: updatedData.firstName,
        lastName: updatedData.lastName,
        phone: updatedData.phone,
        location: updatedData.location,
      };

      const response = await api.updateUser(user.id, userUpdate);

      if (response.success) {
        setOriginalUserData(userUpdate);
        setUserData(updatedData);
        alert('Profil uspešno ažuriran!');
      }
    } catch (err) {
      console.error('Error updating profile:', err);
      alert('Greška pri ažuriranju profila: ' + err.message);
      throw err;
    }
  };

  const handleFindWorker = () => {
    navigate('/browse-tasks');
  };

  const pendingConfirmation = services.filter(s => s.status === 'Ceka potvrdu');

  if (!userData) {
    return (
      <div className="min-h-screen bg-[#121418] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-[#2324fe] border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-400">Učitavanje...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#121418] flex flex-col">
      <Header />

      <main className="flex-1 p-6 lg:p-10">
        <div className="max-w-6xl mx-auto">
          <div className="mb-6 flex justify-between items-center">
            <div className="text-white">
              <h1 className="text-2xl font-bold">Dobrodošli, {userData.firstName}!</h1>
              <p className="text-gray-400">Email: {userData.email}</p>
            </div>
            <Link to="/chat">
              <button className="flex items-center gap-2 px-6 py-3 bg-[#2324fe] text-white rounded-lg hover:bg-[#1a1bca] transition">
                <MessageCircle className="w-5 h-5" />
                Moje Poruke
              </button>
            </Link>
          </div>

          <UserProfile
            data={userData}
            onUpdate={handleProfileUpdate}
          />

          {error && (
            <div className="mt-6 bg-red-500/20 border border-red-500 rounded-lg p-4">
              <p className="text-red-500">{error}</p>
            </div>
          )}

          {/* Pending confirmation panel */}
          {pendingConfirmation.length > 0 && (
            <div className="mt-10 bg-[#1e2028] rounded-2xl p-6 lg:p-8 border border-yellow-500/30">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-400 animate-pulse" />
                <h2 className="text-xl font-bold text-white">Potrebna potvrda</h2>
                <span className="px-2.5 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 text-sm font-semibold border border-yellow-500/30">
                  {pendingConfirmation.length}
                </span>
              </div>
              <p className="text-gray-400 text-sm mb-5">
                Majstor je završio posao. Potvrdite kako biste odobrili naplatu stvarnog iznosa.
                Ako ne potvrdite u roku od 30 minuta, naplate će biti automatski obrađena.
              </p>
              <div className="flex flex-col gap-3">
                {pendingConfirmation.map(service => (
                  <CaptureCard
                    key={service.jobId}
                    service={service}
                    onCapture={handleCapture}
                    capturing={capturingId}
                  />
                ))}
              </div>
            </div>
          )}

          <div className="mt-10">
            {isLoading ? (
              <div className="bg-[#1e2028] rounded-2xl p-8 border border-gray-700 text-center">
                <div className="animate-spin w-8 h-8 border-4 border-[#2324fe] border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-gray-400">Učitavanje poslova...</p>
              </div>
            ) : (
              <ServicesTable
                services={services}
                onAddService={handleFindWorker}
                buttonText="Pronađi Majstora"
                buttonIcon={<Search className="w-5 h-5" />}
              />
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
