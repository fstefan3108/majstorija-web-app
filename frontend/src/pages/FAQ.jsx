import { useState } from 'react';
import { Search, Plus, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';

const faqs = [
  {
    question: 'Kako da pronađem majstora?',
    answer:
      'Jednostavno se registrujte kao korisnik, opišite vaš problem i lokaciju, a sistem će vam predložiti dostupne majstore u vašem kraju. Možete pregledati profile, ocene i recenzije pre nego što odaberete.',
  },
  {
    question: 'Kako da se registrujem kao majstor?',
    answer:
      'Kliknite na „Registracija", odaberite ulogu „Majstor", popunite profil sa vašim veštinama, sertifikatima i radnim iskustvom. Nakon verifikacije, vaš profil postaje vidljiv korisnicima platforme.',
  },
  {
    question: 'Da li je platforma besplatna za korišćenje?',
    answer:
      'Registracija i pretraživanje majstora su potpuno besplatni za korisnike. Majstori mogu koristiti osnovne funkcionalnosti besplatno, dok premium opcije nude dodatnu vidljivost i alate za upravljanje poslom.',
  },
  {
    question: 'Kako funkcioniše sistem ocena?',
    answer:
      'Nakon završenog posla, korisnici mogu ostaviti ocenu (1–5 zvezdica) i pisanu recenziju za majstora. Majstori sa višim ocenama pojavljuju se više u rezultatima pretrage i imaju bolju vidljivost.',
  },
  {
    question: 'Da li mogu pratiti status zahteva?',
    answer:
      'Da! Nakon slanja zahteva, možete pratiti njegov status u realnom vremenu putem „Pregled" sekcije. Dobijate obaveštenja o svakoj promeni statusa direktno na platformi.',
  },
  {
    question: 'Kako da kontaktiram majstora?',
    answer:
      'Nakon što majstor prihvati vaš zahtev, možete komunicirati putem ugrađenog sistema poruka direktno na platformi. Sve komunikacije su sigurno pohranjene i dostupne u istoriji razgovora.',
  },
  {
    question: 'Šta ako nisam zadovoljan obavljenim poslom?',
    answer:
      'Majstorija ima jasno definisan proces rešavanja sporova. Kontaktirajte nas putem kontakt forme ili imejla, i naš tim će medijacijom pomoći u pronalasku prihvatljivog rešenja za obe strane.',
  },
  {
    question: 'Da li su lični podaci zaštićeni?',
    answer:
      'Apsolutno. Koristimo industrijske standarde za zaštitu podataka. Vaši lični podaci se nikada ne dele sa trećim stranama bez vašeg pristanka, u skladu sa GDPR propisima.',
  },
];

const FAQItem = ({ faq, index, openIndex, setOpenIndex }) => {
  const isOpen = openIndex === index;

  return (
    <div
      className={`bg-gray-800/50 backdrop-blur-sm border rounded-xl overflow-hidden transition-all duration-200 ${
        isOpen ? 'border-blue-500' : 'border-gray-700 hover:border-gray-600'
      }`}
    >
      <button
        className="w-full flex items-center justify-between px-6 py-5 text-left gap-4"
        onClick={() => setOpenIndex(isOpen ? null : index)}
      >
        <span className="text-white font-medium text-base">{faq.question}</span>
        <div
          className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-all duration-200 ${
            isOpen ? 'bg-blue-600 rotate-45' : 'bg-blue-600/20'
          }`}
        >
          <Plus className={`w-4 h-4 ${isOpen ? 'text-white' : 'text-blue-400'}`} />
        </div>
      </button>

      <div
        className={`transition-all duration-300 ease-in-out overflow-hidden ${
          isOpen ? 'max-h-96' : 'max-h-0'
        }`}
      >
        <p className="px-6 pb-5 text-gray-400 leading-relaxed">{faq.answer}</p>
      </div>
    </div>
  );
};

const FAQ = () => {
  const [openIndex, setOpenIndex] = useState(null);
  const [search, setSearch] = useState('');

  const filtered = faqs.filter(
    (f) =>
      f.question.toLowerCase().includes(search.toLowerCase()) ||
      f.answer.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <Header />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-white mb-4">
            Često Postavljana Pitanja
          </h1>
          <p className="text-xl text-gray-300 max-w-xl mx-auto">
            Pronađite odgovore na najčešća pitanja o Majstorija platformi.
          </p>
        </div>

        <div className="relative mb-8">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setOpenIndex(null);
            }}
            placeholder="Pretražite pitanja..."
            className="w-full pl-12 pr-4 py-3.5 bg-gray-800/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
          />
          {search && (
            <button
              onClick={() => { setSearch(''); setOpenIndex(null); }}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {filtered.length > 0 ? (
          <div className="flex flex-col gap-3">
            {filtered.map((faq, i) => (
              <FAQItem
                key={i}
                faq={faq}
                index={i}
                openIndex={openIndex}
                setOpenIndex={setOpenIndex}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 text-gray-400">
            <p className="text-lg mb-2">Nema rezultata za „{search}"</p>
            <p className="text-sm">Pokušajte sa drugačijim pojmom ili nas kontaktirajte direktno.</p>
          </div>
        )}

        <div className="mt-12 text-center bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl p-8">
          <p className="text-white font-semibold text-lg mb-2">Niste pronašli odgovor?</p>
          <p className="text-gray-400 mb-4">
            Naš tim je tu da vam pomogne. Slobodno nas kontaktirajte.
          </p>
          <Link
            to="/contact"
            onClick={() => window.scrollTo(0, 0)}
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-6 rounded-lg transition"
          >
            Kontaktirajte Nas
          </Link>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default FAQ;