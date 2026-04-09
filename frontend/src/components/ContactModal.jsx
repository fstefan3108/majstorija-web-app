import { useState, useRef } from 'react';
import { X, Upload, Image, AlertCircle, CheckCircle, Loader2, Calendar, FileText, AlignLeft } from 'lucide-react';
import api from '../services/api';

const MAX_IMAGES = 5;
const MAX_SIZE_MB = 5;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export default function ContactModal({ craftsman, user, onClose, onSuccess }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [images, setImages] = useState([]); // { file, previewUrl }
  const [imageError, setImageError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

  const handleImageAdd = (files) => {
    setImageError('');
    const incoming = Array.from(files);

    if (images.length + incoming.length > MAX_IMAGES) {
      setImageError(`Možete dodati maksimalno ${MAX_IMAGES} slika.`);
      return;
    }

    const validated = [];
    for (const file of incoming) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        setImageError('Dozvoljeni formati: JPG, PNG, WEBP.');
        return;
      }
      if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        setImageError(`Maksimalna veličina po slici je ${MAX_SIZE_MB} MB.`);
        return;
      }
      validated.push({ file, previewUrl: URL.createObjectURL(file) });
    }
    setImages((prev) => [...prev, ...validated]);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    handleImageAdd(e.dataTransfer.files);
  };

  const removeImage = (index) => {
    setImages((prev) => {
      URL.revokeObjectURL(prev[index].previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!title.trim()) { setError('Unesite naslov.'); return; }
    if (description.trim().length < 10) { setError('Opis mora imati najmanje 10 karaktera.'); return; }
    if (!scheduledDate) { setError('Odaberite datum.'); return; }

    setSubmitting(true);
    try {
      // 1. Kreiraj zahtev
      const res = await api.createJobRequest({
        title: title.trim(),
        description: description.trim(),
        scheduledDate: new Date(scheduledDate).toISOString(),
        userId: user.id,
        craftsmanId: craftsman.craftsmanId,
      });

      if (!res.success) throw new Error(res.message || 'Greška pri kreiranju zahteva.');

      const requestId = res.requestId;

      // 2. Upload slika jedna po jedna
      for (const img of images) {
        await api.uploadJobRequestImage(requestId, img.file);
      }

      setSubmitted(true);
      setTimeout(() => onSuccess?.(), 3000);
    } catch (err) {
      setError(err.message || 'Desila se greška. Pokušajte ponovo.');
    } finally {
      setSubmitting(false);
    }
  };

  // Ekran uspešnog slanja
  if (submitted) {
    return (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-gray-800 border border-gray-700 rounded-2xl p-10 max-w-md w-full text-center shadow-2xl">
          <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
          <h2 className="text-white font-bold text-2xl mb-2">Zahtev poslat!</h2>
          <p className="text-gray-400">
            Vaš zahtev je uspešno poslat majstoru{' '}
            <span className="text-white font-medium">{craftsman.firstName} {craftsman.lastName}</span>.
            Bićete obavešteni čim majstor odgovori.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-800 border border-gray-700 rounded-2xl w-full max-w-xl shadow-2xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700 flex-shrink-0">
          <div>
            <h2 className="text-white font-bold text-lg">Kontaktiraj majstora</h2>
            <p className="text-gray-400 text-sm">{craftsman.firstName} {craftsman.lastName} · {craftsman.profession}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {/* Naslov */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-1.5">
              <FileText className="w-4 h-4" /> Naslov posla
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="npr. Popravka bojlera, Krečenje sobe..."
              maxLength={200}
              className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition text-sm"
            />
          </div>

          {/* Opis */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-1.5">
              <AlignLeft className="w-4 h-4" /> Opis posla
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Opišite šta je potrebno uraditi, u kakvom je stanju, posebne napomene..."
              rows={4}
              maxLength={2000}
              className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition text-sm resize-none"
            />
            <p className="text-right text-xs text-gray-500 mt-1">{description.length}/2000</p>
          </div>

          {/* Datum */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-1.5">
              <Calendar className="w-4 h-4" /> Željeni datum
            </label>
            <input
              type="date"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              min={tomorrow}
              className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 transition text-sm [color-scheme:dark]"
            />
          </div>

          {/* Upload slika */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-1.5">
              <Image className="w-4 h-4" /> Slike{' '}
              <span className="text-gray-500 font-normal">({images.length}/{MAX_IMAGES})</span>
            </label>

            {/* Drag & drop zona */}
            {images.length < MAX_IMAGES && (
              <div
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-600 hover:border-blue-500 rounded-xl p-6 text-center cursor-pointer transition group"
              >
                <Upload className="w-7 h-7 text-gray-500 group-hover:text-blue-400 mx-auto mb-2 transition" />
                <p className="text-sm text-gray-400 group-hover:text-gray-300 transition">
                  Prevucite slike ovde ili <span className="text-blue-400">kliknite za odabir</span>
                </p>
                <p className="text-xs text-gray-600 mt-1">JPG, PNG, WEBP · max {MAX_SIZE_MB} MB po slici</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  className="hidden"
                  onChange={(e) => handleImageAdd(e.target.files)}
                />
              </div>
            )}

            {/* Preview slika */}
            {images.length > 0 && (
              <div className="grid grid-cols-4 gap-2 mt-3">
                {images.map((img, i) => (
                  <div key={i} className="relative group aspect-square">
                    <img
                      src={img.previewUrl}
                      alt={`slika-${i + 1}`}
                      className="w-full h-full object-cover rounded-lg border border-gray-600"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(i)}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 hover:bg-red-400 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                    >
                      <X className="w-3 h-3 text-white" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {imageError && (
              <p className="text-red-400 text-xs mt-2 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> {imageError}
              </p>
            )}
          </div>

          {/* Greška */}
          {error && (
            <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-700 flex gap-3 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="flex-1 py-2.5 rounded-xl border border-gray-600 text-gray-300 hover:text-white hover:border-gray-500 transition text-sm font-medium disabled:opacity-50"
          >
            Otkaži
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {submitting ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Šalje se...</>
            ) : (
              'Pošalji zahtev'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
