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

    const passwordRegex = /^(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(password)) {
      setErrorMessage(
        "Password must be at least 8 characters, one uppercase letter and one number."
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
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium uppercase tracking-widest" style={{ color: '#9B9694' }}>
              Full Name
            </label>
            <input
              className="w-full h-11 px-4 rounded-xl border text-sm outline-none transition-colors focus:border-[#7C9A7E]"
              style={{ backgroundColor: '#FAF8F4', borderColor: '#EEEBE6', color: '#2C2C2C' }}
              type="text"
              placeholder="Your name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>

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
              required
              disabled={isLoading}
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
                placeholder="Min. 8 chars, 1 uppercase, 1 number"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 transition-opacity hover:opacity-60"
                style={{ color: '#9B9694' }}
                disabled={isLoading}
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
            disabled={isLoading}
            className="w-full h-11 rounded-xl text-white text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50 mt-2"
            style={{ backgroundColor: '#7C9A7E' }}
          >
            {isLoading ? "Creating account..." : "Create account"}
          </button>
        </form>
      </div>

      <p className="text-center text-sm mt-6" style={{ color: '#9B9694' }}>
        Already have an account?{' '}
        <button
          className="transition-opacity hover:opacity-60 font-medium"
          style={{ color: '#2C2C2C' }}
          onClick={toggleView}
          disabled={isLoading}
        >
          Sign in
        </button>
      </p>
    </div>
  );
};

export default CreateNewAccount;
