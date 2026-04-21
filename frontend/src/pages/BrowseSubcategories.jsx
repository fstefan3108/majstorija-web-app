import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { CATEGORIES } from '../constants/categories';
import { IconRenderer } from '../constants/icons';

export default function BrowseSubcategories() {
  const { categorySlug } = useParams();
  const navigate = useNavigate();

  const category = CATEGORIES.find((c) => c.id === categorySlug);

  if (!category) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-white text-xl font-bold mb-4">Kategorija nije pronađena.</p>
            <button
              onClick={() => navigate('/browse')}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition"
            >
              Nazad na kategorije
            </button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex flex-col">
      <Header />

      <div className="flex-1 px-4 sm:px-6 lg:px-8 py-16">
        <div className="max-w-7xl mx-auto">

          <button
            onClick={() => navigate('/browse')}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-10 group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Sve kategorije
          </button>

          <div className="text-center mb-16">
            <div className={`w-24 h-24 bg-gradient-to-br ${category.color} rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl`}>
              <IconRenderer id={category.id} className="w-12 h-12 text-white" />
            </div>
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-4">
              {category.label}
            </h1>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              {category.description}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {category.subcategories.map((sub) => (
              <div
                key={sub.id}
                className="group bg-gray-800/50 backdrop-blur-sm rounded-2xl p-8 border border-gray-700 hover:border-blue-500 transition-all duration-300 hover:scale-105 cursor-pointer"
                onClick={() => navigate(`/browse/${category.id}/${sub.id}`)}
              >
                <div className={`w-20 h-20 bg-gradient-to-br ${category.color} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg`}>
                  <IconRenderer id={sub.id} className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-3 group-hover:text-blue-400 transition-colors">
                  {sub.label}
                </h3>
                <p className="text-gray-300 leading-relaxed mb-6">
                  {category.label}
                </p>
                <button className="inline-block bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white font-semibold px-6 py-2 rounded-lg transition-all border border-blue-500/30 hover:border-blue-500">
                  Angažujte Radnika
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
