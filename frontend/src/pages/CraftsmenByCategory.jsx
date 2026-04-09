import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Wrench, Zap, Hammer, Armchair, Wind, Droplets, PaintBucket, Tv, Car,
  MapPin, Clock, Star, Briefcase, ArrowLeft, MessageSquare,
  AlertCircle, Loader2, X, User, Search, SlidersHorizontal
} from 'lucide-react';
import Header from "../components/Header";
import Footer from "../components/Footer";
import { useAuth } from '../context/AuthContext';
import CraftsmenFilter from '../components/CraftsmenFilter';
import ContactModal from '../components/ContactModal';


const API_BASE = "http://localhost:5114";


const categoryConfig = {
  plumbers: { 
    name: 'Vodoinstalateri', 
    icon: Droplets, 
    color: 'from-blue-500 to-cyan-500', 
    apiProfession: 'plumber', 
    description: 'Stručni vodoinstalateri za sve vaše potrebe vezane za vodu i cevi' 
  },
  electricians: { 
    name: 'Električari', 
    icon: Zap, 
    color: 'from-yellow-500 to-orange-500', 
    apiProfession: 'electrician', 
    description: 'Licencirani električari za siguran i pouzdan električni rad' 
  },
  handymen: { 
    name: 'Zanatlije', 
    icon: Hammer, 
    color: 'from-purple-500 to-pink-500', 
    apiProfession: 'handyman', 
    description: 'Vešti majstori spremni za sve kućne popravke i održavanje' 
  },
  'furniture-assembly': { 
    name: 'Sklapanje nameštaja', 
    icon: Armchair, 
    color: 'from-green-500 to-emerald-500', 
    apiProfession: 'furniture assembly', 
    description: 'Profesionalci za sklapanje i postavljanje nameštaja' 
  },
  'air-conditioning': { 
    name: 'Klima uređaji', 
    icon: Wind, 
    color: 'from-cyan-500 to-blue-500', 
    apiProfession: 'air conditioning', 
    description: 'Stručnjaci za klimatizaciju: instalacija, popravka i održavanje' 
  },
  painters: { 
    name: 'Moleri', 
    icon: PaintBucket, 
    color: 'from-red-500 to-pink-500', 
    apiProfession: 'painter', 
    description: 'Vešti slikari za prelepe enterijer i eksterijer završne radove' 
  },
  'tv-mounting': { 
    name: 'Postavljanje TV-a', 
    icon: Tv, 
    color: 'from-indigo-500 to-purple-500', 
    apiProfession: 'tv mounting', 
    description: 'Profesionalno postavljanje televizora i kućnih bioskopa' 
  },
  'auto-mechanics': { 
    name: 'Auto mehaničari', 
    icon: Car, 
    color: 'from-gray-600 to-gray-800', 
    apiProfession: 'auto mechanic', 
    description: 'Pouzdani mehaničari za sve popravke i održavanje vozila' 
  },
  'general-help': { 
    name: 'Opšta pomoć', 
    icon: Wrench, 
    color: 'from-blue-600 to-indigo-600', 
    apiProfession: 'general help', 
    description: 'Svestrani pomagači za razne kućne i kancelarijske zadatke' 
  }
};

const StarRating = ({ rating, size = 'sm' }) => {
  const stars = [];
  const rounded = Math.round(rating * 2) / 2;
  const cls = size === 'lg' ? 'w-5 h-5' : 'w-4 h-4';
  for (let i = 1; i <= 5; i++) {
    stars.push(<Star key={i} className={`${cls} ${i <= rounded ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600'}`} />);
  }
  return <div className="flex gap-0.5">{stars}</div>;
};


// CRAFTSMAN CARD
const CraftsmanCard = ({ craftsman, onContact }) => {
  const { user } = useAuth();
  const initials = `${craftsman.firstName?.[0] ?? ''}${craftsman.lastName?.[0] ?? ''}`.toUpperCase();
  const canContact = user && user.role !== 'Craftsman';

  return (
    <div className="group bg-gray-800/60 backdrop-blur-sm rounded-2xl border border-gray-700 hover:border-blue-500/60 transition-all duration-300 overflow-hidden hover:shadow-xl hover:shadow-blue-900/20 hover:-translate-y-1">
      <div className="p-6 pb-4">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xl flex-shrink-0 shadow-lg">{initials || '?'}</div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-white truncate group-hover:text-blue-400 transition-colors">{craftsman.firstName} {craftsman.lastName}</h3>
            <p className="text-blue-400 text-sm font-medium capitalize">{craftsman.profession}</p>
            <div className="flex items-center gap-2 mt-1">
              {craftsman.averageRating != null ? (<><StarRating rating={craftsman.averageRating} /><span className="text-gray-400 text-sm">{craftsman.averageRating.toFixed(1)}</span></>) : <span className="text-gray-500 text-sm">Još uvek nema ocena</span>}
            </div>
          </div>
        </div>
      </div>
      <div className="mx-6 border-t border-gray-700/60" />
      <div className="p-6 pt-4 space-y-3">
        <div className="flex items-center gap-2 text-gray-300 text-sm"><MapPin className="w-4 h-4 text-gray-500 flex-shrink-0" /><span className="truncate">{craftsman.location || 'Lokacija nije navedena'}</span></div>
        <div className="flex items-center gap-2 text-gray-300 text-sm"><Briefcase className="w-4 h-4 text-gray-500 flex-shrink-0" /><span>{craftsman.experience} god. iskustva</span></div>
        <div className="flex items-center gap-2 text-gray-300 text-sm"><Clock className="w-4 h-4 text-gray-500 flex-shrink-0" /><span>{craftsman.workingHours || 'Radno vreme nije navedeno'}</span></div>
        <div className="pt-2">
          <span className="text-2xl font-bold text-white">{craftsman.hourlyRate}</span><span className="text-gray-400 text-sm ml-1">RSD/h</span>
        </div>
      </div>
      <div className="px-6 pb-5 flex flex-col gap-2">
        {canContact && (
          <button
            onClick={() => onContact(craftsman)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition shadow-lg shadow-blue-600/20"
          >
            <MessageSquare className="w-4 h-4" />
            Kontaktiraj
          </button>
        )}
        <Link to={`/craftsman/${craftsman.craftsmanId}`} className="w-full flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-all border border-gray-600"><User className="w-4 h-4" />Profil</Link>
      </div>
    </div>
  );
};

// MAIN PAGE
const CraftsmenByCategory = () => {
  const { category } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const config = categoryConfig[category];

  const [craftsmen, setCraftsmen] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortBy, setSortBy] = useState('rating');
  const [selectedCraftsman, setSelectedCraftsman] = useState(null);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  const defaultFilters = { location: '', minPrice: '', maxPrice: '', minRating: 0 };
  const [filters, setFilters] = useState(defaultFilters);

  const hasActiveFilters =
    filters.location !== '' || filters.minPrice !== '' || filters.maxPrice !== '' ||
    filters.minRating !== 0;

  useEffect(() => {
    if (!config) { navigate('/browse-tasks', { replace: true }); return; }
    const fetchCraftsmen = async () => {
      setLoading(true); setError(null);
      try {
        const response = await fetch(`${API_BASE}/api/craftsmen/profession/${encodeURIComponent(config.apiProfession)}`);
        if (!response.ok) throw new Error('Failed to fetch craftsmen');
        const json = await response.json();
        setCraftsmen(json.data || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchCraftsmen();
  }, [category, config, navigate]);

  const filteredAndSortedCraftsmen = [...craftsmen]
    .filter(c => {
      if (filters.location && !c.location?.toLowerCase().includes(filters.location.toLowerCase())) return false;
      if (filters.minPrice && c.hourlyRate < Number(filters.minPrice)) return false;
      if (filters.maxPrice && c.hourlyRate > Number(filters.maxPrice)) return false;
      if (filters.minRating && (c.averageRating ?? 0) < filters.minRating) return false;
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'rating': return (b.averageRating ?? 0) - (a.averageRating ?? 0);
        case 'price_asc': return a.hourlyRate - b.hourlyRate;
        case 'price_desc': return b.hourlyRate - a.hourlyRate;
        case 'experience': return b.experience - a.experience;
        default: return 0;
      }
    });

  if (!config) return null;
  const IconComponent = config.icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex flex-col">
      <Header />

      {selectedCraftsman && user && (
        <ContactModal
          craftsman={selectedCraftsman}
          user={user}
          onClose={() => setSelectedCraftsman(null)}
          onSuccess={() => setSelectedCraftsman(null)}
        />
      )}

      {/* MOBILE FILTER DRAWER */}
      {mobileFilterOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileFilterOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-80 bg-gray-900 border-r border-gray-700 overflow-y-auto z-50 shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <span className="text-white font-bold">Filteri</span>
              <button onClick={() => setMobileFilterOpen(false)} className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4">
              <CraftsmenFilter filters={filters} onChange={setFilters} onReset={() => setFilters(defaultFilters)} hasActiveFilters={hasActiveFilters} />
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 px-4 sm:px-6 lg:px-8 pt-16 pb-10">
        <div className="max-w-7xl mx-auto">

          <button onClick={() => navigate('/browse-tasks', { replace: true })} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-8 group">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Nazad na kategorije
          </button>

          {/* HERO HEADER */}
          <div className="relative rounded-3xl overflow-hidden mb-10 bg-gray-800/50 border border-gray-700">
            <div className={`absolute inset-0 bg-gradient-to-br ${config.color} opacity-10`} />
            <div className="relative p-8 md:p-12 flex flex-col md:flex-row items-start md:items-center gap-6">
              <div className={`w-20 h-20 bg-gradient-to-br ${config.color} rounded-2xl flex items-center justify-center shadow-2xl flex-shrink-0`}>
                <IconComponent className="w-10 h-10 text-white" />
              </div>
              <div>
                <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">{config.name}</h1>
                <p className="text-gray-300 text-lg">{config.description}</p>
              </div>
              {!loading && !error && (
                <div className="md:ml-auto text-right">
                  <div className="text-4xl font-bold text-white">{filteredAndSortedCraftsmen.length}</div>
                  <div className="text-gray-400">Dostupnih Majstora{filteredAndSortedCraftsmen.length !== 1 ? 's' : ''}</div>
                </div>
              )}
            </div>
          </div>

          {/* SIDEBAR CONTENT */}
          <div className="flex gap-8 items-start">

            {/* LEFT SIDEBAR  */}
            {!loading && !error && craftsmen.length > 0 && (
              <aside className="hidden lg:block w-64 xl:w-72 flex-shrink-0 sticky top-6 self-start">
                <CraftsmenFilter
                  filters={filters}
                  onChange={setFilters}
                  onReset={() => setFilters(defaultFilters)}
                  hasActiveFilters={hasActiveFilters}
                />
              </aside>
            )}

            {/* RIGHT: sort bar + grid */}
            <div className="flex-1 min-w-0">

              {/* Toolbar */}
              {!loading && !error && craftsmen.length > 0 && (
                <div className="flex flex-wrap items-center gap-3 mb-6">
                  {/* Mobile filter toggle */}
                  <button
                    onClick={() => setMobileFilterOpen(true)}
                    className="lg:hidden flex items-center gap-2 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-300 hover:text-white hover:border-blue-500 transition text-sm font-medium"
                  >
                    <SlidersHorizontal className="w-4 h-4" />
                    Filteri
                    {hasActiveFilters && <span className="w-2 h-2 rounded-full bg-blue-500" />}
                  </button>

                  <span className="text-gray-500 text-sm hidden sm:block">Sortiranje:</span>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { value: 'rating', label: 'Najbolje Ocenjeni' },
                      { value: 'price_asc', label: 'Cena ↑' },
                      { value: 'price_desc', label: 'Cena ↓' },
                      { value: 'experience', label: 'Iskustvo' },
                    ].map(opt => (
                      <button key={opt.value} onClick={() => setSortBy(opt.value)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${sortBy === opt.value ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700 border border-gray-700'}`}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* LOADING */}
              {loading && (
                <div className="flex flex-col items-center justify-center py-32 gap-4">
                  <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
                  <p className="text-gray-400">Učitavamo... {config.name.toLowerCase()}...</p>
                </div>
              )}

              {/* ERROR */}
              {error && (
                <div className="flex flex-col items-center justify-center py-32 gap-4">
                  <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center"><AlertCircle className="w-8 h-8 text-red-400" /></div>
                  <p className="text-red-400 font-medium">Neuspešno učitavanje radnika</p>
                  <p className="text-gray-500 text-sm">{error}</p>
                  <button onClick={() => window.location.reload()} className="mt-2 px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors text-sm">Pokučaj Ponovo</button>
                </div>
              )}

              {/* NO CRAFTSMEN */}
              {!loading && !error && craftsmen.length === 0 && (
                <div className="flex flex-col items-center justify-center py-32 gap-4 text-center">
                  <div className={`w-20 h-20 bg-gradient-to-br ${config.color} opacity-30 rounded-2xl flex items-center justify-center`}><IconComponent className="w-10 h-10 text-white" /></div>
                  <h3 className="text-2xl font-bold text-white">Nema {config.name} koji su dostupni</h3>
                  <p className="text-gray-400 max-w-md">Trenutno nema {config.name.toLowerCase()} koji su registrovani.</p>
                  <Link to="/browse-tasks" className="mt-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors font-semibold">Pogledaj ostale kategorije</Link>
                </div>
              )}

              {/* GRID */}
              {!loading && !error && filteredAndSortedCraftsmen.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                  {filteredAndSortedCraftsmen.map(craftsman => (
                    <CraftsmanCard key={craftsman.craftsmanId} craftsman={craftsman} onContact={setSelectedCraftsman} />
                  ))}
                </div>
              )}

              {/* NO FILTER RESULTS */}
              {!loading && !error && craftsmen.length > 0 && filteredAndSortedCraftsmen.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
                  <Search className="w-12 h-12 text-gray-600" />
                  <h3 className="text-xl font-bold text-white">Nema rezultata</h3>
                  <p className="text-gray-400">Pokušaj sa drugim filterima.</p>
                  <button onClick={() => setFilters(defaultFilters)} className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm">Resetuj filtere</button>
                </div>
              )}

            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default CraftsmenByCategory;