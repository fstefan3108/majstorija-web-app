import { useSearchParams, Link } from 'react-router-dom';
import { CreditCard, CheckCircle, Mail, ArrowRight } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';

const CardRegistered = () => {
  const [params] = useSearchParams();
  const canceled = params.get('canceled') === 'true';
  const error    = params.get('error')    === 'true';

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex flex-col">
      <Header />

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full">
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-8 border border-gray-700 text-center">

            {canceled || error ? (
              <>
                <div className="w-20 h-20 rounded-full bg-yellow-500/20 flex items-center justify-center mx-auto mb-6">
                  <CreditCard className="w-10 h-10 text-yellow-400" />
                </div>
                <h1 className="text-2xl font-bold text-white mb-3">Kartica nije dodata</h1>
                <p className="text-gray-400 mb-6 text-sm leading-relaxed">
                  Niste završili dodavanje kartice — to je u redu.
                  Karticu možete dodati u bilo kom trenutku iz podešavanja vašeg profila.
                </p>
              </>
            ) : (
              <>
                <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="w-10 h-10 text-green-400" />
                </div>
                <h1 className="text-2xl font-bold text-white mb-3">Kartica uspešno sačuvana!</h1>
                <p className="text-gray-400 mb-6 text-sm leading-relaxed">
                  Vaša kartica je tokenizovana i bezbedno sačuvana.
                  Mi ne čuvamo podatke o kartici — samo anonimizovani token koji koristi AllSecure.
                </p>
              </>
            )}

            <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 mb-6 flex items-start gap-3 text-left">
              <Mail className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <p className="text-gray-300 text-sm">
                Vaš nalog je kreiran. Proverite inbox — poslali smo vam email za verifikaciju.
                Morate verifikovati email pre prve prijave.
              </p>
            </div>

            <Link
              to="/login"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition flex items-center justify-center gap-2"
            >
              Idi na prijavu <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default CardRegistered;
