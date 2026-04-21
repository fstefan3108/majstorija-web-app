import Text from "../components/Text";
import Card from "../components/GridCard";
import plumber from "../assets/plumber.jpg";
import workerTwo from "../assets/workerTwo.jpg";
import workerThree from "../assets/workerThree.jpg";
import workerFour from "../assets/workerFour.jpg";
import workerFive from "../assets/workerFive.jpg";
import workerSix from "../assets/workerSix.jpg";
import workerSeven from "../assets/workerSeven.jpg";
import workerEight from "../assets/workerEight.jpg";
import workerNine from "../assets/workerNine.jpg";

export default function Services() {
  return (
    <main className="bg-gradient-to-b from-[#0A1120] to-[#030712] pt-12 pb-16 border-t border-white/5">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-12">
          <Text type="heading" value="Dostupni Servisi" />
          <p className="text-blue-400/70 mt-3 text-lg">Pronađite stručnjaka za svaki posao</p>
        </div>
        <div className="gap-6 grid md:grid-cols-3">
          <Card image={plumber} heading="Vodoinstalater" to="/browse/majstori/vodoinstalater" />
          <Card image={workerTwo} heading="Električar" to="/browse/majstori/elektricar" />
          <Card image={workerThree} heading="Majstor za sve" to="/browse/sitne-popravke/sitne-popravke" />
          <Card image={workerFour} heading="Moler" to="/browse/zavrsni-radovi/moler" />
          <Card image={workerFive} heading="Montaža nameštaja" to="/browse/namestaj-montaza/montaza-namestaja" />
          <Card image={workerSix} heading="Klima uređaji" to="/browse/majstori/serviser-klima" />
          <Card image={workerSeven} heading="Montaža TV-a" to="/browse/sitne-popravke/montaza-tv" />
          <Card image={workerEight} heading="Automehaničar" to="/browse" />
          <Card image={workerNine} heading="Opšta pomoć" to="/browse" />
        </div>
      </div>
    </main>
  );
}