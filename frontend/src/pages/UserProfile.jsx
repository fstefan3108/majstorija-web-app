import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  MapPin, Calendar, Loader2, AlertCircle, CheckCircle, XCircle,
  CalendarClock, User, Briefcase
} from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { useAuth } from '../context/AuthContext';

const API_BASE = "http://localhost:5114";

const getStatusColor = (status) => {
  switch (status?.toLowerCase()) {
    case 'u toku': return 'bg-blue-600';
    case 'zakazano': return 'bg-yellow-600';
    case 'završeno': return 'bg-green-600';
    case 'otkazano': return 'bg-red-600';
    default: return 'bg-gray-600';
  }
};

const getStatusIcon = (status) => {
  switch (status?.toLowerCase()) {
    case 'u toku': return <CalendarClock className="w-4 h-4" />;
    case 'završeno': return <CheckCircle className="w-4 h-4" />;
    case 'otkazano': return <XCircle className="w-4 h-4" />;
    default: return <Calendar className="w-4 h-4" />;
  }
};

const formatDate = (dateStr) => {
  if (!dateStr) return 'N/A';
  return new Date(dateStr).toLocaleDateString('sr-Latn-RS', {
    year: 'numeric', month: 'long', day: 'numeric'
  });
};

const UserProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();

  const [userData, setUserData] = useState(null);
  const [jobOrders, setJobOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const isOwnProfile = currentUser && String(currentUser.id) === String(id) && currentUser.role !== 'Craftsman';

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const profileRes = await fetch(`${API_BASE}/api/users/${id}`);
        if (!profileRes.ok) throw new Error('Korisnik nije pronađen');
        const profileJson = await profileRes.json();
        setUserData(profileJson.data);

        const jobsRes = await fetch(`${API_BASE}/api/joborders/user/${id}`);
        if (jobsRes.ok) {
          const jobsJson = await jobsRes.json();
          setJobOrders(jobsJson.data || []);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
            <p className="text-gray-400">Učitavamo profil...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (error || !userData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Profil nije pronađen</h2>
            <p className="text-gray-400 mb-6">{error || 'Korisnik ne postoji.'}</p>
            <button
              onClick={() => navigate(-1)}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition">
              Nazad
            </button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const initials = `${userData.firstName?.[0] ?? ''}${userData.lastName?.[0] ?? ''}`.toUpperCase();
  const completedJobs = jobOrders.filter(j => j.status?.toLowerCase() === 'završeno');
  const activeJobs = jobOrders.filter(j =>
    j.status?.toLowerCase() === 'u toku' || j.status?.toLowerCase() === 'zakazano'
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex flex-col">
      <Header />

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-10">
        {/* Profile header */}
        <div className="bg-gray-800/60 backdrop-blur-sm rounded-2xl border border-gray-700 overflow-hidden mb-6">
          <div className="h-28 bg-gradient-to-r from-blue-900/60 to-indigo-900/60" />
          <div className="px-8 pb-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-end gap-5 -mt-12 mb-6">
              {userData.profileImagePath ? (
                <img
                  src={`${API_BASE}${userData.profileImagePath}`}
                  alt={`${userData.firstName} ${userData.lastName}`}
                  className="w-24 h-24 rounded-2xl object-cover border-4 border-gray-800 shadow-xl"
                />
              ) : (
                <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-3xl font-bold border-4 border-gray-800 shadow-xl">
                  {initials || <User className="w-10 h-10" />}
                </div>
              )}
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-white">
                  {userData.firstName} {userData.lastName}
                </h1>
                <p className="text-gray-400 text-sm mt-0.5">Korisnik</p>
              </div>
              {isOwnProfile && (
                <button
                  onClick={() => navigate('/profile/settings')}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white rounded-lg text-sm transition">
                  Uredi profil
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-4 text-sm text-gray-400">
              {userData.location && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-gray-500" />
                  {userData.location}
                </span>
              )}
              {userData.createdAt && (
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  Član od {formatDate(userData.createdAt)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-800/60 rounded-xl border border-gray-700 p-4 text-center">
            <p className="text-2xl font-bold text-white">{jobOrders.length}</p>
            <p className="text-gray-400 text-sm mt-1">Ukupno narudžbina</p>
          </div>
          <div className="bg-gray-800/60 rounded-xl border border-gray-700 p-4 text-center">
            <p className="text-2xl font-bold text-green-400">{completedJobs.length}</p>
            <p className="text-gray-400 text-sm mt-1">Završeno</p>
          </div>
          <div className="bg-gray-800/60 rounded-xl border border-gray-700 p-4 text-center col-span-2 sm:col-span-1">
            <p className="text-2xl font-bold text-blue-400">{activeJobs.length}</p>
            <p className="text-gray-400 text-sm mt-1">Aktivno</p>
          </div>
        </div>

        {/* Job History */}
        <div className="bg-gray-800/60 backdrop-blur-sm rounded-2xl border border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-blue-400" />
            Istorija narudžbina
          </h2>

          {jobOrders.length === 0 ? (
            <div className="text-center py-10">
              <Briefcase className="w-10 h-10 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400">Još uvek nema narudžbina.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {jobOrders.map((job, idx) => (
                <div key={job.jobOrderId ?? idx}
                  className="flex items-center gap-4 p-4 bg-gray-700/40 rounded-xl border border-gray-600/50 hover:border-gray-500/60 transition">
                  <div className={`p-2 rounded-lg ${getStatusColor(job.status)}/20 text-white`}>
                    {getStatusIcon(job.status)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium truncate">
                      {job.description || job.profession || 'Usluga'}
                    </p>
                    <p className="text-gray-400 text-sm">
                      {job.craftsmanName
                        ? `Majstor: ${job.craftsmanName}`
                        : job.craftsmanId ? `Majstor #${job.craftsmanId}` : ''}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-white ${getStatusColor(job.status)}`}>
                      {job.status}
                    </span>
                    {job.scheduledDate && (
                      <span className="text-gray-500 text-xs">{formatDate(job.scheduledDate)}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default UserProfile;
