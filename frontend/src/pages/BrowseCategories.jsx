import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { CATEGORIES } from '../constants/categories';
import { IconRenderer } from '../constants/icons';

export default function BrowseCategories() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex flex-col">
      <Header />

      <div className="flex-1 px-4 sm:px-6 lg:px-8 py-16">
        <div className="max-w-7xl mx-auto">

          <div className="text-center mb-16">
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
              Pronađite Pouzdanog Majstora
            </h1>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Izaberite kategoriju usluge koju tražite i pronađite najboljeg stručnjaka u vašem kraju.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {CATEGORIES.map((cat) => (
              <div
                key={cat.id}
                className="group bg-gray-800/50 backdrop-blur-sm rounded-2xl p-8 border border-gray-700 hover:border-blue-500 transition-all duration-300 hover:scale-105 cursor-pointer"
                onClick={() => navigate(`/browse/${cat.id}`)}
              >
                <div className={`w-20 h-20 bg-gradient-to-br ${cat.color} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg`}>
                  <IconRenderer id={cat.id} className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-3 group-hover:text-blue-400 transition-colors">
                  {cat.label}
                </h3>
                <p className="text-gray-300 leading-relaxed mb-6">
                  {cat.description}
                </p>
                <button
                  className="inline-block bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white font-semibold px-6 py-2 rounded-lg transition-all border border-blue-500/30 hover:border-blue-500"
                >
                  Izaberi uslugu
                </button>
              </div>
            ))}
          </div>

        </div>
      </div>

      <Footer />
    </div>
  );
}
