import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, MapPin, Clock, Star, Briefcase, Mail, Phone, DollarSign,
  Calendar, AlertCircle, Loader2, CheckCircle, XCircle, CalendarClock, AlertTriangle
} from 'lucide-react';
import Header from "../components/Header";
import Footer from "../components/Footer";
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const API_BASE = "http://localhost:5114";

const StarRating = ({ rating, size = 'sm', interactive = false, onRate }) => {
  const [hoverRating, setHoverRating] = useState(0);
  const stars = [];
  const displayRating = interactive ? (hoverRating || rating) : rating;
  const rounded = Math.round(displayRating * 2) / 2;
  const cls = size === 'lg' ? 'w-6 h-6' : 'w-5 h-5';

  for (let i = 1; i <= 5; i++) {
    stars.push(
      <Star 
        key={i}
        className={`${cls} ${i <= rounded ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600'} ${interactive ? 'cursor-pointer hover:scale-110 transition-transform' : ''}`}
        onMouseEnter={() => interactive && setHoverRating(i)}
        onMouseLeave={() => interactive && setHoverRating(0)}
        onClick={() => interactive && onRate && onRate(i)}
      />
    );
  }
  return <div className="flex gap-1">{stars}</div>;
};

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

const CraftsmanProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [craftsman, setCraftsman] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchCraftsmanData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch craftsman profile
        const profileResponse = await fetch(`${API_BASE}/api/craftsmen/${id}`);
        if (!profileResponse.ok) throw new Error('Failed to fetch craftsman profile');
        const profileJson = await profileResponse.json();
        const craftsmanData = profileJson.data || profileJson;
        
        // Fetch job orders
        const jobsResponse = await fetch(`${API_BASE}/api/joborders/craftsman/${id}`);
        if (jobsResponse.ok) {
          const jobsJson = await jobsResponse.json();
          const jobs = jobsJson.data || [];
          craftsmanData.jobOrders = jobs;
        } else {
          craftsmanData.jobOrders = [];
        }
        
        setCraftsman(craftsmanData);

        // Fetch reviews for this craftsman
        const reviewsResponse = await api.getCraftsmanReviews(id);
        const reviewsData = reviewsResponse.success ? reviewsResponse.data : [];
        setReviews(reviewsData);

      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchCraftsmanData();
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

  if (error || !craftsman) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Profil nije pronađen.</h2>
            <p className="text-gray-400 mb-6">{error || 'Could not load craftsman profile'}</p>
            <button
              onClick={() => navigate(-1)}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition"
            >
              Nazad
            </button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const initials = `${craftsman.firstName?.[0] ?? ''}${craftsman.lastName?.[0] ?? ''}`.toUpperCase();
  const activeJobs = craftsman.jobOrders?.filter(job => 
    job.status?.toLowerCase() === 'u toku' || job.status?.toLowerCase() === 'zakazano'
  ) || [];
  const completedJobs = craftsman.jobOrders?.filter(job => 
    job.status?.toLowerCase() === 'završeno'
  ) || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex flex-col">
      <Header />

      <div className="flex-1 px-4 sm:px-6 lg:px-8 py-10">
        <div className="max-w-5xl mx-auto">
          
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-8 group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Nazad
          </button>

          <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700 p-8 mb-6">
            <div className="flex flex-col md:flex-row gap-6">
              <div className="w-32 h-32 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-4xl shadow-2xl flex-shrink-0">
                {initials}
              </div>

              <div className="flex-1">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-2">
                  <h1 className="text-4xl font-bold text-white">
                    {craftsman.firstName} {craftsman.lastName}
                  </h1>
                </div>

                <p className="text-blue-400 text-xl font-medium capitalize mb-4">{craftsman.profession}</p>
                
                <div className="flex items-center gap-3 mb-6">
                  {reviews.length > 0 ? (
                    <>
                      <StarRating rating={reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length} size="lg" />
                      <span className="text-white font-bold text-2xl">
                        {(reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)}
                      </span>
                      <span className="text-gray-400">/ 5.0</span>
                      <span className="text-gray-400">({reviews.length} recenzija)</span>
                    </>
                  ) : (
                    <span className="text-gray-400">Još nema recenzija</span>
                  )}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-gray-900/50 rounded-xl p-3 border border-gray-700">
                    <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
                      <Briefcase className="w-3.5 h-3.5" /> Iskustvo
                    </div>
                    <p className="text-white font-bold">{craftsman.experience} godina</p>
                  </div>
                  <div className="bg-gray-900/50 rounded-xl p-3 border border-gray-700">
                    <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
                      <DollarSign className="w-3.5 h-3.5" /> Satnica
                    </div>
                    <p className="text-white font-bold">{craftsman.hourlyRate} RSD/h</p>
                  </div>
                  <div className="bg-gray-900/50 rounded-xl p-3 border border-gray-700">
                    <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
                      <MapPin className="w-3.5 h-3.5" /> Lokacija
                    </div>
                    <p className="text-white font-bold truncate">{craftsman.location || 'N/A'}</p>
                  </div>
                  <div className="bg-gray-900/50 rounded-xl p-3 border border-gray-700">
                    <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
                      <Clock className="w-3.5 h-3.5" /> Sati
                    </div>
                    <p className="text-white font-bold truncate">{craftsman.workingHours || 'N/A'}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-700 flex flex-wrap gap-4">
              <a
                href={`mailto:${craftsman.email}`}
                className="flex items-center gap-2 text-gray-300 hover:text-blue-400 transition"
              >
                <Mail className="w-5 h-5" />
                {craftsman.email}
              </a>
              <span className="text-gray-700">·</span>
              <a
                href={`tel:${craftsman.phone}`}
                className="flex items-center gap-2 text-gray-300 hover:text-blue-400 transition"
              >
                <Phone className="w-5 h-5" />
                {craftsman.phone}
              </a>
            </div>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700 p-6 mb-6">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <CalendarClock className="w-6 h-6 text-blue-400" />
              Aktivni Poslovi
              <span className="text-sm font-normal text-gray-400 ml-2">({activeJobs.length})</span>
            </h2>
            
            {activeJobs.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400">Trenutno nema aktivnih poslova.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {activeJobs.map((job) => (
                  <div
                    key={job.jobId}
                    className="bg-gray-900/50 border border-gray-700 rounded-xl p-5 hover:border-blue-500/50 transition"
                  >
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-white text-sm font-medium ${getStatusColor(job.status)}`}>
                            {getStatusIcon(job.status)}
                            {job.status}
                          </span>
                          {job.urgent && (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-red-600 text-white text-sm font-medium">
                              <AlertTriangle className="w-4 h-4" />
                              Hitno
                            </span>
                          )}
                        </div>
                        
                        <p className="text-white font-medium mb-2">{job.jobDescription || 'Opis nedostupan'}</p>
                        
                        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-4 h-4" />
                            {new Date(job.scheduledDate).toLocaleDateString('sr-RS', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                          <span className="text-gray-700">·</span>
                          <div className="flex items-center gap-1.5">
                            <DollarSign className="w-4 h-4" />
                            {job.totalPrice.toLocaleString()} RSD
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700 p-6">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <CheckCircle className="w-6 h-6 text-green-400" />
              Završeni Poslovi
              <span className="text-sm font-normal text-gray-400 ml-2">({completedJobs.length})</span>
            </h2>
            
            {completedJobs.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400">Trenutno nema završenih poslova.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {completedJobs.slice(0, 5).map((job) => (
                  <div
                    key={job.jobId}
                    className="bg-gray-900/50 border border-gray-700 rounded-xl p-5"
                  >
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                      <div className="flex-1">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-white text-sm font-medium mb-3 ${getStatusColor(job.status)}`}>
                          {getStatusIcon(job.status)}
                          {job.status}
                        </span>
                        
                        <p className="text-white font-medium mb-2">{job.jobDescription || 'Opis nedostupan.'}</p>
                        
                        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-4 h-4" />
                            {new Date(job.scheduledDate).toLocaleDateString('sr-RS', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric'
                            })}
                          </div>
                          <span className="text-gray-700">·</span>
                          <div className="flex items-center gap-1.5">
                            <DollarSign className="w-4 h-4" />
                            {job.totalPrice.toLocaleString()} RSD
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                
                {completedJobs.length > 5 && (
                  <p className="text-center text-gray-400 text-sm pt-2">
                    Još {completedJobs.length - 5} završenih poslova
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Reviews Section */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700 p-6">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <Star className="w-6 h-6 text-yellow-400" />
              Recenzije
              <span className="text-sm font-normal text-gray-400 ml-2">({reviews.length})</span>
            </h2>

            {reviews.length === 0 ? (
              <div className="text-center py-12">
                <Star className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400">Još nema recenzija za ovog majstora.</p>
                <p className="text-gray-500 text-sm mt-1">Recenzije se mogu ostaviti nakon završetka posla.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {reviews.map((review) => (
                  <div
                    key={review.reviewId}
                    className="bg-gray-900/50 border border-gray-700 rounded-xl p-5"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                        {review.user?.firstName?.[0]}{review.user?.lastName?.[0]}
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-white font-medium">
                            {review.user?.firstName} {review.user?.lastName}
                          </span>
                          <StarRating rating={review.rating} size="sm" />
                          <span className="text-gray-400 text-sm">
                            {new Date(review.createdAt).toLocaleDateString('sr-RS')}
                          </span>
                        </div>

                        {review.comment && (
                          <p className="text-gray-300 leading-relaxed">{review.comment}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>

      <Footer />
    </div>
  );
};

export default CraftsmanProfile;