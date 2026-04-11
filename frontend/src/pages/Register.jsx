import { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Mail, Lock, Eye, EyeOff, User, Phone, MapPin, Briefcase, Clock,
  Upload, X, CheckCircle, ChevronLeft, ChevronRight, FileText
} from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';
import Header from "../components/Header";
import Footer from "../components/Footer";
import { useAuth } from '../context/AuthContext';

const API_BASE = "http://localhost:5114";

const PROFESSIONS = [
  { label: 'Vodoinstalater',      value: 'plumber' },
  { label: 'Električar',          value: 'electrician' },
  { label: 'Zanatlija',           value: 'handyman' },
  { label: 'Sklapanje nameštaja', value: 'furniture assembly' },
  { label: 'Klima uređaj',        value: 'air conditioning' },
  { label: 'Moler',               value: 'painter' },
  { label: 'Postavljanje TV-a',   value: 'tv mounting' },
  { label: 'Auto mehaničar',      value: 'auto mechanic' },
  { label: 'Opšta pomoć',         value: 'general help' },
];

const normalizePhone = (phone) => {
  let p = phone.replace(/[\s\-]/g, '');
  if (p.startsWith('0')) p = '+381' + p.slice(1);
  return p;
};

const inputClass = (hasError) =>
  `w-full pl-12 pr-4 py-3 bg-gray-700/50 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition ${
    hasError ? 'border-red-500 focus:ring-red-500' : 'border-gray-600'
  }`;

export default function Register() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const errorRef = useRef(null);

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [generalErrors, setGeneralErrors] = useState([]);
  const [fieldErrors, setFieldErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [formData, setFormData] = useState({
    userType: 'user',
    firstName: '', lastName: '', email: '', phone: '',
    password: '', confirmPassword: '', location: '',
    agreeToTerms: false,
    // Majstor
    professions: [],
    workExperienceDescription: '',
    experience: '', hourlyRate: '', workingHours: '',
    profileImage: null, profileImagePreview: null,
    googleId: null,
  });

  const isWorker = formData.userType === 'craftsman';

  const set = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setFieldErrors(prev => ({ ...prev, [field]: null }));
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    set(name, type === 'checkbox' ? checked : value);
  };

  const handlePhoneBlur = () => {
    if (formData.phone) set('phone', normalizePhone(formData.phone));
  };

  const toggleProfession = (value) => {
    const current = formData.professions;
    if (current.includes(value)) {
      set('professions', current.filter(p => p !== value));
    } else {
      set('professions', [...current, value]);
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setFieldErrors(prev => ({ ...prev, profileImage: 'Slika ne sme biti veća od 5MB' }));
      return;
    }
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      setFieldErrors(prev => ({ ...prev, profileImage: 'Dozvoljeni formati: JPG, PNG, WEBP' }));
      return;
    }
    const preview = URL.createObjectURL(file);
    setFormData(prev => ({ ...prev, profileImage: file, profileImagePreview: preview }));
    setFieldErrors(prev => ({ ...prev, profileImage: null }));
  };

  const showErrors = (errs) => {
    setGeneralErrors(errs);
    setTimeout(() => errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  };

  // ─── Validacija Step 1 ────────────────────────────────────────────────────
  const validateStep1 = () => {
    const errs = {};
    if (!formData.firstName.trim()) errs.firstName = 'Ime je obavezno';
    if (!formData.lastName.trim()) errs.lastName = 'Prezime je obavezno';
    if (!formData.email.trim()) errs.email = 'Email je obavezan';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) errs.email = 'Email nije u ispravnom formatu';
    if (!formData.phone.trim()) errs.phone = 'Telefon je obavezan';
    if (isWorker && !formData.location.trim()) errs.location = 'Lokacija je obavezna za majstore';
    if (!formData.password) errs.password = 'Lozinka je obavezna';
    else if (formData.password.length < 8) errs.password = 'Lozinka mora imati najmanje 8 karaktera';
    else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password))
      errs.password = 'Lozinka mora sadržati bar jedno veliko slovo, malo slovo i broj';
    if (formData.password !== formData.confirmPassword) errs.confirmPassword = 'Lozinke se ne poklapaju';

    if (!isWorker && !formData.agreeToTerms) errs.agreeToTerms = 'Morate prihvatiti uslove korišćenja';

    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // ─── Validacija Step 2 ────────────────────────────────────────────────────
  const validateStep2 = () => {
    const errs = {};
    if (formData.professions.length === 0) errs.professions = 'Izaberite barem jednu profesiju';
    if (!formData.experience.toString().trim()) errs.experience = 'Iskustvo je obavezno';
    if (!formData.hourlyRate.toString().trim()) errs.hourlyRate = 'Satnica je obavezna';
    if (!formData.workingHours.trim()) errs.workingHours = 'Radno vreme je obavezno';
    if (!formData.profileImage) errs.profileImage = 'Profilna slika je obavezna';
    if (!formData.agreeToTerms) errs.agreeToTerms = 'Morate prihvatiti uslove korišćenja';

    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNextStep = () => {
    if (validateStep1()) setStep(2);
    else showErrors(['Molimo ispravite greške u formi']);
  };

  // ─── Google OAuth ──────────────────────────────────────────────────────────
  const handleGoogleSuccess = async (credentialResponse) => {
    setGeneralErrors([]);
    if (formData.userType === 'user') {
      try {
        setLoading(true);
        const res = await fetch(`${API_BASE}/api/auth/google`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ credential: credentialResponse.credential, userType: 'user' })
        });
        const json = await res.json();
        if (!json.success) { showErrors([json.message || 'Google registracija nije uspela']); return; }
        login(json.data);
        navigate('/');
      } catch { showErrors(['Greška pri Google registraciji']); }
      finally { setLoading(false); }
    } else {
      // Za majstore: popuni Step 1 polja iz Google tokena
      try {
        const decoded = jwtDecode(credentialResponse.credential);
        setFormData(prev => ({
          ...prev,
          firstName: decoded.given_name || prev.firstName,
          lastName: decoded.family_name || prev.lastName,
          email: decoded.email || prev.email,
          googleId: decoded.sub,
        }));
        setGeneralErrors([]);
        // Ostaje na Step 1 da korisnik proveri podatke, pa klikne "Sledeći korak"
      } catch { showErrors(['Greška pri čitanju Google podataka']); }
    }
  };

  // ─── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isWorker) {
      if (!validateStep1()) { showErrors(['Molimo ispravite greške']); return; }
    } else {
      if (!validateStep2()) { showErrors(['Molimo ispravite greške']); return; }
    }

    setLoading(true);
    setGeneralErrors([]);

    try {
      let endpoint, body;

      if (isWorker) {
        endpoint = `${API_BASE}/api/auth/register/craftsman`;
        body = {
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          email: formData.email,
          phone: normalizePhone(formData.phone),
          password: formData.password,
          location: formData.location,
          professions: formData.professions,
          experience: parseInt(formData.experience) || 0,
          hourlyRate: parseFloat(formData.hourlyRate) || 0,
          workingHours: formData.workingHours,
          workExperienceDescription: formData.workExperienceDescription || null,
          googleId: formData.googleId || null,
        };
      } else {
        endpoint = `${API_BASE}/api/auth/register/user`;
        body = {
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          email: formData.email,
          phone: normalizePhone(formData.phone),
          password: formData.password,
          location: formData.location || '',
          googleId: formData.googleId || null,
        };
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const json = await response.json();

      if (!response.ok || !json.success) {
        const errs = json.errors
          ? Object.values(json.errors).flat()
          : [json.message || 'Registracija nije uspela'];
        showErrors(errs);
        setLoading(false);
        return;
      }

      const data = json.data;

      // Upload profilne slike za majstore
      if (isWorker && formData.profileImage && data.userId) {
        const imgForm = new FormData();
        imgForm.append('image', formData.profileImage);
        try {
          await fetch(`${API_BASE}/api/craftsmen/${data.userId}/profile-image`, {
            method: 'POST',
            body: imgForm
          });
        } catch (err) {
          console.warn('Slika nije uploadovana, nastaviće se bez nje:', err);
        }
      }

      // Nakon registracije korisnik mora verifikovati email — NE logujemo ga
      navigate('/verify-email-pending', {
        state: { email: data.email, userType: isWorker ? 'craftsman' : 'user' }
      });

    } catch {
      showErrors(['Greška pri povezivanju sa serverom. Pokušajte ponovo.']);
    } finally {
      setLoading(false);
    }
  };

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex flex-col">
      <Header />

      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 py-12">
        <div className="max-w-lg w-full">
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-8 border border-gray-700">

            <div className="text-center mb-6">
              <h1 className="text-3xl font-bold text-white mb-1">Registracija</h1>
              <p className="text-gray-400 text-sm">Pridružite se Majstoriji i počnite danas.</p>
            </div>

            {/* Stepper — samo za majstore */}
            {isWorker && (
              <div className="flex items-center mb-8">
                <div className="flex-1 flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${step >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-400'}`}>1</div>
                  <span className={`text-xs mt-1 ${step >= 1 ? 'text-blue-400' : 'text-gray-500'}`}>Opšte info</span>
                </div>
                <div className={`flex-1 h-0.5 mx-2 mt-[-16px] transition-all ${step >= 2 ? 'bg-blue-600' : 'bg-gray-700'}`} />
                <div className="flex-1 flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${step >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-400'}`}>2</div>
                  <span className={`text-xs mt-1 ${step >= 2 ? 'text-blue-400' : 'text-gray-500'}`}>Profesija</span>
                </div>
              </div>
            )}

            {/* Error banner */}
            {generalErrors.length > 0 && (
              <div ref={errorRef} className="mb-5 p-4 bg-red-500/10 border border-red-500/40 rounded-lg">
                <p className="text-red-400 text-sm font-semibold mb-1">Molimo ispravite sledeće greške:</p>
                <ul className="space-y-1">
                  {generalErrors.map((err, i) => (
                    <li key={i} className="text-red-400 text-sm flex items-start gap-2">
                      <span className="text-red-500 flex-shrink-0">•</span>{err}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* ─── STEP 1 ─────────────────────────────────────────────────── */}
            {step === 1 && (
              <div className="space-y-4">
                {/* Tip korisnika */}
                <div>
                  <label className="block text-gray-300 mb-2 text-sm font-medium">Prijavljujem se kao:</label>
                  <div className="grid grid-cols-2 gap-3">
                    {[['user', 'Korisnik'], ['craftsman', 'Majstor']].map(([type, label]) => (
                      <button key={type} type="button"
                        onClick={() => { set('userType', type); setStep(1); }}
                        className={`py-3 px-4 rounded-lg font-medium transition text-sm ${formData.userType === type ? 'bg-blue-600 text-white border-2 border-blue-500' : 'bg-gray-700/50 text-gray-300 border-2 border-gray-600 hover:border-gray-500'}`}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Google OAuth */}
                <div>
                  <p className="text-gray-400 text-xs mb-2 text-center">
                    {isWorker ? 'Popuni podatke iz Google naloga:' : 'Ili se registruj sa:'}
                  </p>
                  <div className="flex justify-center">
                    <GoogleLogin
                      onSuccess={handleGoogleSuccess}
                      onError={() => showErrors(['Google prijava nije uspela'])}
                      text={isWorker ? 'continue_with' : 'signup_with'}
                      shape="rectangular"
                      theme="filled_black"
                    />
                  </div>
                  <div className="flex items-center gap-3 my-4">
                    <div className="flex-1 h-px bg-gray-700" />
                    <span className="text-gray-500 text-xs">ili ručno</span>
                    <div className="flex-1 h-px bg-gray-700" />
                  </div>
                </div>

                {/* Ime + Prezime */}
                <div className="grid grid-cols-2 gap-3">
                  {[['firstName','Ime'],['lastName','Prezime']].map(([field, label]) => (
                    <div key={field}>
                      <label className="block text-gray-300 mb-1 text-sm">{label}</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <User className="w-4 h-4 text-gray-400" />
                        </div>
                        <input type="text" name={field} value={formData[field]} onChange={handleChange}
                          className={inputClass(!!fieldErrors[field])} placeholder={label} />
                      </div>
                      {fieldErrors[field] && <p className="text-red-400 text-xs mt-1">{fieldErrors[field]}</p>}
                    </div>
                  ))}
                </div>

                {/* Email */}
                <div>
                  <label className="block text-gray-300 mb-1 text-sm">Email</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Mail className="w-4 h-4 text-gray-400" />
                    </div>
                    <input type="email" name="email" value={formData.email} onChange={handleChange}
                      className={inputClass(!!fieldErrors.email)} placeholder="vas.email@primer.com" />
                  </div>
                  {fieldErrors.email && <p className="text-red-400 text-xs mt-1">{fieldErrors.email}</p>}
                </div>

                {/* Telefon */}
                <div>
                  <label className="block text-gray-300 mb-1 text-sm">Telefon</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Phone className="w-4 h-4 text-gray-400" />
                    </div>
                    <input type="tel" name="phone" value={formData.phone} onChange={handleChange}
                      onBlur={handlePhoneBlur}
                      className={inputClass(!!fieldErrors.phone)} placeholder="+381 60 123 4567" />
                  </div>
                  {fieldErrors.phone && <p className="text-red-400 text-xs mt-1">{fieldErrors.phone}</p>}
                </div>

                {/* Lokacija — obavezna za majstore, opciona za korisnike */}
                <div>
                  <label className="block text-gray-300 mb-1 text-sm">
                    Lokacija {!isWorker && <span className="text-gray-500">(opciono)</span>}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <MapPin className="w-4 h-4 text-gray-400" />
                    </div>
                    <input type="text" name="location" value={formData.location} onChange={handleChange}
                      className={inputClass(!!fieldErrors.location)} placeholder="npr. Beograd, Novi Sad..." />
                  </div>
                  {fieldErrors.location && <p className="text-red-400 text-xs mt-1">{fieldErrors.location}</p>}
                </div>

                {/* Lozinka */}
                <div>
                  <label className="block text-gray-300 mb-1 text-sm">Lozinka</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Lock className="w-4 h-4 text-gray-400" />
                    </div>
                    <input type={showPassword ? 'text' : 'password'} name="password"
                      value={formData.password} onChange={handleChange}
                      className={`${inputClass(!!fieldErrors.password)} pr-12`}
                      placeholder="Kreirajte jaku lozinku" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-300 transition">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Minimum 8 karaktera, jedno veliko slovo i jedan broj</p>
                  {fieldErrors.password && <p className="text-red-400 text-xs mt-1">{fieldErrors.password}</p>}
                </div>

                {/* Potvrdi lozinku */}
                <div>
                  <label className="block text-gray-300 mb-1 text-sm">Potvrdite lozinku</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Lock className="w-4 h-4 text-gray-400" />
                    </div>
                    <input type={showConfirm ? 'text' : 'password'} name="confirmPassword"
                      value={formData.confirmPassword} onChange={handleChange}
                      className={`${inputClass(!!fieldErrors.confirmPassword)} pr-12`}
                      placeholder="Potvrdite lozinku" />
                    <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-300 transition">
                      {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {fieldErrors.confirmPassword && <p className="text-red-400 text-xs mt-1">{fieldErrors.confirmPassword}</p>}
                </div>

                {/* Za korisnike: uslovi + submit */}
                {!isWorker && (
                  <>
                    <div className="flex items-start">
                      <input type="checkbox" name="agreeToTerms" checked={formData.agreeToTerms} onChange={handleChange}
                        className={`w-4 h-4 mt-1 bg-gray-700 border rounded text-blue-600 focus:ring-2 focus:ring-blue-500 ${fieldErrors.agreeToTerms ? 'border-red-500' : 'border-gray-600'}`} />
                      <label className="ml-3 text-sm text-gray-300">
                        Prihvatam{' '}
                        <Link to="/terms" className="text-blue-400 hover:text-blue-300">Uslove korišćenja</Link>
                        {' '}i{' '}
                        <Link to="/privacy" className="text-blue-400 hover:text-blue-300">Politiku privatnosti</Link>
                      </label>
                    </div>
                    {fieldErrors.agreeToTerms && <p className="text-red-400 text-xs">{fieldErrors.agreeToTerms}</p>}

                    <button type="button" onClick={handleSubmit} disabled={loading}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition disabled:opacity-50">
                      {loading ? 'Kreiranje naloga...' : 'Kreiraj Nalog'}
                    </button>
                  </>
                )}

                {/* Za majstore: dugme za Korak 2 */}
                {isWorker && (
                  <button type="button" onClick={handleNextStep}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition flex items-center justify-center gap-2">
                    Sledeći korak <ChevronRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}

            {/* ─── STEP 2 (samo majstori) ──────────────────────────────────── */}
            {step === 2 && isWorker && (
              <div className="space-y-5">
                <div className="text-center text-gray-400 text-xs mb-2">Korak 2 od 2 — Profesionalne informacije</div>

                {/* Profesije — multi-select */}
                <div>
                  <label className="block text-gray-300 mb-2 text-sm font-medium flex items-center gap-2">
                    <Briefcase className="w-4 h-4" /> Profesije
                    <span className="text-gray-500 font-normal">(izaberite jednu ili više)</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {PROFESSIONS.map(p => {
                      const selected = formData.professions.includes(p.value);
                      return (
                        <button key={p.value} type="button" onClick={() => toggleProfession(p.value)}
                          className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition text-left ${
                            selected
                              ? 'bg-blue-600/20 border-blue-500 text-blue-300'
                              : 'bg-gray-700/50 border-gray-600 text-gray-300 hover:border-gray-400'
                          }`}>
                          {selected && <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" />}
                          {!selected && <div className="w-3.5 h-3.5 flex-shrink-0" />}
                          {p.label}
                        </button>
                      );
                    })}
                  </div>
                  {fieldErrors.professions && <p className="text-red-400 text-xs mt-1">{fieldErrors.professions}</p>}
                </div>

                {/* Opis radnog iskustva */}
                <div>
                  <label className="block text-gray-300 mb-1 text-sm font-medium flex items-center gap-2">
                    <FileText className="w-4 h-4" /> Opis radnog iskustva
                    <span className="text-gray-500 font-normal">(opciono)</span>
                  </label>
                  <textarea name="workExperienceDescription" value={formData.workExperienceDescription}
                    onChange={handleChange} rows={3} maxLength={1000}
                    className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition resize-none text-sm"
                    placeholder="Opišite Vaše iskustvo, specijalizacije, projekte na kojima ste radili..." />
                  <p className="text-xs text-gray-500 mt-1 text-right">{formData.workExperienceDescription.length}/1000</p>
                </div>

                {/* Iskustvo */}
                <div>
                  <label className="block text-gray-300 mb-1 text-sm">Godine iskustva</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Briefcase className="w-4 h-4 text-gray-400" />
                    </div>
                    <input type="number" name="experience" value={formData.experience} onChange={handleChange}
                      min="0" max="60"
                      className={inputClass(!!fieldErrors.experience)} placeholder="npr. 5" />
                  </div>
                  {fieldErrors.experience && <p className="text-red-400 text-xs mt-1">{fieldErrors.experience}</p>}
                </div>

                {/* Satnica */}
                <div>
                  <label className="block text-gray-300 mb-1 text-sm">Satnica (RSD/h)</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <span className="text-gray-400 text-xs font-bold">RSD</span>
                    </div>
                    <input type="number" name="hourlyRate" value={formData.hourlyRate} onChange={handleChange}
                      min="0" step="100"
                      className={inputClass(!!fieldErrors.hourlyRate)} placeholder="npr. 1500" />
                  </div>
                  {fieldErrors.hourlyRate && <p className="text-red-400 text-xs mt-1">{fieldErrors.hourlyRate}</p>}
                </div>

                {/* Radno vreme */}
                <div>
                  <label className="block text-gray-300 mb-1 text-sm">Radno vreme</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Clock className="w-4 h-4 text-gray-400" />
                    </div>
                    <input type="text" name="workingHours" value={formData.workingHours} onChange={handleChange}
                      className={inputClass(!!fieldErrors.workingHours)} placeholder="npr. Pon-Pet 08:00-17:00" />
                  </div>
                  {fieldErrors.workingHours && <p className="text-red-400 text-xs mt-1">{fieldErrors.workingHours}</p>}
                </div>

                {/* Upload profilne slike */}
                <div>
                  <label className="block text-gray-300 mb-2 text-sm font-medium">
                    Profilna slika <span className="text-red-400">*</span>
                  </label>
                  {formData.profileImagePreview ? (
                    <div className="relative inline-block">
                      <img src={formData.profileImagePreview} alt="Pregled"
                        className="w-24 h-24 rounded-xl object-cover border-2 border-blue-500" />
                      <button type="button"
                        onClick={() => setFormData(prev => ({ ...prev, profileImage: null, profileImagePreview: null }))}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white hover:bg-red-600 transition">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <label className={`flex flex-col items-center justify-center w-full h-28 border-2 border-dashed rounded-xl cursor-pointer transition hover:border-blue-500 hover:bg-blue-500/5 ${fieldErrors.profileImage ? 'border-red-500' : 'border-gray-600'}`}>
                      <Upload className="w-7 h-7 text-gray-400 mb-2" />
                      <p className="text-sm text-gray-400">Klikni za upload slike</p>
                      <p className="text-xs text-gray-500 mt-0.5">JPG, PNG, WEBP • max 5MB</p>
                      <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImageChange} className="hidden" />
                    </label>
                  )}
                  {fieldErrors.profileImage && <p className="text-red-400 text-xs mt-1">{fieldErrors.profileImage}</p>}
                </div>

                {/* Uslovi */}
                <div>
                  <div className="flex items-start">
                    <input type="checkbox" name="agreeToTerms" checked={formData.agreeToTerms} onChange={handleChange}
                      className={`w-4 h-4 mt-1 bg-gray-700 border rounded text-blue-600 focus:ring-2 focus:ring-blue-500 ${fieldErrors.agreeToTerms ? 'border-red-500' : 'border-gray-600'}`} />
                    <label className="ml-3 text-sm text-gray-300">
                      Prihvatam{' '}
                      <Link to="/terms" className="text-blue-400 hover:text-blue-300">Uslove korišćenja</Link>
                      {' '}i{' '}
                      <Link to="/privacy" className="text-blue-400 hover:text-blue-300">Politiku privatnosti</Link>
                    </label>
                  </div>
                  {fieldErrors.agreeToTerms && <p className="text-red-400 text-xs mt-1">{fieldErrors.agreeToTerms}</p>}
                </div>

                {/* Dugmad */}
                <div className="flex gap-3">
                  <button type="button" onClick={() => { setStep(1); setGeneralErrors([]); }}
                    className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-medium py-3 rounded-lg transition flex items-center justify-center gap-2">
                    <ChevronLeft className="w-4 h-4" /> Nazad
                  </button>
                  <button type="button" onClick={handleSubmit} disabled={loading}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition disabled:opacity-50">
                    {loading ? 'Kreiranje naloga...' : 'Kreiraj Nalog'}
                  </button>
                </div>
              </div>
            )}

            <div className="mt-6 text-center">
              <p className="text-gray-300 text-sm">
                Već imate nalog?{' '}
                <Link to="/login" className="text-blue-400 hover:text-blue-300 font-semibold transition">Prijavite se</Link>
              </p>
            </div>
          </div>

          <div className="mt-4 text-center">
            <p className="text-xs text-gray-500">🔒 Vaši podaci su bezbedni i šifrovani</p>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
