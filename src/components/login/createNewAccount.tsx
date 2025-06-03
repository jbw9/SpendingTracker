import React, { useState } from "react";
import supabase from "../../../utils/supabase";
import { EyeIcon, EyeOffIcon } from "../icons";

interface CreateNewAccountProps {
  toggleView: () => void;
  onLogin: () => void;
}

const CreateNewAccount: React.FC<CreateNewAccountProps> = ({
  toggleView,
  onLogin,
}) => {
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const createDefaultCategories = async (userId: string) => {
    const defaultCategories = [
      { name: 'Food & Dining', color: '#8B5CF6' },
      { name: 'Transportation', color: '#06B6D4' },
      { name: 'Shopping', color: '#10B981' },
      { name: 'Entertainment', color: '#F59E0B' },
      { name: 'Bills & Utilities', color: '#EF4444' },
      { name: 'Healthcare', color: '#EC4899' },
    ];

    const categoriesWithUser = defaultCategories.map((category) => ({
      name: category.name,
      color: category.color,
      user_id: userId
    }));

    const { error } = await supabase
      .from('categories')
      .insert(categoriesWithUser);

    if (error) {
      console.error('Error creating default categories:', error);
    }
  };

  const createInitialSpendingRecord = async (userId: string) => {
    const currentMonth = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
    
    const initialRecord = {
      user_id: userId,
      categories: {
        name: 'Food & Dining',
        color: '#8B5CF6'
      },
      spendings: {
        amount: 0,
        name: 'Welcome to Spending Tracker',
        note: 'This is your first entry - you can delete it later',
        date: new Date().toISOString().split('T')[0],
        month: currentMonth
      },
      monthly_spending: {
        month: currentMonth,
        total: 0
      },
      category_breakdown: {
        'Food & Dining': 0,
        'Transportation': 0,
        'Shopping': 0,
        'Entertainment': 0,
        'Bills & Utilities': 0,
        'Healthcare': 0
      }
    };

    const { error } = await supabase
      .from('spending')
      .insert(initialRecord);

    if (error) {
      console.error('Error creating initial spending record:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage("");

    // Password validation
    const passwordRegex = /^(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(password)) {
      setErrorMessage(
        "Password must be at least 8 characters long, contain at least one uppercase letter and one number"
      );
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email: username,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

      if (error) {
        setErrorMessage(error.message);
        setIsLoading(false);
      } else if (data.user) {
        // Create default categories and initial spending record
        await Promise.all([
          createDefaultCategories(data.user.id),
          createInitialSpendingRecord(data.user.id)
        ]);

        localStorage.setItem("user", JSON.stringify(data));
        onLogin();
      }
    } catch (error) {
      setErrorMessage("An error occurred. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col max-w-md mx-auto px-4">
      <span className="text-4xl font-semibold text-center mt-16 text-black">
        Create an Account
      </span>
      <form onSubmit={handleSubmit} className="mt-8">
        <div className="space-y-4">
          <div className="flex flex-col space-y-2">
            <span className="text-black text-left ml-1 text-bold font-medium">
              Full Name
            </span>
            <div className="bg-white w-full h-12 rounded-lg flex border border-gray-300">
              <input
                className="w-full px-4 bg-white outline-none placeholder-gray-400 text-black"
                type="text"
                placeholder="full name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
          </div>
          <div className="flex flex-col space-y-2">
            <span className="text-black text-left ml-1 text-bold font-medium">
              Email
            </span>
            <div className="bg-white w-full h-12 rounded-lg flex border border-gray-300">
              <input
                className="w-full px-4 bg-white outline-none placeholder-gray-400 text-black"
                type="email"
                placeholder="email"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
          </div>
          <div className="flex flex-col space-y-2">
            <span className="text-black text-left ml-1 text-bold font-medium">
              Password
            </span>
            <div className="bg-white w-full h-12 rounded-lg flex border border-gray-300">
              <input
                className="w-full px-4 bg-white outline-none placeholder-gray-400 text-black"
                type={showPassword ? "text" : "password"}
                placeholder="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
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
          disabled={isLoading}
          className="w-full h-12  bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 rounded-lg text-white font-bold mt-6 mb-1 hover:scale-[101%] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
        >
          {isLoading ? "Creating Account..." : "Sign up"}
        </button>
      </form>
      <div className="flex justify-center my-6">
        <span className="text-black">Already have an account?</span>
        <button
          className="ml-2 hover:underline text-black"
          onClick={toggleView}
          disabled={isLoading}
        >
          Login
        </button>
      </div>
    </div>
  );
};

export default CreateNewAccount;