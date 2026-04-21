import { useState, useEffect } from 'react';
import {
  User, Mail, Phone, MapPin, Lock, Save, Eye, EyeOff,
  CheckCircle, AlertCircle, Loader2, Briefcase, Clock, FileText, ChevronDown
} from 'lucide-react';
import Header from "../components/Header";
import Footer from "../components/Footer";
import { useAuth } from '../context/AuthContext';
import { CATEGORIES } from '../constants/categories';

const API_BASE = "http://localhost:5114";
const MAX_CATEGORIES = 5;

export default function ProfileSettings() {
  const { user, updateUser } = useAuth();
  const isCraftsman = user?.role === 'Craftsman';
  const token = user?.accessToken || localStorage.getItem('accessToken');

  // Tab stanje: user ima 2, craftsman ima 3
  const [activeTab, setActiveTab] = useState('profile');
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  const [profileForm, setProfileForm] = useState({
    firstName: '', lastName: '', email: '', phone: '', location: '',
  });

  const [craftsmanForm, setCraftsmanForm] = useState({
    selectedCategories: [], selectedSubcategories: [],
    experience: 0, hourlyRate: 0,
    workingHours: '', workExperienceDescription: '',
  });
  const [openCategories, setOpenCategories] = useState([]);

  const [passwordForm, setPasswordForm] = useState({
    oldPassword: '', newPassword: '', confirmPassword: '',
  });

  // ─── Učitavanje podataka ──────────────────────────────────────────────────
  useEffect(() => {
    if (!user?.id) return;

    const fetchData = async () => {
      try {
        const endpoint = isCraftsman
          ? `${API_BASE}/api/craftsmen/${user.id}`
          : `${API_BASE}/api/users/${user.id}`;

        const res = await fetch(endpoint, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const json = await res.json();

        if (json.success) {
          const d = json.data;
          setProfileForm({
            firstName: d.firstName || '',
            lastName: d.lastName || '',
            email: d.email || '',
            phone: d.phone || '',
            location: d.location || '',
          });

          if (isCraftsman) {
            const savedSubs = d.subcategories || [];
            const inferredCats = CATEGORIES
              .filter(c => c.subcategories.some(s => savedSubs.includes(s.id)))
              .map(c => c.id);
            setCraftsmanForm({
              selectedCategories: d.categories || inferredCats,
              selectedSubcategories: savedSubs,
              experience: d.experience || 0,
              hourlyRate: d.hourlyRate || 0,
              workingHours: d.workingHours || '',
              workExperienceDescription: d.workExperienceDescription || '',
            });
            setOpenCategories(d.categories || inferredCats);
          }
        }
      } catch (err) {
        console.error('Greška pri učitavanju profila:', err);
      } finally {
        setPageLoading(false);
      }
    };

    fetchData();
  }, [user?.id]);

  const clearMessages = () => { setError(null); setSuccess(null); };

  // ─── Snimanje ličnih podataka ─────────────────────────────────────────────
  const handleProfileSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    clearMessages();

    try {
      let endpoint, body;

      if (isCraftsman) {
        endpoint = `${API_BASE}/api/craftsmen/${user.id}/profile`;
        body = {
          ...profileForm,
          experience: craftsmanForm.experience,
          hourlyRate: craftsmanForm.hourlyRate,
          workingHours: craftsmanForm.workingHours,
          workExperienceDescription: craftsmanForm.workExperienceDescription,
          categories: craftsmanForm.selectedCategories,
          subcategories: craftsmanForm.selectedSubcategories,
        };
      } else {
        endpoint = `${API_BASE}/api/users/${user.id}/profile`;
        body = profileForm;
      }

      const res = await fetch(endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body)
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message || 'Greška pri ažuriranju');

      updateUser({
        name: `${profileForm.firstName} ${profileForm.lastName}`,
        email: profileForm.email,
      });
      setSuccess('Profil uspešno ažuriran!');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ─── Promena lozinke ──────────────────────────────────────────────────────
  const handlePasswordSave = async (e) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError('Nove lozinke se ne poklapaju!');
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      setError('Lozinka mora imati najmanje 8 karaktera.');
      return;
    }
    setLoading(true);
    clearMessages();

    try {
      const endpoint = isCraftsman
        ? `${API_BASE}/api/craftsmen/${user.id}/password`
        : `${API_BASE}/api/users/${user.id}/password`;

      const res = await fetch(endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          oldPassword: passwordForm.oldPassword,
          newPassword: passwordForm.newPassword,
        })
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message || 'Greška pri promeni lozinke');
      setSuccess('Lozinka uspešno promenjena!');
      setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleCategory = (catId) => {
    setCraftsmanForm(prev => {
      if (prev.selectedCategories.includes(catId)) {
        const cat = CATEGORIES.find(c => c.id === catId);
        const subIds = cat?.subcategories.map(s => s.id) || [];
        setOpenCategories(o => o.filter(c => c !== catId));
        return {
          ...prev,
          selectedCategories: prev.selectedCategories.filter(c => c !== catId),
          selectedSubcategories: prev.selectedSubcategories.filter(s => !subIds.includes(s)),
        };
      }
      if (prev.selectedCategories.length >= MAX_CATEGORIES) return prev;
      setOpenCategories(o => [...o, catId]);
      return { ...prev, selectedCategories: [...prev.selectedCategories, catId] };
    });
  };

  const toggleSubcategory = (subId) => {
    setCraftsmanForm(prev => {
      if (prev.selectedSubcategories.includes(subId)) {
        if (prev.selectedSubcategories.length <= 1) return prev;
        return { ...prev, selectedSubcategories: prev.selectedSubcategories.filter(s => s !== subId) };
      }
      return { ...prev, selectedSubcategories: [...prev.selectedSubcategories, subId] };
    });
  };

  const toggleCategoryOpen = (catId) => {
    setOpenCategories(prev =>
      prev.includes(catId) ? prev.filter(c => c !== catId) : [...prev, catId]
    );
  };

  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  if (pageLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
        </div>
        <Footer />
      </div>
    );
  }

  const inputCls = "w-full bg-gray-900 border border-gray-600 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm";

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex flex-col">
      <Header />

      <div className="flex-1 px-4 py-12">
        <div className="max-w-2xl mx-auto">

          {/* Header */}
          <div className="flex items-center gap-5 mb-8">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
              {initials}
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">{user?.name}</h1>
              <p className="text-gray-400">{user?.email}</p>
              <span className="inline-block mt-1 text-xs px-3 py-1 rounded-full bg-blue-600/20 text-blue-400 font-medium border border-blue-500/30">
                {isCraftsman ? 'Majstor' : 'Korisnik'}
              </span>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-700 mb-6">
            <button onClick={() => { setActiveTab('profile'); clearMessages(); }}
              className={`px-5 py-3 text-sm font-medium transition border-b-2 ${activeTab === 'profile' ? 'text-blue-400 border-blue-400' : 'text-gray-400 border-transparent hover:text-white'}`}>
              Lični podaci
            </button>
            {isCraftsman && (
              <button onClick={() => { setActiveTab('professional'); clearMessages(); }}
                className={`px-5 py-3 text-sm font-medium transition border-b-2 ${activeTab === 'professional' ? 'text-blue-400 border-blue-400' : 'text-gray-400 border-transparent hover:text-white'}`}>
                Profesija
              </button>
            )}
            <button onClick={() => { setActiveTab('password'); clearMessages(); }}
              className={`px-5 py-3 text-sm font-medium transition border-b-2 ${activeTab === 'password' ? 'text-blue-400 border-blue-400' : 'text-gray-400 border-transparent hover:text-white'}`}>
              Promena lozinke
            </button>
          </div>

          {/* Feedback */}
          {success && (
            <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/30 rounded-xl text-green-400 text-sm mb-6">
              <CheckCircle className="w-5 h-5 flex-shrink-0" /> {success}
            </div>
          )}
          {error && (
            <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm mb-6">
              <AlertCircle className="w-5 h-5 flex-shrink-0" /> {error}
            </div>
          )}

          {/* ─── Tab: Lični podaci ─────────────────────────────────────────── */}
          {activeTab === 'profile' && (
            <form onSubmit={handleProfileSave} className="bg-gray-800/60 border border-gray-700 rounded-2xl p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="flex items-center gap-2 text-gray-400 text-sm mb-2"><User className="w-4 h-4" /> Ime</label>
                  <input type="text" value={profileForm.firstName} required
                    onChange={e => setProfileForm({ ...profileForm, firstName: e.target.value })}
                    className={inputCls} />
                </div>
                <div>
                  <label className="flex items-center gap-2 text-gray-400 text-sm mb-2"><User className="w-4 h-4" /> Prezime</label>
                  <input type="text" value={profileForm.lastName} required
                    onChange={e => setProfileForm({ ...profileForm, lastName: e.target.value })}
                    className={inputCls} />
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2 text-gray-400 text-sm mb-2"><Mail className="w-4 h-4" /> Email</label>
                <input type="email" value={profileForm.email} required
                  onChange={e => setProfileForm({ ...profileForm, email: e.target.value })}
                  className={inputCls} />
              </div>

              <div>
                <label className="flex items-center gap-2 text-gray-400 text-sm mb-2"><Phone className="w-4 h-4" /> Telefon</label>
                <input type="tel" value={profileForm.phone}
                  onChange={e => setProfileForm({ ...profileForm, phone: e.target.value })}
                  className={inputCls} />
              </div>

              <div>
                <label className="flex items-center gap-2 text-gray-400 text-sm mb-2"><MapPin className="w-4 h-4" /> Lokacija</label>
                <input type="text" value={profileForm.location}
                  onChange={e => setProfileForm({ ...profileForm, location: e.target.value })}
                  className={inputCls} />
              </div>

              <button type="submit" disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold transition disabled:opacity-50 text-sm">
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Čuvanje...</> : <><Save className="w-4 h-4" /> Sačuvaj izmene</>}
              </button>
            </form>
          )}

          {/* ─── Tab: Profesionalne informacije (samo majstori) ─────────────── */}
          {activeTab === 'professional' && isCraftsman && (
            <form onSubmit={handleProfileSave} className="bg-gray-800/60 border border-gray-700 rounded-2xl p-6 space-y-5">
              {/* Kategorije i podkategorije */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Briefcase className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-400 text-sm">Oblasti rada</span>
                  <span className="text-gray-500 text-sm font-normal">(max. {MAX_CATEGORIES} kategorije)</span>
                  <span className="ml-auto text-gray-400 text-sm">
                    {craftsmanForm.selectedCategories.length}/{MAX_CATEGORIES}
                    {craftsmanForm.selectedSubcategories.length > 0 && ` · ${craftsmanForm.selectedSubcategories.length} usluga`}
                  </span>
                </div>

                <div className="space-y-2">
                  {CATEGORIES.map(cat => {
                    const isCatSelected = craftsmanForm.selectedCategories.includes(cat.id);
                    const isOpen = openCategories.includes(cat.id);
                    const atCatMax = craftsmanForm.selectedCategories.length >= MAX_CATEGORIES && !isCatSelected;
                    const selectedSubs = cat.subcategories.filter(s => craftsmanForm.selectedSubcategories.includes(s.id));

                    return (
                      <div key={cat.id} className={`rounded-xl border transition-all ${isCatSelected ? cat.borderColor : 'border-gray-700'} overflow-hidden`}>
                        <div className={`flex items-center gap-3 px-4 py-3 ${isCatSelected ? cat.bgColor : 'bg-gray-800/30'}`}>
                          <button
                            type="button"
                            onClick={() => toggleCategory(cat.id)}
                            disabled={atCatMax}
                            className={`w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 transition ${
                              isCatSelected ? 'bg-blue-500 border-blue-500' : atCatMax ? 'border-gray-600 cursor-not-allowed' : 'border-gray-500 hover:border-gray-300'
                            }`}
                          >
                            {isCatSelected && <CheckCircle className="w-3.5 h-3.5 text-white" />}
                          </button>
                          <span className="text-lg">{cat.emoji}</span>
                          <span className={`flex-1 text-sm font-semibold ${isCatSelected ? 'text-white' : atCatMax ? 'text-gray-600' : 'text-gray-300'}`}>
                            {cat.label}
                          </span>
                          {isCatSelected && selectedSubs.length > 0 && (
                            <span className={`text-xs font-medium ${cat.textColor}`}>{selectedSubs.length} odabrano</span>
                          )}
                          <button
                            type="button"
                            onClick={() => isCatSelected ? toggleCategoryOpen(cat.id) : toggleCategory(cat.id)}
                            disabled={atCatMax && !isCatSelected}
                            className="text-gray-400 hover:text-white transition p-0.5"
                          >
                            <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                          </button>
                        </div>

                        {isOpen && isCatSelected && (
                          <div className="px-4 pb-3 pt-2 grid grid-cols-2 gap-1.5 border-t border-gray-700/50">
                            {cat.subcategories.map(sub => {
                              const isSubSelected = craftsmanForm.selectedSubcategories.includes(sub.id);
                              return (
                                <button
                                  key={sub.id}
                                  type="button"
                                  onClick={() => toggleSubcategory(sub.id)}
                                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition text-left ${
                                    isSubSelected
                                      ? `${cat.bgColor} ${cat.textColor} border ${cat.borderColor}`
                                      : 'bg-gray-700/40 text-gray-400 border border-gray-700 hover:border-gray-500 hover:text-gray-200'
                                  }`}
                                >
                                  {isSubSelected ? <CheckCircle className="w-3 h-3 flex-shrink-0" /> : <div className="w-3 h-3 flex-shrink-0" />}
                                  <span className="truncate">{sub.label}</span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Opis iskustva */}
              <div>
                <label className="flex items-center gap-2 text-gray-400 text-sm mb-2"><FileText className="w-4 h-4" /> Opis radnog iskustva</label>
                <textarea value={craftsmanForm.workExperienceDescription}
                  onChange={e => setCraftsmanForm({ ...craftsmanForm, workExperienceDescription: e.target.value })}
                  rows={3} maxLength={1000}
                  className="w-full bg-gray-900 border border-gray-600 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none"
                  placeholder="Opišite Vaše iskustvo..." />
                <p className="text-xs text-gray-500 text-right mt-1">{craftsmanForm.workExperienceDescription.length}/1000</p>
              </div>

              {/* Iskustvo */}
              <div>
                <label className="flex items-center gap-2 text-gray-400 text-sm mb-2"><Briefcase className="w-4 h-4" /> Godine iskustva</label>
                <input type="number" min="0" max="60" value={craftsmanForm.experience}
                  onChange={e => setCraftsmanForm({ ...craftsmanForm, experience: parseInt(e.target.value) || 0 })}
                  className={inputCls} />
              </div>

              {/* Satnica */}
              <div>
                <label className="flex items-center gap-2 text-gray-400 text-sm mb-2">
                  <span className="text-gray-400 text-xs font-bold">RSD</span> Satnica (RSD/h)
                </label>
                <input type="number" min="0" step="100" value={craftsmanForm.hourlyRate}
                  onChange={e => setCraftsmanForm({ ...craftsmanForm, hourlyRate: parseFloat(e.target.value) || 0 })}
                  className={inputCls} />
              </div>

              {/* Radno vreme */}
              <div>
                <label className="flex items-center gap-2 text-gray-400 text-sm mb-2"><Clock className="w-4 h-4" /> Radno vreme</label>
                <input type="text" value={craftsmanForm.workingHours}
                  onChange={e => setCraftsmanForm({ ...craftsmanForm, workingHours: e.target.value })}
                  className={inputCls} placeholder="npr. Pon-Pet 08:00-17:00" />
              </div>

              <button type="submit" disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold transition disabled:opacity-50 text-sm">
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Čuvanje...</> : <><Save className="w-4 h-4" /> Sačuvaj izmene</>}
              </button>
            </form>
          )}

          {/* ─── Tab: Promena lozinke ───────────────────────────────────────── */}
          {activeTab === 'password' && (
            <form onSubmit={handlePasswordSave} className="bg-gray-800/60 border border-gray-700 rounded-2xl p-6 space-y-5">
              <div>
                <label className="flex items-center gap-2 text-gray-400 text-sm mb-2"><Lock className="w-4 h-4" /> Stara lozinka</label>
                <div className="relative">
                  <input type={showOldPassword ? 'text' : 'password'} value={passwordForm.oldPassword} required
                    onChange={e => setPasswordForm({ ...passwordForm, oldPassword: e.target.value })}
                    className={`${inputCls} pr-12`} />
                  <button type="button" onClick={() => setShowOldPassword(!showOldPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white">
                    {showOldPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2 text-gray-400 text-sm mb-2"><Lock className="w-4 h-4" /> Nova lozinka</label>
                <div className="relative">
                  <input type={showNewPassword ? 'text' : 'password'} value={passwordForm.newPassword} required minLength={8}
                    onChange={e => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                    className={`${inputCls} pr-12`} />
                  <button type="button" onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white">
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">Minimum 8 karaktera, jedno veliko slovo i jedan broj</p>
              </div>

              <div>
                <label className="flex items-center gap-2 text-gray-400 text-sm mb-2"><Lock className="w-4 h-4" /> Potvrdi novu lozinku</label>
                <input type="password" value={passwordForm.confirmPassword} required
                  onChange={e => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  className={inputCls} />
              </div>

              <button type="submit" disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold transition disabled:opacity-50 text-sm">
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Čuvanje...</> : <><Save className="w-4 h-4" /> Promeni lozinku</>}
              </button>
            </form>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
}
