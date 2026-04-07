import Lottie from "lottie-react";
import Text from "../components/Text";
import VerifiedIcon from "../assets/lottie/Verified.json";
import Button from "../components/Button";
import { useAuth } from "../context/AuthContext";

export default function Verified() {
    const { user } = useAuth();

    const destination = user
        ? (user.role === 'Craftsman' ? '/workers/dashboard' : '/users/dashboard')
        : '/register';

    return (
        <div className="bg-[#F8FAFC] p-10 flex flex-col justify-between items-center border-t-4 border-blue-500/80">
            <div className="flex-1 items-center justify-center flex">
                <Lottie animationData={VerifiedIcon} className="max-w-[200px]" />
            </div>
            <div className="p-5 md:flex md:flex-col md:justify-center md:items-center text-center">
                <Text type="subHeadingBlack" value="Registrujte se danas i proširite vaša iskustva." />
                <p className="text-gray-500 mt-2 text-lg">Pridružite se hiljadama zadovoljnih korisnika i majstora.</p>
            </div>
            <div className="my-4">
                <Button type="primary" btnText="Saznaj Više" to={destination}
                    className="bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/20 hover:scale-[1.02] transition-all duration-300" />
            </div>
        </div>
    );
}