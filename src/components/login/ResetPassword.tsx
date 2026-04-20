import React, { useState } from "react";
import supabase from "../../../utils/supabase";
import { EyeIcon, EyeOffIcon } from "../icons";

interface ResetPasswordProps {
  onComplete: () => void;
}

const ResetPassword: React.FC<ResetPasswordProps> = ({ onComplete }) => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const validatePassword = (pw: string) => {
    if (pw.length < 8) return "Password must be at least 8 characters.";
    if (!/[A-Z]/.test(pw)) return "Password must contain at least one uppercase letter.";
    if (!/[0-9]/.test(pw)) return "Password must contain at least one number.";
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    const validationError = validatePassword(password);
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    setIsLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setIsLoading(false);

    if (error) {
      setErrorMessage(error.message);
    } else {
      onComplete();
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
        <p className="text-sm font-medium mb-4" style={{ color: '#2C2C2C' }}>Set a new password</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium uppercase tracking-widest" style={{ color: '#9B9694' }}>
              New Password
            </label>
            <div className="relative">
              <input
                className="w-full h-11 px-4 pr-12 rounded-xl border text-sm outline-none transition-colors focus:border-[#7C9A7E]"
                style={{ backgroundColor: '#FAF8F4', borderColor: '#EEEBE6', color: '#2C2C2C' }}
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
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

          <div className="space-y-1.5">
            <label className="text-xs font-medium uppercase tracking-widest" style={{ color: '#9B9694' }}>
              Confirm Password
            </label>
            <div className="relative">
              <input
                className="w-full h-11 px-4 pr-12 rounded-xl border text-sm outline-none transition-colors focus:border-[#7C9A7E]"
                style={{ backgroundColor: '#FAF8F4', borderColor: '#EEEBE6', color: '#2C2C2C' }}
                type={showConfirm ? "text" : "password"}
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-4 top-1/2 -translate-y-1/2 transition-opacity hover:opacity-60"
                style={{ color: '#9B9694' }}
              >
                <div className="h-4 w-4">
                  {showConfirm ? <EyeIcon /> : <EyeOffIcon />}
                </div>
              </button>
            </div>
          </div>

          {errorMessage && (
            <p className="text-xs" style={{ color: '#C98D8D' }}>{errorMessage}</p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-11 rounded-xl text-white text-sm font-medium transition-opacity hover:opacity-90 mt-2 disabled:opacity-50"
            style={{ backgroundColor: '#7C9A7E' }}
          >
            {isLoading ? "Updating…" : "Update password"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;
