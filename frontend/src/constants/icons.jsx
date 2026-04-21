import {
  Wrench, Hammer, Settings2, Zap, Flame, Droplets, Wind, AirVent, Key,
  Sparkles, Home, Layers, Maximize2, Shirt, Brush,
  Armchair, Package, Ruler, Scissors,
  Paintbrush, LayoutGrid, AlignJustify, Building2,
  Leaf, TreePine, Trash2, Calendar,
  Truck, Car, MapPin,
  Drill, Lightbulb, Tv, BookOpen,
  Cpu, Download, Wifi, Smartphone,
  Monitor, Laptop,
  PaintBucket,
  House,
} from 'lucide-react';

export const iconMap = {
  // ── Kategorije ────────────────────────────────────────────────────────────
  'majstori':          Wrench,
  'kucne-usluge':      House,
  'namestaj-montaza':  Armchair,
  'zavrsni-radovi':    PaintBucket,
  'dvoriste':          Leaf,
  'transport-selidbe': Truck,
  'sitne-popravke':    Hammer,
  'it-podrska':        Monitor,

  // ── Majstori ──────────────────────────────────────────────────────────────
  'vodoinstalater':        Droplets,
  'elektricar':            Zap,
  'serviser-bele-tehnike': Settings2,
  'serviser-klima':        AirVent,
  'grejanje-kotlovi':      Flame,
  'bravar':                Key,

  // ── Kućne usluge ──────────────────────────────────────────────────────────
  'ciscenje-stanova':           Sparkles,
  'generalno-ciscenje':         Brush,
  'peglanje':                   Shirt,
  'pranje-prozora':             Maximize2,
  'dubinsko-ciscenje':          Layers,
  'ciscenje-nakon-renoviranja': Hammer,
  'odrzavanje-doma':            Home,

  // ── Nameštaj i montaža ────────────────────────────────────────────────────
  'montaza-namestaja':  Armchair,
  'ikea-namestaj':      Package,
  'popravka-namestaja': Wrench,
  'namestaj-po-meri':   Ruler,

  // ── Završni radovi ────────────────────────────────────────────────────────
  'moler':            Paintbrush,
  'keramicar':        LayoutGrid,
  'gipsar-knauf':     Layers,
  'podovi':           AlignJustify,
  'fasada-izolacija': Building2,

  // ── Dvorište ──────────────────────────────────────────────────────────────
  'odrzavanje-dvorista': Leaf,
  'kosenje-trave':       Scissors,
  'orezivanje-drveca':   TreePine,
  'ciscenje-dvorista':   Trash2,
  'sezonski-radovi':     Calendar,

  // ── Transport i selidbe ───────────────────────────────────────────────────
  'selidbe':         Truck,
  'kombi-prevoz':    Car,
  'odvoz-suta':      Trash2,
  'odvoz-namestaja': Package,
  'lokalna-dostava': MapPin,

  // ── Sitne popravke ────────────────────────────────────────────────────────
  'busenje-zidova':  Drill,
  'montaza-polica':  BookOpen,
  'sitne-popravke':  Wrench,
  'zamena-sijalica': Lightbulb,
  'montaza-tv':      Tv,

  // ── Tehnička podrška i IT ─────────────────────────────────────────────────
  'popravka-racunara':    Cpu,
  'instalacija-softvera': Download,
  'internet-mreze':       Wifi,
  'tv-smart-uredjaji':    Smartphone,
};

export function IconRenderer({ id, className = 'w-10 h-10 text-white' }) {
  const Icon = iconMap[id] ?? Wrench;
  return <Icon className={className} />;
}
