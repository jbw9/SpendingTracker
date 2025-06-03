import React, { useState } from "react";
import LoginDetails from "./LoginDetails";
import CreateNewAccount from "./createNewAccount";

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
      <div className="w-full h-full bg-white flex items-center justify-center order-2 md:order-1">
        <div className="w-full px-4 md:px-12 py-8">

          {showLogin ? (
            <LoginDetails onLogin={onLogin} toggleView={toggleView} />
          ) : (
            <CreateNewAccount onLogin={onLogin} toggleView={toggleView} />
          )}
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
