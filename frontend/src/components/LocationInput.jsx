import { useState, useEffect, useRef, useCallback } from 'react';
import { MapPin, Loader2, X } from 'lucide-react';

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';

function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

// value: { name, lat, lng } | null
// onChange: (value: { name, lat, lng } | null) => void
export default function LocationInput({ value, onChange, placeholder = 'npr. Beograd, Novi Sad...', required = false, className = '' }) {
  const [query, setQuery]         = useState(value?.name ?? '');
  const [results, setResults]     = useState([]);
  const [loading, setLoading]     = useState(false);
  const [open, setOpen]           = useState(false);
  const [selected, setSelected]   = useState(!!value?.lat);
  const containerRef              = useRef(null);
  const debouncedQuery            = useDebounce(query, 300);

  // Sync prikaz kad se value promeni izvana
  useEffect(() => {
    if (value?.name && value.name !== query) {
      setQuery(value.name);
      setSelected(true);
    }
  }, [value?.name]);

  // Fetch Nominatim kada se debounced query promeni
  useEffect(() => {
    if (selected || debouncedQuery.length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    const params = new URLSearchParams({
      q:              debouncedQuery,
      format:         'json',
      addressdetails: '1',
      limit:          '6',
      countrycodes:   'rs',
    });

    fetch(`${NOMINATIM_URL}?${params}`, {
      headers: { 'Accept-Language': 'sr,en' },
    })
      .then(r => r.json())
      .then(data => {
        if (cancelled) return;
        setResults(data);
        setOpen(data.length > 0);
      })
      .catch(() => { if (!cancelled) setResults([]); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [debouncedQuery, selected]);

  // Zatvori dropdown pri kliku van komponente
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = useCallback((item) => {
    const name = item.display_name.split(',').slice(0, 2).join(',').trim();
    const lat  = parseFloat(item.lat);
    const lng  = parseFloat(item.lon);
    setQuery(name);
    setSelected(true);
    setOpen(false);
    setResults([]);
    onChange({ name, lat, lng });
  }, [onChange]);

  const handleClear = useCallback(() => {
    setQuery('');
    setSelected(false);
    setResults([]);
    setOpen(false);
    onChange(null);
  }, [onChange]);

  const handleChange = (e) => {
    setQuery(e.target.value);
    setSelected(false);
    if (!e.target.value) onChange(null);
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          {loading
            ? <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
            : <MapPin className={`w-4 h-4 ${selected ? 'text-blue-400' : 'text-gray-400'}`} />
          }
        </div>
        <input
          type="text"
          value={query}
          onChange={handleChange}
          onFocus={() => { if (results.length > 0) setOpen(true); }}
          placeholder={placeholder}
          required={required}
          autoComplete="off"
          className="w-full bg-gray-900 border border-gray-600 text-white rounded-lg pl-10 pr-10 py-3
            focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm transition
            placeholder-gray-500"
        />
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-300 transition"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {open && results.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full bg-gray-800 border border-gray-600 rounded-xl shadow-2xl overflow-hidden max-h-64 overflow-y-auto">
          {results.map((item) => {
            const parts = item.display_name.split(',');
            const main  = parts.slice(0, 2).join(',').trim();
            const sub   = parts.slice(2, 4).join(',').trim();
            return (
              <li key={item.place_id}>
                <button
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); handleSelect(item); }}
                  className="w-full text-left px-4 py-3 hover:bg-gray-700 transition flex items-start gap-3 border-b border-gray-700/50 last:border-0"
                >
                  <MapPin className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-white text-sm font-medium">{main}</p>
                    {sub && <p className="text-gray-400 text-xs mt-0.5">{sub}</p>}
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {!open && !selected && debouncedQuery.length >= 2 && !loading && results.length === 0 && (
        <div className="absolute z-50 mt-1 w-full bg-gray-800 border border-gray-600 rounded-xl px-4 py-3">
          <p className="text-gray-400 text-sm">Nema rezultata za "{debouncedQuery}"</p>
        </div>
      )}
    </div>
  );
}
