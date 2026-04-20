import React, { useState } from "react";
import supabase from "../../../utils/supabase";
import { EyeIcon, EyeOffIcon } from "../icons";

interface LoginDetailsProps {
  toggleView: () => void;
  onLogin: () => void;
}

const LoginDetails: React.FC<LoginDetailsProps> = ({ toggleView, onLogin }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: username,
        password,
      });

      if (error) {
        setErrorMessage(error.message);
      } else {
        const { session } = data;
        if (session) {
          const uuid = session.user.id;
          localStorage.setItem("userId", uuid);

          if (uuid) {
            const { data: namesData, error: namesError } = await supabase
              .from("names")
              .select("name")
              .eq("user_id", uuid)
              .single();

            if (namesError) {
              console.error("Error retrieving full name:", namesError.message);
            } else {
              const fullName = namesData?.name || "";
              localStorage.setItem("fullName", fullName);
            }
            onLogin();
          }
        }
      }
    } catch (error) {
      setErrorMessage("An error occurred. Please try again.");
    }
  };

  const handleResetPassword = async () => {
    if (!username) {
      setErrorMessage("Please enter your email address first.");
      return;
    }

    const redirectTo = `${window.location.origin}${window.location.pathname}`;
    const { error } = await supabase.auth.resetPasswordForEmail(username, { redirectTo });

    if (error) {
      setErrorMessage(error.message);
    } else {
      setErrorMessage("Password reset email sent. Please check your inbox.");
    }
  };

  return (
    <div className="flex flex-col">
      {/* Wordmark */}
      <div className="text-center mb-10">
        <h1 className="text-4xl font-light mb-1" style={{ fontFamily: 'Georgia, serif', color: '#2C2C2C' }}>
          spendr
        </h1>
        <p className="text-sm" style={{ color: '#9B9694' }}>Track what matters.</p>
      </div>

      {/* Card */}
      <div className="rounded-2xl bg-white p-6 border" style={{ borderColor: '#EEEBE6' }}>
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium uppercase tracking-widest" style={{ color: '#9B9694' }}>
              Email
            </label>
            <input
              className="w-full h-11 px-4 rounded-xl border text-sm outline-none transition-colors focus:border-[#7C9A7E]"
              style={{ backgroundColor: '#FAF8F4', borderColor: '#EEEBE6', color: '#2C2C2C' }}
              type="email"
              placeholder="you@example.com"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium uppercase tracking-widest" style={{ color: '#9B9694' }}>
              Password
            </label>
            <div className="relative">
              <input
                className="w-full h-11 px-4 pr-12 rounded-xl border text-sm outline-none transition-colors focus:border-[#7C9A7E]"
                style={{ backgroundColor: '#FAF8F4', borderColor: '#EEEBE6', color: '#2C2C2C' }}
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 transition-opacity hover:opacity-60"
                style={{ color: '#9B9694' }}
              >
                <div className="h-4 w-4">
                  {showPassword ? <EyeIcon /> : <EyeOffIcon />}
                </div>
              </button>
            </div>
          </div>

          {errorMessage && (
            <p className="text-xs" style={{ color: '#C98D8D' }}>{errorMessage}</p>
          )}

          <button
            type="submit"
            className="w-full h-11 rounded-xl text-white text-sm font-medium transition-opacity hover:opacity-90 mt-2"
            style={{ backgroundColor: '#7C9A7E' }}
          >
            Sign in
          </button>
        </form>

        <div className="flex justify-end mt-3">
          <button
            onClick={handleResetPassword}
            className="text-xs transition-opacity hover:opacity-60"
            style={{ color: '#9B9694' }}
          >
            Forgot password?
          </button>
        </div>
      </div>

      <p className="text-center text-sm mt-6" style={{ color: '#9B9694' }}>
        New here?{' '}
        <button
          className="transition-opacity hover:opacity-60 font-medium"
          style={{ color: '#2C2C2C' }}
          onClick={toggleView}
        >
          Create an account
        </button>
      </p>
    </div>
  );
};

export default LoginDetails;
