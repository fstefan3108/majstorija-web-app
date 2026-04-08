import { useState, useEffect } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

const API_BASE = "http://localhost:5114";

export default function ImageLightbox({ images, startIndex, onClose }) {
  const [current, setCurrent] = useState(startIndex);

  const prev = () => setCurrent((i) => (i - 1 + images.length) % images.length);
  const next = () => setCurrent((i) => (i + 1) % images.length);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <div
      className="fixed inset-0 bg-black/90 z-[60] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 text-white/70 hover:text-white"
      >
        <X className="w-7 h-7" />
      </button>

      {images.length > 1 && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); prev(); }}
            className="absolute left-4 p-2 text-white/70 hover:text-white"
          >
            <ChevronLeft className="w-8 h-8" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); next(); }}
            className="absolute right-14 p-2 text-white/70 hover:text-white"
          >
            <ChevronRight className="w-8 h-8" />
          </button>
        </>
      )}

      <img
        src={`${API_BASE}/${images[current]}`}
        alt={`slika-${current + 1}`}
        className="max-h-[85vh] max-w-full rounded-xl object-contain"
        onClick={(e) => e.stopPropagation()}
      />

      <p className="absolute bottom-4 text-white/50 text-sm">
        {current + 1} / {images.length}
      </p>
    </div>
  );
}