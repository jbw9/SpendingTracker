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
          // localStorage.setItem("supabaseSession", JSON.stringify(session));

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
    const { error } = await supabase.auth.resetPasswordForEmail(username);

    if (error) {
      setErrorMessage(error.message);
    } else {
      setErrorMessage("Password reset email sent. Please check your inbox.");
    }
  };

  return (
    <div className="flex flex-col max-w-md mx-auto px-4">
      <span className="text-4xl font-semibold text-center mt-16 text-black">
        Welcome Back!
      </span>
      <form onSubmit={handleLogin} className="mt-8">
        <div className="space-y-4">
          <div className="flex flex-col space-y-2">
            <span className="text-black text-left ml-1 text-bold font-medium">
              Email
            </span>
            <div className="bg-white w-full h-12 rounded-lg flex border border-gray-300 rounded-lg">
              <input
                className="w-full px-4 bg-white outline-none placeholder-gray-400 text-black"
                type="text"
                placeholder="email"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
          </div>
          <div className="flex flex-col space-y-2">
            <span className="text-black text-left font-medium text-bold ml-1">
              Password
            </span>
            <div className="bg-white w-full h-12 rounded-lg flex border border-gray-300">
              <input
                className="w-full px-4 bg-white outline-none placeholder-gray-400 text-black"
                type={showPassword ? "text" : "password"}
                placeholder="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <div
                onClick={() => setShowPassword(!showPassword)}
                className="px-4 cursor-pointer flex items-center"
              >
                {showPassword ? (
                  <div className="h-5 w-5 text-black">
                    <EyeIcon />
                  </div>
                ) : (
                  <div className="h-5 w-5 text-black">
                    <EyeOffIcon />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        {errorMessage && (
          <div className="mt-4 text-red-600">{errorMessage}</div>
        )}
        <button
          type="submit"
          className="w-full h-12  bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 rounded-lg text-white font-bold mt-6 mb-1 hover:scale-[101%] transition-all"
        >
          Sign in
        </button>
        <button
          onClick={handleResetPassword}
          className="text-black text-sm hover:underline cursor-pointer bg-transparent border-none p-0 float-right mr-1"
        >
          Forgot Password?
        </button>
      </form>
      <div className="flex justify-center my-6">
        <span className="text-black">Don't have an account?</span>
        <button
          className="ml-2 hover:underline text-black"
          onClick={toggleView}
        >
          Create an Account
        </button>
      </div>
    </div>
  );
};

export default LoginDetails;
