import React, { useState } from "react";
import LoginDetails from "./LoginDetails";
import CreateNewAccount from "./createNewAccount";
import supabase from "../../../utils/supabase";
import TypingEffect from "./TypingEffect";

interface LoginProps {
  onLogin: () => void;
}

const LoginPage: React.FC<LoginProps> = ({ onLogin }) => {
  const [showLogin, setShowLogin] = useState(true);
  const fullText = `Get food from your favorite <span class="font-semibold">Chicago</span> restaurants just in time before dinner!`;

  const toggleView = () => setShowLogin(!showLogin);

  return (
    <div className="fixed inset-0 flex flex-col md:flex-row w-screen h-screen overflow-hidden">
      {/* Left section - full width on mobile, half on desktop */}
      <div className="w-full md:w-1/2 h-full bg-white flex items-center justify-center order-2 md:order-1">
        <div className="w-full px-4 md:px-12 py-8">
          {/* Logo for mobile only */}
          <div className="flex justify-center mb-8 md:hidden">
            <span className="text-2xl font-semibold text-black">noshena</span>
          </div>

          {showLogin ? (
            <LoginDetails onLogin={onLogin} toggleView={toggleView} />
          ) : (
            <CreateNewAccount onLogin={onLogin} toggleView={toggleView} />
          )}
        </div>
      </div>

      {/* Right section - hidden on mobile, half width on desktop */}
      <div className="hidden md:flex w-1/2 h-full bg-black flex-col justify-center items-center order-1 md:order-2">
        <div className="absolute top-6 left-6">
          <span className="text-xl font-semibold text-black">noshena</span>
        </div>
        <div className="text-white text-5xl md:text-7xl font-light text-center leading-tight max-w-2xl">
          <TypingEffect text={fullText} typingSpeed={50} />
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
