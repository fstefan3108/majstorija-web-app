import Text from "../components/Text";
import Painter from "../assets/lottie/painter.json";
import Builder from "../assets/lottie/Builder.json";
import Lottie from "lottie-react";
import Button from "../components/Button";

export default function Summary() {
  return (
    <div className="bg-[#030712] pb-10 md:px-20 border-t border-white/5">
      <div className="mx-auto max-w-7xl">

        {/* Prvi blok — tamniji #0A1120 */}
        <div className="p-5 md:flex flex-row-reverse  border-b border-blue-900/30">
          <div className="p-5 md:flex-1 md:flex md:flex-col md:justify-center md:items-center">
            <Text type="subHeading" value="Pronađi majstore lako i brzo uz Majstorija web aplikaciju" />
            <Text type="primary" value="Pronađi lokalne majstore za sve vrste poslova i poveži se sa pouzdanim stručnjacima brzo i jednostavno." />
            <div className="w-full mt-8">
              <Button type="primary" btnText="Saznaj više" to="/about" />
            </div>
          </div>
          <div className="flex justify-center items-center md:flex-1">
            <Lottie animationData={Painter} className="max-w-[400px] md:max-w-[500px]" />
          </div>
        </div>

        <div className="mx-6 border-t border-blue-900/20" />

        {/* Drugi blok — svetliji #0F172A */}
        <div className="p-5 md:flex ">
          <div className="p-5 md:flex-1 md:flex md:flex-col md:justify-center md:items-center">
            <Text type="subHeading" value="Organizuj svoje projekte bez stresa" />
            <Text type="primary" value="Planiraj termine, beleži radne zadatke i prati napredak svojih projekata, kako bi sve išlo glatko i bez stresa." />
            <div className="w-full mt-8">
              <Button type="primary" btnText="Saznaj više" to="/about" />
            </div>
          </div>
          <div className="flex justify-center items-center md:flex-1">
            <Lottie animationData={Builder} className="max-w-[300px] md:max-w-[400px]" />
          </div>
        </div>

      </div>
    </div>
  );
}