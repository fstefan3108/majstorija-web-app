import { useState, useEffect } from "react";
import { MessageCircle, ChevronRight, Calendar, AlertTriangle } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";
import WorkerProfile from "../components/WorkerProfile";
import ServicesTable from "../components/ServicesTable";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

export default function WorkerDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [workerData, setWorkerData] = useState(null);
  const [originalWorkerData, setOriginalWorkerData] = useState(null);
  const [services, setServices] = useState([]);
  const [jobRequests, setJobRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchJobs();
      fetchJobRequests();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      const response = await api.getCraftsmanProfile(user.id);
      const craftsman = response.data || response;
      setOriginalWorkerData(craftsman);
      setWorkerData({
        craftsmanId: craftsman.craftsmanId,
        firstName: craftsman.firstName,
        lastName: craftsman.lastName,
        email: craftsman.email,
        phone: craftsman.phone,
        profession: craftsman.profession,
        experience: craftsman.experience,
        workingHours: craftsman.workingHours,
        hourlyRate: craftsman.hourlyRate,
        location: craftsman.location || '',
        averageRating: craftsman.averageRating || 0,
        ratingCount: craftsman.ratingCount || 0
      });
    } catch (err) {
      console.error('Error fetching profile:', err);
      setError('Greška pri učitavanju profila');
    }
  };

  const fetchJobRequests = async () => {
    try {
      const res = await api.getJobRequestsByCraftsman(user.id);
      const list = res.data || res;
      // Prikazujemo samo pending i accepted zahteve
      const active = Array.isArray(list)
        ? list.filter(r => r.status === 'pending' || r.status === 'accepted')
        : [];
      setJobRequests(active);
    } catch {
      // Tiho ignoriši
    }
  };

  const fetchJobs = async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await api.getJobOrdersByCraftsman(user.id);
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

  const handleProfileUpdate = async (updatedData) => {
    try {
      const craftsmanUpdate = {
        ...originalWorkerData,
        firstName: updatedData.firstName,
        lastName: updatedData.lastName,
        phone: updatedData.phone,
        location: updatedData.location,
        profession: updatedData.profession,
        experience: parseInt(updatedData.experience),
        hourlyRate: parseFloat(updatedData.hourlyRate),
        workingHours: updatedData.workingHours,
      };
      const response = await api.updateCraftsman(user.id, craftsmanUpdate);
      if (response.success) {
        setOriginalWorkerData(craftsmanUpdate);
        setWorkerData(updatedData);
        alert('Profil uspešno ažuriran!');
      }
    } catch (err) {
      console.error('Error updating profile:', err);
      alert('Greška pri ažuriranju profila: ' + err.message);
      throw err;
    }
  };

  const handleDelete = async (jobId) => {
    if (!confirm('Da li ste sigurni da želite da obrišete ovaj posao?')) return;
    try {
      await api.deleteJobOrder(jobId);
      setServices(prev => prev.filter(job => job.jobId !== jobId));
      alert('Posao uspešno obrisan!');
    } catch (err) {
      console.error('Error deleting job:', err);
      alert('Greška pri brisanju posla: ' + err.message);
    }
  };

  if (!workerData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-400">Učitavanje...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex flex-col">
      <Header />

      <main className="flex-1 p-6 lg:p-10">
        <div className="max-w-6xl mx-auto">
          <div className="mb-6 flex justify-between items-center">
            <div className="text-white">
              <h1 className="text-2xl font-bold">Dobrodošli, {workerData.firstName}!</h1>
              <p className="text-gray-300">Email: {workerData.email}</p>
            </div>
            <Link to="/workers/chat">
              <button className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition font-semibold">
                <MessageCircle className="w-5 h-5" />
                Moje Poruke
              </button>
            </Link>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-8 border border-gray-700">
            <WorkerProfile
              data={workerData}
              onUpdate={handleProfileUpdate}
            />
          </div>

          {error && (
            <div className="mt-6 bg-red-500/20 border border-red-500 rounded-2xl p-4">
              <p className="text-red-400">{error}</p>
            </div>
          )}

          {/* Sekcija dolazećih zahteva */}
          {jobRequests.length > 0 && (
            <div className="mt-10 bg-[#1e2028] rounded-2xl p-6 lg:p-8 border border-blue-500/30">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-pulse" />
                <h2 className="text-xl font-bold text-white">Zahtevi za posao</h2>
                <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400 text-sm font-semibold border border-blue-500/30">
                  {jobRequests.length}
                </span>
              </div>
              <div className="flex flex-col gap-3">
                {jobRequests.map((req) => (
                  <button
                    key={req.requestId}
                    onClick={() => navigate(`/job-request/${req.requestId}`)}
                    className="w-full text-left rounded-xl border p-4 flex items-center gap-4 transition hover:-translate-y-0.5 hover:shadow-lg
                      bg-blue-900/10 border-blue-500/30 hover:border-blue-400/60"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-white font-semibold truncate">{req.title}</span>
                        {req.status === 'pending' && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 flex-shrink-0">
                            Čeka odgovor
                          </span>
                        )}
                        {req.status === 'accepted' && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/30 flex-shrink-0">
                            Prihvaćen
                          </span>
                        )}
                        {req.urgent && (
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-600 text-white text-xs flex-shrink-0">
                            <AlertTriangle className="w-3 h-3" /> Hitno
                          </span>
                        )}
                      </div>
                      <p className="text-gray-400 text-sm truncate">{req.description}</p>
                      <p className="text-gray-500 text-xs mt-1 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(req.scheduledDate).toLocaleDateString('sr-RS', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                      </p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-500 flex-shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mt-10 bg-gray-800/50 backdrop-blur-sm rounded-2xl p-8 border border-gray-700">
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-gray-400">Učitavanje poslova...</p>
              </div>
            ) : (
              <ServicesTable
                services={services}
                onDelete={handleDelete}
                isWorker={true}
              />
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}