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
    <div className="fixed inset-0 flex items-center justify-center w-screen h-screen overflow-hidden" style={{ backgroundColor: '#FAF8F4' }}>
      <div className="w-full max-w-sm px-6 py-8">
        {showLogin ? (
          <LoginDetails onLogin={onLogin} toggleView={toggleView} />
        ) : (
          <CreateNewAccount onLogin={onLogin} toggleView={toggleView} />
        )}
      </div>
    </div>
  );
};

export default LoginPage;
