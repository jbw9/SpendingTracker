import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Label } from "./ui/label";
import { Progress } from "./ui/progress";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { Plus, Wallet, TrendingUp, PieChartIcon, Trash2, ChevronLeft, ChevronRight, Calendar, Search, Filter, X, Settings, Edit } from "lucide-react";
import { Textarea } from "./ui/textarea";
import { type Currency, DEFAULT_CURRENCY, getAllCurrencies, getUserCurrency, setUserCurrency as saveUserCurrency, formatCurrency, getCurrencySymbol } from "../../lib/currency";
import { convertExpenseAmount, convertAmounts, convertCurrency } from "../../lib/currencyConverter";

interface MainPageProps {
  session: any; // Replace with proper Session type from Supabase
  supabase: any; // Replace with proper Supabase client type
}

interface ColorPickerProps {
  selectedColor: string;
  onColorChange: (color: string) => void;
}

interface Expense {
  id: string;
  amount: number;
  category: string;
  name: string;
  note?: string;
  date: string;
  month: string;
  currency: Currency;
  user_id: string;
}

interface Category {
  id: string;
  name: string;
  color: string;
  user_id: string;
}

interface MonthlyBudget {
  id: string;
  month: string;
  budget: number;
  currency: Currency;
  user_id: string;
}

// Expanded color palette with more options for categories
const COLOR_PALETTE = [
  { name: "Red", value: "#EF4444" },
  { name: "Orange", value: "#F97316" },
  { name: "Amber", value: "#F59E0B" },
  { name: "Yellow", value: "#EAB308" },
  { name: "Lime", value: "#84CC16" },
  { name: "Green", value: "#22C55E" },
  { name: "Emerald", value: "#10B981" },
  { name: "Teal", value: "#14B8A6" },
  { name: "Cyan", value: "#06B6D4" },
  { name: "Sky", value: "#0EA5E9" },
  { name: "Blue", value: "#3B82F6" },
  { name: "Indigo", value: "#6366F1" },
  { name: "Violet", value: "#8B5CF6" },
  { name: "Purple", value: "#A855F7" },
  { name: "Fuchsia", value: "#D946EF" },
  { name: "Pink", value: "#EC4899" },
  { name: "Rose", value: "#F43F5E" },
  { name: "Gray", value: "#6B7280" },
  { name: "Slate", value: "#475569" },
  { name: "Black", value: "#000000" },
];

// Legacy COLORS array for backward compatibility
const COLORS = COLOR_PALETTE.slice(0, 8).map((c) => c.value);

const DEFAULT_CATEGORIES: Omit<Category, "id" | "user_id">[] = [
  { name: "Food & Dining", color: "#EF4444" },
  { name: "Transportation", color: "#F97316" },
  { name: "Shopping", color: "#EAB308" },
  { name: "Entertainment", color: "#22C55E" },
  { name: "Bills & Utilities", color: "#06B6D4" },
  { name: "Healthcare", color: "#3B82F6" },
];

const MainPage: React.FC<MainPageProps> = ({ session, supabase }) => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [monthlyBudgets, setMonthlyBudgets] = useState<MonthlyBudget[]>([]);
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [isCategoryManageOpen, setIsCategoryManageOpen] = useState(false);
  const [isBudgetEditOpen, setIsBudgetEditOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [newExpense, setNewExpense] = useState({
    amount: "",
    category: "",
    name: "",
    note: "",
    month: "",
    currency: DEFAULT_CURRENCY as Currency,
  });
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryColor, setNewCategoryColor] = useState(COLOR_PALETTE[0].value);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryColor, setEditingCategoryColor] = useState<string>("");
  const [editingBudget, setEditingBudget] = useState("");
  const [loading, setLoading] = useState(true);
  const [monthOffset, setMonthOffset] = useState(0);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>(""); // New state for selected month

  // Currency state
  const [userCurrency, setUserCurrency] = useState<Currency>(DEFAULT_CURRENCY);

  // State for converted totals (to avoid recalculating on every render)
  const [convertedSelectedMonthSpent, setConvertedSelectedMonthSpent] = useState(0);
  const [convertedCategoryData, setConvertedCategoryData] = useState<{ name: string; value: number; color: string }[]>([]);
  const [convertedMonthlyData, setConvertedMonthlyData] = useState<{ month: string; amount: number; fullMonth: string }[]>([]);
  const [currencyBreakdown, setCurrencyBreakdown] = useState<{ currency: Currency; originalAmount: number; convertedAmount: number }[]>([]);

  // New state for filtering and searching
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"date" | "amount" | "name" | "category">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Toast replacement - simple alert for now
  const toast = (options: { title: string; description: string; variant?: string }) => {
    alert(`${options.title}: ${options.description}`);
  };

  // Helper function to get current month string
  const getCurrentMonth = () => {
    const currentDate = new Date();
    return currentDate.toLocaleDateString("en-US", { year: "numeric", month: "long" });
  };

  // Load data from Supabase
  useEffect(() => {
    if (session?.user?.id) {
      loadUserData();
      loadUserPreferences();
    }
  }, [session?.user?.id]);

  // Set current month when component mounts
  useEffect(() => {
    const currentMonth = getCurrentMonth();
    setNewExpense((prev) => ({ ...prev, month: currentMonth }));
    setSelectedMonth(currentMonth); // Set selected month to current month
  }, []);

  // Update converted totals when expenses, currency, or selected month changes
  useEffect(() => {
    if (expenses.length > 0 && selectedMonth && userCurrency) {
      updateConvertedSelectedMonthSpent();
      updateConvertedCategoryData();
      updateConvertedMonthlyData();
      updateCurrencyBreakdown();
    }
  }, [expenses, selectedMonth, userCurrency, categories, monthOffset]);

  const loadUserData = async () => {
    try {
      setLoading(true);
      await Promise.all([loadExpenses(), loadCategories(), loadBudgets()]);
    } catch (error) {
      console.error("Error loading data:", error);
      toast({
        title: "Error",
        description: "Failed to load data from database",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadUserPreferences = async () => {
    try {
      const { data, error } = await supabase.from("user_preferences").select("preferred_currency").eq("user_id", session.user.id).single();

      if (error) {
        // If no preferences exist, create them
        if (error.code === "PGRST116") {
          const { data: newPrefs, error: insertError } = await supabase
            .from("user_preferences")
            .insert({
              user_id: session.user.id,
              preferred_currency: DEFAULT_CURRENCY,
            })
            .select()
            .single();

          if (!insertError && newPrefs) {
            setUserCurrency(newPrefs.preferred_currency as Currency);
            saveUserCurrency(newPrefs.preferred_currency as Currency); // Also save to localStorage
          }
        }
        console.error("Error loading preferences:", error);
        // Fallback to localStorage
        setUserCurrency(getUserCurrency());
      } else if (data) {
        setUserCurrency(data.preferred_currency as Currency);
        saveUserCurrency(data.preferred_currency as Currency); // Also save to localStorage
      }
    } catch (error) {
      console.error("Error in loadUserPreferences:", error);
      // Fallback to localStorage
      setUserCurrency(getUserCurrency());
    }
  };

  const loadExpenses = async () => {
    const { data, error } = await supabase.from("spending").select("*").eq("user_id", session.user.id).order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading expenses:", error);
      return;
    }

    if (!data) {
      setExpenses([]);
      return;
    }

    // Transform the data from JSONB format to our interface
    const transformedExpenses: Expense[] = data
      .filter((record: any) => record.spendings !== null && record.categories !== null)
      .map((record: any) => {
        const spending = record.spendings || {};
        const category = record.categories || {};

        return {
          id: record.id,
          amount: Number(spending.amount) || 0,
          category: category.name || "Unknown",
          name: spending.name || "Unknown Transaction",
          note: spending.note || "",
          date: spending.date || new Date().toISOString().split("T")[0],
          month: spending.month || new Date().toLocaleDateString("en-US", { year: "numeric", month: "long" }),
          currency: spending.currency || DEFAULT_CURRENCY,
          user_id: record.user_id,
        };
      });

    setExpenses(transformedExpenses);
  };

  const loadCategories = async () => {
    try {
      const { data, error } = await supabase.from("categories").select("*").eq("user_id", session.user.id);

      if (error) {
        console.error("Error loading categories:", error);
        return;
      }

      if (!data || data.length === 0) {
        // If no categories exist, create default ones
        await createDefaultCategories();
      } else {
        // Remove duplicates by name before setting categories
        const uniqueCategories = data.reduce((acc: any[], category: any) => {
          const exists = acc.find((cat) => cat.name === category.name);
          if (!exists) {
            acc.push(category);
          }
          return acc;
        }, []);

        const transformedCategories: Category[] = uniqueCategories.map((category: any) => ({
          id: category.id.toString(),
          name: category.name || "Unknown",
          color: category.color || "#FFFFFF",
          user_id: category.user_id,
        }));
        setCategories(transformedCategories);
      }
    } catch (error) {
      console.error("Error in loadCategories:", error);
      // Fallback to creating default categories
      await createDefaultCategories();
    }
  };

  const createDefaultCategories = async () => {
    const defaultCategoriesWithUser = DEFAULT_CATEGORIES.map((category) => ({
      name: category.name,
      color: category.color,
      user_id: session.user.id,
    }));

    const { data, error } = await supabase.from("categories").insert(defaultCategoriesWithUser).select();

    if (error) {
      console.error("Error creating default categories:", error);
      // Fallback to local categories
      const fallbackCategories = DEFAULT_CATEGORIES.map((cat, index) => ({
        id: (Date.now() + index).toString(),
        name: cat.name,
        color: cat.color,
        user_id: session.user.id,
      }));
      setCategories(fallbackCategories);
    } else {
      const transformedCategories: Category[] = data.map((category: any) => ({
        id: category.id.toString(),
        name: category.name,
        color: category.color,
        user_id: category.user_id,
      }));
      setCategories(transformedCategories);
    }
  };

  const loadBudgets = async () => {
    try {
      const { data, error } = await supabase.from("monthly_budgets").select("*").eq("user_id", session.user.id);

      if (error) {
        console.error("Error loading budgets:", error);
        return;
      }

      if (data) {
        const transformedBudgets: MonthlyBudget[] = data.map((budget: any) => ({
          id: budget.id.toString(),
          month: budget.month,
          budget: Number(budget.budget) || 1000,
          currency: budget.currency || DEFAULT_CURRENCY,
          user_id: budget.user_id,
        }));
        setMonthlyBudgets(transformedBudgets);
      }
    } catch (error) {
      console.error("Error in loadBudgets:", error);
    }
  };

  const getCurrentMonthBudget = () => {
    // Convert selectedMonth to YYYY-MM format for comparison
    const monthParts = selectedMonth.split(" ");
    const monthName = monthParts[0];
    const year = parseInt(monthParts[1]);
    const monthIndex = new Date(`${monthName} 1, ${year}`).getMonth();
    const monthDate = new Date(year, monthIndex, 1);
    const monthFormatted = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, "0")}`;

    const monthBudget = monthlyBudgets.find((budget) => {
      // Check both formats for backward compatibility
      if (budget.month === selectedMonth) return true;
      return budget.month === monthFormatted;
    });
    return monthBudget || { budget: 1000, currency: userCurrency }; // Default to 1000 in user's currency if no budget set
  };

  const [convertedBudget, setConvertedBudget] = useState(1000); // Initialize with default budget
  const [loadingBudgetConversion, setLoadingBudgetConversion] = useState(false);

  // Update budget conversion when currency or budget changes
  useEffect(() => {
    const updateConvertedBudget = async () => {
      const monthBudget = getCurrentMonthBudget();
      if (monthBudget) {
        const budgetValue = monthBudget.budget || 1000; // Default to 1000 if no budget
        setLoadingBudgetConversion(true);
        try {
          const converted = await convertCurrency(budgetValue, monthBudget.currency || DEFAULT_CURRENCY, userCurrency);
          setConvertedBudget(converted);
        } catch (error) {
          console.error("Error converting budget:", error);
          setConvertedBudget(budgetValue);
        } finally {
          setLoadingBudgetConversion(false);
        }
      } else {
        // If no budget at all, set default
        setConvertedBudget(1000);
      }
    };

    if (selectedMonth && userCurrency) {
      updateConvertedBudget();
    }
  }, [selectedMonth, userCurrency, monthlyBudgets]);

  const saveBudget = async () => {
    // Remove commas before parsing
    const cleanBudget = editingBudget.replace(/,/g, "");
    const budgetAmount = parseFloat(cleanBudget);
    if (!budgetAmount || budgetAmount <= 0) {
      toast({
        title: "Error",
        description: "Please enter a valid budget amount",
        variant: "destructive",
      });
      return;
    }

    try {
      // Convert month from "November 2024" to "2024-11" format
      const monthParts = selectedMonth.split(" ");
      const monthName = monthParts[0];
      const year = parseInt(monthParts[1]);
      const monthIndex = new Date(`${monthName} 1, ${year}`).getMonth();
      const monthDate = new Date(year, monthIndex, 1);
      const monthFormatted = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, "0")}`;

      const existingBudget = monthlyBudgets.find((budget) => {
        // Check both formats for backward compatibility
        if (budget.month === selectedMonth) return true;
        const budgetMonthParts = budget.month.split(" ");
        const budgetMonthName = budgetMonthParts[0];
        const budgetYear = parseInt(budgetMonthParts[1]);
        const budgetMonthIndex = new Date(`${budgetMonthName} 1, ${budgetYear}`).getMonth();
        const budgetDate = new Date(budgetYear, budgetMonthIndex, 1);
        const budgetFormatted = `${budgetDate.getFullYear()}-${String(budgetDate.getMonth() + 1).padStart(2, "0")}`;
        return budgetFormatted === monthFormatted;
      });

      if (existingBudget) {
        // Update existing budget with currency
        const { data, error } = await supabase
          .from("monthly_budgets")
          .update({
            budget: budgetAmount,
            currency: userCurrency,
          })
          .eq("id", parseInt(existingBudget.id))
          .eq("user_id", session.user.id)
          .select()
          .single();

        if (error) {
          console.error("Error updating budget:", error);
          toast({
            title: "Error",
            description: "Failed to update budget",
            variant: "destructive",
          });
          return;
        }

        // Update local state
        setMonthlyBudgets(monthlyBudgets.map((budget) => (budget.id === existingBudget.id ? { ...budget, budget: budgetAmount, currency: userCurrency } : budget)));
      } else {
        // Create new budget with currency
        const { data, error } = await supabase
          .from("monthly_budgets")
          .insert({
            month: monthFormatted, // Use the formatted month (YYYY-MM)
            budget: budgetAmount,
            currency: userCurrency,
            user_id: session.user.id,
          })
          .select()
          .single();

        if (error) {
          console.error("Error creating budget:", error);
          toast({
            title: "Error",
            description: "Failed to create budget",
            variant: "destructive",
          });
          return;
        }

        // Add to local state
        const newBudget: MonthlyBudget = {
          id: data.id.toString(),
          month: selectedMonth,
          budget: budgetAmount,
          currency: userCurrency,
          user_id: session.user.id,
        };
        setMonthlyBudgets([...monthlyBudgets, newBudget]);
      }

      setIsBudgetEditOpen(false);
      setEditingBudget("");
      toast({
        title: "Success!",
        description: "Budget updated successfully",
      });
    } catch (error) {
      console.error("Exception in saveBudget:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    }
  };

  const openBudgetEdit = () => {
    const monthBudget = getCurrentMonthBudget();
    // Use the converted budget value for display
    const displayBudget = convertedBudget > 0 ? convertedBudget : monthBudget.budget;
    // Format the number with commas when opening
    setEditingBudget(displayBudget.toLocaleString("en-US"));
    setIsBudgetEditOpen(true);
  };

  // Helper function to format number input with commas
  const handleBudgetInputChange = (value: string) => {
    // Remove all non-digit characters except decimal point
    const cleanValue = value.replace(/[^0-9.]/g, "");

    // Split by decimal point
    const parts = cleanValue.split(".");

    // Format the integer part with commas
    if (parts[0]) {
      parts[0] = parseInt(parts[0] || "0").toLocaleString("en-US");
    }

    // Rejoin with decimal if exists
    const formattedValue = parts.length > 1 ? `${parts[0]}.${parts[1].slice(0, 2)}` : parts[0];

    setEditingBudget(formattedValue);
  };

  // Helper function to format expense amount input with commas
  const handleExpenseAmountChange = (value: string) => {
    // Remove all non-digit characters except decimal point
    const cleanValue = value.replace(/[^0-9.]/g, "");

    // Split by decimal point
    const parts = cleanValue.split(".");

    // Format the integer part with commas
    if (parts[0]) {
      parts[0] = parseInt(parts[0] || "0").toLocaleString("en-US");
    }

    // Rejoin with decimal if exists
    const formattedValue = parts.length > 1 ? `${parts[0]}.${parts[1].slice(0, 2)}` : parts[0];

    setNewExpense({ ...newExpense, amount: formattedValue });
  };

  const addExpense = async () => {
    console.log("Add expense called with:", newExpense); // Debug log

    if (!newExpense.amount || !newExpense.category || !newExpense.name || !newExpense.month) {
      console.log("Validation failed:", {
        amount: newExpense.amount,
        category: newExpense.category,
        name: newExpense.name,
        month: newExpense.month,
      }); // Debug log
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    // Remove commas from amount before parsing
    const cleanAmount = newExpense.amount.toString().replace(/,/g, "");

    try {
      // Use today's date for new expenses, or preserve existing date when editing
      const dateString = editingExpense
        ? editingExpense.date
        : new Date().toLocaleDateString("en-CA"); // en-CA gives YYYY-MM-DD format
      const monthString = newExpense.month;

      // Find the selected category to get its color
      const selectedCat = categories.find((cat) => cat.name === newExpense.category);

      if (editingExpense) {
        // Update existing expense
        const updatedRecord = {
          categories: {
            name: newExpense.category,
            color: selectedCat?.color || "#FFFFFF",
          },
          spendings: {
            amount: parseFloat(cleanAmount),
            name: newExpense.name,
            note: newExpense.note || "",
            date: dateString,
            month: monthString,
            currency: newExpense.currency,
          },
        };

        const { data, error } = await supabase.from("spending").update(updatedRecord).eq("id", editingExpense.id).eq("user_id", session.user.id).select().single();

        if (error) {
          console.error("Error updating expense:", error);
          toast({
            title: "Error",
            description: "Failed to update expense in database",
            variant: "destructive",
          });
          return;
        }

        // Update local state
        const updatedExpense: Expense = {
          ...editingExpense,
          amount: parseFloat(cleanAmount),
          category: newExpense.category,
          name: newExpense.name,
          note: newExpense.note || "",
          date: dateString,
          month: monthString,
          currency: newExpense.currency,
        };

        setExpenses(expenses.map((exp) => (exp.id === editingExpense.id ? updatedExpense : exp)));
      } else {
        // Add new expense
        const spendingRecord = {
          user_id: session.user.id,
          categories: {
            name: newExpense.category,
            color: selectedCat?.color || "#FFFFFF",
          },
          spendings: {
            amount: parseFloat(cleanAmount),
            name: newExpense.name,
            note: newExpense.note || "",
            date: dateString,
            month: monthString,
            currency: newExpense.currency,
          },
        };

        console.log("Inserting record:", spendingRecord); // Debug log

        const { data, error } = await supabase.from("spending").insert(spendingRecord).select().single();

        if (error) {
          console.error("Error adding expense:", error);
          toast({
            title: "Error",
            description: "Failed to add expense to database",
            variant: "destructive",
          });
          return;
        }

        console.log("Insert successful:", data); // Debug log

        // Add to local state
        const newExpenseRecord: Expense = {
          id: data.id,
          amount: parseFloat(cleanAmount),
          category: newExpense.category,
          name: newExpense.name,
          note: newExpense.note || "",
          date: dateString,
          month: monthString,
          currency: newExpense.currency,
          user_id: session.user.id,
        };

        setExpenses([newExpenseRecord, ...expenses]);
      }

      // Reset form
      const currentMonth = getCurrentMonth();
      setNewExpense({
        amount: "",
        category: "",
        name: "",
        note: "",
        month: currentMonth,
        currency: userCurrency,
      });
      setEditingExpense(null);
      setIsAddExpenseOpen(false);
    } catch (error) {
      console.error("Exception in addExpense:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    }
  };

  const deleteExpense = async (expenseId: string) => {
    try {
      const { error } = await supabase.from("spending").delete().eq("id", expenseId).eq("user_id", session.user.id);

      if (error) {
        console.error("Error deleting expense:", error);
        toast({
          title: "Error",
          description: "Failed to delete expense from database",
          variant: "destructive",
        });
        return;
      }

      // Remove from local state
      setExpenses(expenses.filter((exp) => exp.id !== expenseId));

      // Close the dialog
      handleCloseDialog();

      toast({
        title: "Success!",
        description: "Expense deleted successfully",
      });
    } catch (error) {
      console.error("Exception in deleteExpense:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    }
  };

  const addCategory = async () => {
    if (!newCategoryName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a category name",
        variant: "destructive",
      });
      return;
    }

    const newCategoryData = {
      name: newCategoryName.trim(),
      color: newCategoryColor,
      user_id: session.user.id,
    };

    const { data, error } = await supabase.from("categories").insert(newCategoryData).select().single();

    if (error) {
      console.error("Error adding category:", error);
      toast({
        title: "Error",
        description: "Failed to add category to database",
        variant: "destructive",
      });
      return;
    }

    const newCategory: Category = {
      id: data.id.toString(),
      name: data.name,
      color: data.color,
      user_id: data.user_id,
    };

    setCategories([...categories, newCategory]);
    setNewCategoryName("");
    setNewCategoryColor(COLOR_PALETTE[0].value);
    toast({
      title: "Success!",
      description: "Category added successfully",
    });
  };

  const deleteCategory = async (categoryId: string) => {
    const categoryToDelete = categories.find((cat) => cat.id === categoryId);
    if (!categoryToDelete) return;

    // Check if any expenses use this category
    const hasExpenses = expenses.some((expense) => expense.category === categoryToDelete.name);
    if (hasExpenses) {
      toast({
        title: "Cannot Delete",
        description: "This category is being used by existing expenses",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase.from("categories").delete().eq("id", parseInt(categoryId)).eq("user_id", session.user.id);

    if (error) {
      console.error("Error deleting category:", error);
      toast({
        title: "Error",
        description: "Failed to delete category from database",
        variant: "destructive",
      });
      return;
    }

    setCategories(categories.filter((cat) => cat.id !== categoryId));
    toast({
      title: "Success!",
      description: "Category deleted successfully",
    });
  };

  const updateCategoryColor = async (categoryId: string, newColor: string) => {
    const { error } = await supabase.from("categories").update({ color: newColor }).eq("id", parseInt(categoryId)).eq("user_id", session.user.id);

    if (error) {
      console.error("Error updating category color:", error);
      toast({
        title: "Error",
        description: "Failed to update category color",
        variant: "destructive",
      });
      return;
    }

    // Update local state
    setCategories(categories.map((cat) => (cat.id === categoryId ? { ...cat, color: newColor } : cat)));

    // Also update any expenses that have cached category colors
    const { error: expenseError } = await supabase.from("spending").select("*").eq("user_id", session.user.id);

    if (!expenseError) {
      // Reload expenses to reflect the color change
      await loadExpenses();
    }

    setEditingCategoryId(null);
    toast({
      title: "Success!",
      description: "Category color updated successfully",
    });
  };

  const startEditingCategoryColor = (categoryId: string, currentColor: string) => {
    setEditingCategoryId(categoryId);
    setEditingCategoryColor(currentColor);
  };

  const cancelEditingCategoryColor = () => {
    setEditingCategoryId(null);
    setEditingCategoryColor("");
  };

  const getAvailableMonths = () => {
    const months = [];
    const currentDate = new Date();

    // Add previous 6 months
    for (let i = 6; i >= 1; i--) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const monthName = date.toLocaleDateString("en-US", { year: "numeric", month: "long" });
      months.push(monthName);
    }

    // Add current month and next 6 months
    for (let i = 0; i <= 6; i++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() + i, 1);
      const monthName = date.toLocaleDateString("en-US", { year: "numeric", month: "long" });
      months.push(monthName);
    }

    return months;
  };

  const handleEditExpense = (expense: Expense) => {
    setEditingExpense(expense);
    setNewExpense({
      amount: expense.amount.toLocaleString("en-US"), // Format with commas
      category: expense.category,
      name: expense.name,
      note: expense.note || "",
      month: expense.month,
      currency: expense.currency,
    });
    setIsAddExpenseOpen(true);
  };

  const handleCloseDialog = () => {
    setIsAddExpenseOpen(false);
    setEditingExpense(null);
    const currentMonth = getCurrentMonth();
    setNewExpense({
      amount: "",
      category: "",
      name: "",
      note: "",
      month: currentMonth,
      currency: userCurrency,
    });
  };

  // Updated to filter by selected month
  const getCategoryData = () => {
    const categoryTotals = categories
      .map((category) => {
        const total = expenses.filter((expense) => expense.category === category.name && expense.month === selectedMonth).reduce((sum, expense) => sum + expense.amount, 0);
        return {
          name: category.name,
          value: total,
          color: category.color,
        };
      })
      .filter((item) => item.value > 0)
      .sort((a, b) => b.value - a.value);

    return categoryTotals;
  };

  const getMonthlyData = () => {
    const monthlyTotals = expenses.reduce((acc, expense) => {
      const month = expense.month;
      acc[month] = (acc[month] || 0) + expense.amount;
      return acc;
    }, {} as Record<string, number>);

    // Get 5 months with current month in the center (2 before, current, 2 after)
    const months = [];
    const now = new Date();
    for (let i = -2; i <= 2; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() + monthOffset + i, 1);
      const monthName = date.toLocaleDateString("en-US", { year: "numeric", month: "long" });
      months.push(monthName);
    }

    return months.map((month) => ({
      month: month.split(" ")[0], // Just the month nameee
      fullMonth: month, // Keep full month for data lookup
      amount: monthlyTotals[month] || 0,
    }));
  };

  // Updated to use selected month
  const getSelectedMonthSpent = () => {
    return expenses.filter((expense) => expense.month === selectedMonth).reduce((sum, expense) => sum + expense.amount, 0);
  };

  // NEW: Async functions to calculate converted totals
  const updateConvertedSelectedMonthSpent = async () => {
    const selectedMonthExpenses = expenses.filter((expense) => expense.month === selectedMonth);

    if (selectedMonthExpenses.length === 0) {
      setConvertedSelectedMonthSpent(0);
      return;
    }

    try {
      const convertedAmounts = await Promise.all(selectedMonthExpenses.map((expense) => convertExpenseAmount(expense, userCurrency)));

      const total = convertedAmounts.reduce((sum, amount) => sum + amount, 0);
      setConvertedSelectedMonthSpent(total);
    } catch (error) {
      console.error("Error converting selected month expenses:", error);
      // Fallback to original calculation
      const originalTotal = selectedMonthExpenses.reduce((sum, expense) => sum + expense.amount, 0);
      setConvertedSelectedMonthSpent(originalTotal);
    }
  };

  const updateConvertedCategoryData = async () => {
    const categoryTotals = await Promise.all(
      categories.map(async (category) => {
        const categoryExpenses = expenses.filter((expense) => expense.category === category.name && expense.month === selectedMonth);

        if (categoryExpenses.length === 0) {
          return { name: category.name, value: 0, color: category.color };
        }

        const convertedAmounts = await Promise.all(categoryExpenses.map((expense) => convertExpenseAmount(expense, userCurrency)));

        const total = convertedAmounts.reduce((sum, amount) => sum + amount, 0);

        return {
          name: category.name,
          value: total,
          color: category.color,
        };
      })
    );

    const filteredAndSorted = categoryTotals.filter((item) => item.value > 0).sort((a, b) => b.value - a.value);

    setConvertedCategoryData(filteredAndSorted);
  };

  const updateConvertedMonthlyData = async () => {
    // Get 5 months with current month in the center
    const months = [];
    const now = new Date();
    for (let i = -2; i <= 2; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() + monthOffset + i, 1);
      const monthName = date.toLocaleDateString("en-US", { year: "numeric", month: "long" });
      months.push(monthName);
    }

    const monthlyData = await Promise.all(
      months.map(async (month) => {
        const monthExpenses = expenses.filter((expense) => expense.month === month);

        if (monthExpenses.length === 0) {
          return {
            month: month.split(" ")[0],
            fullMonth: month,
            amount: 0,
          };
        }

        const convertedAmounts = await Promise.all(monthExpenses.map((expense) => convertExpenseAmount(expense, userCurrency)));

        const total = convertedAmounts.reduce((sum, amount) => sum + amount, 0);

        return {
          month: month.split(" ")[0],
          fullMonth: month,
          amount: total,
        };
      })
    );

    setConvertedMonthlyData(monthlyData);
  };

  const updateCurrencyBreakdown = async () => {
    const selectedMonthExpenses = expenses.filter((expense) => expense.month === selectedMonth);

    if (selectedMonthExpenses.length === 0) {
      setCurrencyBreakdown([]);
      return;
    }

    // Group expenses by currency and sum them up
    const currencyTotals = selectedMonthExpenses.reduce((acc, expense) => {
      const currency = expense.currency;
      acc[currency] = (acc[currency] || 0) + expense.amount;
      return acc;
    }, {} as Record<Currency, number>);

    try {
      // Convert each currency total to the default currency
      const breakdown = await Promise.all(
        Object.entries(currencyTotals).map(async ([currency, amount]) => {
          const convertedAmount = await convertCurrency(amount, currency as Currency, userCurrency);
          return {
            currency: currency as Currency,
            originalAmount: amount,
            convertedAmount: convertedAmount,
          };
        })
      );

      setCurrencyBreakdown(breakdown);
    } catch (error) {
      console.error("Error creating currency breakdown:", error);
      setCurrencyBreakdown([]);
    }
  };

  // New function to get filtered and searched expenses for the selected month
  const getFilteredExpenses = () => {
    let filteredExpenses = expenses.filter((expense) => expense.month === selectedMonth);

    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filteredExpenses = filteredExpenses.filter(
        (expense) =>
          expense.name.toLowerCase().includes(searchLower) || expense.category.toLowerCase().includes(searchLower) || expense.amount.toString().includes(searchTerm) || (expense.note && expense.note.toLowerCase().includes(searchLower))
      );
    }

    // Apply category filter
    if (filterCategory !== "all") {
      filteredExpenses = filteredExpenses.filter((expense) => expense.category === filterCategory);
    }

    // Apply sorting
    filteredExpenses.sort((a, b) => {
      let aValue: any = a[sortBy];
      let bValue: any = b[sortBy];

      if (sortBy === "amount") {
        aValue = a.amount;
        bValue = b.amount;
      } else if (sortBy === "date") {
        aValue = new Date(a.date);
        bValue = new Date(b.date);
      } else {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (sortOrder === "asc") {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filteredExpenses;
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchTerm("");
    setFilterCategory("all");
    setSortBy("date");
    setSortOrder("desc");
  };

  // Handle currency change
  const handleCurrencyChange = async (currency: Currency) => {
    // Update state and save to localStorage
    setUserCurrency(currency);
    saveUserCurrency(currency); // Save to localStorage

    // Save to database
    try {
      const { error } = await supabase.from("user_preferences").upsert(
        {
          user_id: session.user.id,
          preferred_currency: currency,
        },
        {
          onConflict: "user_id",
        }
      );

      if (error) {
        console.error("Error saving currency preference:", error);
        toast({
          title: "Warning",
          description: `Currency changed locally but failed to save to database`,
          variant: "destructive",
        });
      } else {
        // Immediately trigger conversion updates for instant feedback
        if (expenses.length > 0 && selectedMonth) {
          updateConvertedSelectedMonthSpent();
          updateConvertedCategoryData();
          updateConvertedMonthlyData();
          updateCurrencyBreakdown();
        }

        // Update budget conversion immediately
        const monthBudget = getCurrentMonthBudget();
        if (monthBudget && monthBudget.budget) {
          try {
            const converted = await convertCurrency(
              monthBudget.budget,
              monthBudget.currency || DEFAULT_CURRENCY,
              currency // Use the new currency
            );
            setConvertedBudget(converted);
          } catch (err) {
            console.error("Error converting budget:", err);
            setConvertedBudget(monthBudget.budget);
          }
        }

        toast({
          title: "Currency Updated",
          description: `Default currency changed to ${currency}`,
        });
      }
    } catch (error) {
      console.error("Error updating currency:", error);
    }
  };

  // Helper function to get month name only (e.g., "May" from "May 2025")
  const getMonthName = (fullMonth: string) => {
    return fullMonth.split(" ")[0];
  };

  // Helper function to check if selected month is current month
  const isCurrentMonth = () => {
    return selectedMonth === getCurrentMonth();
  };

  // Use converted total, fallback to original calculation if conversion hasn't completed yet
  const selectedMonthSpent = convertedSelectedMonthSpent > 0 ? convertedSelectedMonthSpent : getSelectedMonthSpent();
  const currentMonthBudget = getCurrentMonthBudget();
  // Use convertedBudget for calculations (or fallback to budget property if conversion not ready)
  const budgetAmount = convertedBudget > 0 ? convertedBudget : currentMonthBudget.budget || 1000;
  // Ensure budgetProgress is never NaN
  const budgetProgress = budgetAmount > 0 ? (selectedMonthSpent / budgetAmount) * 100 : 0;

  // Calculate progress bar color based on budget proximity
  const getProgressBarColor = () => {
    if (budgetProgress <= 50) {
      return "#FFFFFF"; // White when under 50%
    } else if (budgetProgress <= 75) {
      // Gradient from white to yellow (50% to 75%)
      const factor = (budgetProgress - 50) / 25;
      return `rgb(${255}, ${255}, ${Math.round(255 - 255 * factor)})`;
    } else if (budgetProgress <= 90) {
      // Gradient from yellow to orange (75% to 90%)
      const factor = (budgetProgress - 75) / 15;
      return `rgb(${255}, ${Math.round(255 - 100 * factor)}, 0)`;
    } else {
      // Red when over 90%
      return "#EF4444";
    }
  };

  // Use converted category totals, fallback to original calculation if conversion hasn't completed yet
  const categoryData = convertedCategoryData.length > 0 ? convertedCategoryData : getCategoryData();
  const displayedCategory = selectedCategory ? categoryData.find((cat) => cat.name === selectedCategory) || categoryData[0] : categoryData[0];

  const handlePieChartClick = (data: any) => {
    if (data && data.name) {
      const newSelected = data.name === selectedCategory ? "" : data.name;
      setSelectedCategory(newSelected);
      setFilterCategory(newSelected || "all");
    }
  };

  const filteredExpenses = getFilteredExpenses();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#FAF8F4' }}>
        <div className="w-3 h-3 rounded-full animate-pulse" style={{ backgroundColor: '#7C9A7E' }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-28" style={{ backgroundColor: '#FAF8F4' }}>
      <div className="max-w-xl mx-auto px-4 pt-6 space-y-4">

        {/* Header */}
        <div className="flex justify-between items-center py-1">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const months = getAvailableMonths();
                const currentIndex = months.indexOf(selectedMonth);
                if (currentIndex > 0) setSelectedMonth(months[currentIndex - 1]);
              }}
              className="w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:bg-white"
              style={{ color: '#9B9694' }}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <h2 className="text-sm font-medium" style={{ color: '#2C2C2C' }}>{selectedMonth}</h2>
            <button
              onClick={() => {
                const months = getAvailableMonths();
                const currentIndex = months.indexOf(selectedMonth);
                if (currentIndex < months.length - 1) setSelectedMonth(months[currentIndex + 1]);
              }}
              className="w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:bg-white"
              style={{ color: '#9B9694' }}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <Select value={userCurrency} onValueChange={(value: Currency) => handleCurrencyChange(value)}>
            <SelectTrigger
              className="w-20 h-8 text-xs rounded-full border"
              style={{ borderColor: '#EEEBE6', color: '#2C2C2C', backgroundColor: 'white' }}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {getAllCurrencies().map((currency) => (
                <SelectItem key={currency.code} value={currency.code}>
                  <div className="flex items-center space-x-2">
                    <span>{currency.symbol}</span>
                    <span>{currency.code}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Budget Hero Card */}
        <div className="rounded-2xl p-5 bg-white border" style={{ borderColor: '#EEEBE6' }}>
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-xs uppercase tracking-widest font-medium mb-1" style={{ color: '#9B9694' }}>
                {isCurrentMonth() ? 'This Month' : getMonthName(selectedMonth)}
              </p>
              <div className="flex items-baseline gap-2">
                <p className="text-4xl font-light" style={{ fontFamily: 'Georgia, serif', color: '#2C2C2C' }}>
                  {formatCurrency(selectedMonthSpent, userCurrency)}
                </p>
                <button onClick={openBudgetEdit} className="transition-opacity hover:opacity-50 mb-1">
                  <Edit className="h-3.5 w-3.5" style={{ color: '#9B9694' }} />
                </button>
              </div>
              <p className="text-sm mt-0.5" style={{ color: '#9B9694' }}>
                of {formatCurrency(budgetAmount, userCurrency)} budget
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-light" style={{ fontFamily: 'Georgia, serif', color: budgetProgress > 100 ? '#C98D8D' : '#7C9A7E' }}>
                {isNaN(budgetProgress) ? '100' : Math.max(0, 100 - budgetProgress).toFixed(0)}%
              </p>
              <p className="text-xs" style={{ color: '#9B9694' }}>remaining</p>
            </div>
          </div>
          <div className="h-1 rounded-full overflow-hidden" style={{ backgroundColor: '#EEEBE6' }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(budgetProgress, 100)}%`,
                backgroundColor: budgetProgress > 100 ? '#C98D8D' : budgetProgress > 75 ? '#E8B07A' : '#7C9A7E',
              }}
            />
          </div>
          {budgetProgress > 100 && (
            <p className="text-xs mt-2" style={{ color: '#C98D8D' }}>
              Over budget by {formatCurrency(selectedMonthSpent - budgetAmount, userCurrency)}
            </p>
          )}
          {currencyBreakdown.length > 1 && (
            <div className="mt-3 pt-3 border-t" style={{ borderColor: '#EEEBE6' }}>
              <p className="text-xs font-medium mb-1.5" style={{ color: '#9B9694' }}>Currency Breakdown</p>
              <div className="space-y-1">
                {currencyBreakdown.map((item) => (
                  <div key={item.currency} className="flex justify-between items-center text-xs" style={{ color: '#9B9694' }}>
                    <span>{getCurrencySymbol(item.currency)} {formatCurrency(item.originalAmount, item.currency).replace(/^[^0-9]*/, "")}</span>
                    <span>→ {formatCurrency(item.convertedAmount, userCurrency)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Category Donut Chart */}
        <div className="rounded-2xl p-5 bg-white border" style={{ borderColor: '#EEEBE6' }}>
          <p className="text-xs uppercase tracking-widest font-medium mb-4" style={{ color: '#9B9694' }}>By Category</p>
          {categoryData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8">
              <PieChartIcon className="h-8 w-8 mb-2" style={{ color: '#EEEBE6' }} />
              <p className="text-sm" style={{ color: '#9B9694' }}>No spending for {getMonthName(selectedMonth)}</p>
            </div>
          ) : (
            <>
              <div className="h-44 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={52}
                      outerRadius={75}
                      paddingAngle={3}
                      dataKey="value"
                      stroke="none"
                      onClick={handlePieChartClick}
                    >
                      {categoryData.map((entry, index) => {
                        const isSelected = entry.name === (selectedCategory || categoryData[0]?.name);
                        return (
                          <Cell
                            key={`cell-${index}`}
                            fill={entry.color}
                            opacity={isSelected ? 1 : 0.45}
                            style={{ cursor: 'pointer', transition: 'opacity 0.2s ease' }}
                          />
                        );
                      })}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                {displayedCategory && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <p className="text-xl font-light" style={{ fontFamily: 'Georgia, serif', color: '#2C2C2C' }}>
                      {formatCurrency(displayedCategory.value, userCurrency)}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: '#9B9694' }}>{displayedCategory.name}</p>
                  </div>
                )}
              </div>
              <div className="flex gap-2 mt-3 overflow-x-auto pb-1 scrollbar-hide">
                {categoryData.map((cat) => {
                  const isSelected = cat.name === (selectedCategory || categoryData[0]?.name);
                  return (
                    <button
                      key={cat.name}
                      onClick={() => {
                        const newSelected = cat.name === selectedCategory ? "" : cat.name;
                        setSelectedCategory(newSelected);
                        setFilterCategory(newSelected || "all");
                      }}
                      className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all"
                      style={{
                        backgroundColor: isSelected ? '#2C2C2C' : '#FAF8F4',
                        color: isSelected ? '#FFFFFF' : '#2C2C2C',
                        border: `1px solid ${isSelected ? '#2C2C2C' : '#EEEBE6'}`,
                      }}
                    >
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                      {cat.name}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Monthly Trend */}
        <div className="rounded-2xl p-5 bg-white border" style={{ borderColor: '#EEEBE6' }}>
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs uppercase tracking-widest font-medium" style={{ color: '#9B9694' }}>Monthly Trend</p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setMonthOffset(monthOffset - 1)}
                className="w-6 h-6 rounded-full flex items-center justify-center transition-colors hover:bg-[#FAF8F4]"
                style={{ color: '#9B9694' }}
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setMonthOffset(monthOffset + 1)}
                className="w-6 h-6 rounded-full flex items-center justify-center transition-colors hover:bg-[#FAF8F4]"
                style={{ color: '#9B9694' }}
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart
              data={convertedMonthlyData.length > 0 ? convertedMonthlyData : getMonthlyData()}
              margin={{ top: 0, right: 0, left: -20, bottom: 0 }}
            >
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9B9694' }} />
              <YAxis hide />
              <Tooltip
                cursor={{ fill: '#FAF8F4' }}
                contentStyle={{ border: '1px solid #EEEBE6', borderRadius: '12px', fontSize: '12px', color: '#2C2C2C', boxShadow: 'none' }}
                formatter={(value) => [formatCurrency(Number(value), userCurrency), 'Spent']}
                labelFormatter={(label, payload) => {
                  const data = payload?.[0]?.payload;
                  return data?.fullMonth || label;
                }}
              />
              <Bar
                dataKey="amount"
                radius={[6, 6, 3, 3]}
                style={{ cursor: 'pointer' }}
                onClick={(data) => {
                  if (data && data.fullMonth) {
                    setSelectedMonth(data.fullMonth);
                  }
                }}
              >
                {(convertedMonthlyData.length > 0 ? convertedMonthlyData : getMonthlyData()).map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.fullMonth === selectedMonth ? '#7C9A7E' : '#EEEBE6'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <p className="text-xs text-center mt-2" style={{ color: '#9B9694' }}>Tap a bar to switch months</p>
        </div>

        {/* Expense List */}
        <div className="rounded-2xl bg-white border overflow-hidden" style={{ borderColor: '#EEEBE6' }}>
          <div className="p-5 pb-3">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs uppercase tracking-widest font-medium" style={{ color: '#9B9694' }}>Transactions</p>
              <span className="text-xs" style={{ color: '#9B9694' }}>
                {filteredExpenses.length} of {expenses.filter((e) => e.month === selectedMonth).length}
              </span>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5" style={{ color: '#9B9694' }} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search..."
                className="w-full pl-8 pr-8 py-2 text-sm rounded-xl outline-none border transition-colors"
                style={{ backgroundColor: '#FAF8F4', borderColor: '#EEEBE6', color: '#2C2C2C' }}
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                  <X className="h-3.5 w-3.5" style={{ color: '#9B9694' }} />
                </button>
              )}
            </div>
            <div className="flex gap-1.5 mt-2.5 overflow-x-auto pb-1 scrollbar-hide">
              <button
                onClick={() => { setFilterCategory('all'); setSelectedCategory(''); }}
                className="flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-all"
                style={{
                  backgroundColor: filterCategory === 'all' ? '#2C2C2C' : '#FAF8F4',
                  color: filterCategory === 'all' ? '#FFFFFF' : '#9B9694',
                  border: `1px solid ${filterCategory === 'all' ? '#2C2C2C' : '#EEEBE6'}`,
                }}
              >
                All
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => {
                    const next = filterCategory === cat.name ? 'all' : cat.name;
                    setFilterCategory(next);
                    setSelectedCategory(next === 'all' ? '' : next);
                  }}
                  className="flex-shrink-0 flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium transition-all"
                  style={{
                    backgroundColor: filterCategory === cat.name ? '#2C2C2C' : '#FAF8F4',
                    color: filterCategory === cat.name ? '#FFFFFF' : '#9B9694',
                    border: `1px solid ${filterCategory === cat.name ? '#2C2C2C' : '#EEEBE6'}`,
                  }}
                >
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: cat.color }} />
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          {filteredExpenses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 px-5">
              <Wallet className="h-7 w-7 mb-2" style={{ color: '#EEEBE6' }} />
              <p className="text-sm text-center" style={{ color: '#9B9694' }}>
                {expenses.filter((e) => e.month === selectedMonth).length === 0
                  ? isCurrentMonth()
                    ? 'No expenses yet. Tap + to add one.'
                    : `No expenses for ${getMonthName(selectedMonth)}.`
                  : 'No matches for your filters.'}
              </p>
              {(searchTerm || filterCategory !== 'all') && (
                <button onClick={clearFilters} className="mt-2 text-xs underline" style={{ color: '#7C9A7E' }}>
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              {filteredExpenses.map((expense, idx) => {
                const category = categories.find((cat) => cat.name === expense.category);
                return (
                  <button
                    key={expense.id}
                    className="w-full flex items-center justify-between px-5 py-3.5 text-left transition-colors hover:bg-[#FAF8F4] active:bg-[#FAF8F4]"
                    style={{ borderTop: idx === 0 ? 'none' : `1px solid #EEEBE6` }}
                    onClick={() => handleEditExpense(expense)}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: category?.color || '#EEEBE6' }} />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: '#2C2C2C' }}>{expense.name}</p>
                        <p className="text-xs truncate" style={{ color: '#9B9694' }}>
                          {expense.category}
                          {expense.note && <span className="ml-1">· {expense.note}</span>}
                        </p>
                      </div>
                    </div>
                    <div className="text-right ml-3 flex-shrink-0">
                      <p className="text-sm font-medium" style={{ fontFamily: 'Georgia, serif', color: '#2C2C2C' }}>
                        {formatCurrency(expense.amount, expense.currency)}
                      </p>
                      <p className="text-xs" style={{ color: '#9B9694' }}>
                        {new Date(expense.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Sort controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs" style={{ color: '#9B9694' }}>Sort</span>
          {(['date', 'amount', 'name', 'category'] as const).map((option) => (
            <button
              key={option}
              onClick={() => {
                if (sortBy === option) {
                  setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                } else {
                  setSortBy(option);
                }
              }}
              className="text-xs px-2.5 py-1 rounded-lg transition-all capitalize"
              style={{
                backgroundColor: sortBy === option ? '#2C2C2C' : 'transparent',
                color: sortBy === option ? '#FFFFFF' : '#9B9694',
              }}
            >
              {option}{sortBy === option ? (sortOrder === 'asc' ? ' ↑' : ' ↓') : ''}
            </button>
          ))}
        </div>

        {/* Sign out */}
        <div className="flex justify-center pb-6">
          <button
            onClick={() => supabase.auth.signOut()}
            className="text-xs transition-opacity hover:opacity-50"
            style={{ color: '#9B9694' }}
          >
            Sign out
          </button>
        </div>
      </div>

      {/* Floating Add Button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsAddExpenseOpen(true);
        }}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-95 z-50"
        style={{ backgroundColor: '#7C9A7E' }}
      >
        <Plus className="h-6 w-6 text-white" />
      </button>

      {/* Add/Edit Expense Dialog */}
      <Dialog open={isAddExpenseOpen} onOpenChange={handleCloseDialog}>
        <DialogContent className="w-[95vw] max-w-md bg-white rounded-2xl border-0 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-medium" style={{ color: '#2C2C2C' }}>
              {editingExpense ? 'Edit Expense' : 'New Expense'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs font-medium uppercase tracking-widest" style={{ color: '#9B9694' }}>Month</Label>
              <Select value={newExpense.month} onValueChange={(value) => setNewExpense({ ...newExpense, month: value })}>
                <SelectTrigger className="mt-1.5 border rounded-xl h-11" style={{ borderColor: '#EEEBE6' }}>
                  <SelectValue placeholder="Select month" />
                </SelectTrigger>
                <SelectContent className="bg-white max-h-48 overflow-y-auto">
                  {getAvailableMonths().map((month) => (
                    <SelectItem key={month} value={month}>{month}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-medium uppercase tracking-widest" style={{ color: '#9B9694' }}>Name</Label>
              <Input
                id="name"
                value={newExpense.name}
                onChange={(e) => setNewExpense({ ...newExpense, name: e.target.value })}
                placeholder="What did you spend on?"
                className="mt-1.5 border rounded-xl h-11"
                style={{ borderColor: '#EEEBE6' }}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-medium uppercase tracking-widest" style={{ color: '#9B9694' }}>Amount</Label>
                <Input
                  id="amount"
                  type="text"
                  value={newExpense.amount}
                  onChange={(e) => handleExpenseAmountChange(e.target.value)}
                  placeholder="0.00"
                  className="mt-1.5 border rounded-xl h-11 text-lg"
                  style={{ borderColor: '#EEEBE6', fontFamily: 'Georgia, serif' }}
                />
              </div>
              <div>
                <Label className="text-xs font-medium uppercase tracking-widest" style={{ color: '#9B9694' }}>Currency</Label>
                <Select value={newExpense.currency} onValueChange={(value: Currency) => setNewExpense({ ...newExpense, currency: value })}>
                  <SelectTrigger className="mt-1.5 border rounded-xl h-11" style={{ borderColor: '#EEEBE6' }}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {getAllCurrencies().map((currency) => (
                      <SelectItem key={currency.code} value={currency.code}>
                        <div className="flex items-center space-x-2">
                          <span>{currency.symbol}</span>
                          <span>{currency.code}</span>
                          <span className="text-xs" style={{ color: '#9B9694' }}>({currency.name})</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs font-medium uppercase tracking-widest" style={{ color: '#9B9694' }}>Category</Label>
              <div className="flex gap-2 mt-1.5">
                <Select value={newExpense.category} onValueChange={(value) => setNewExpense({ ...newExpense, category: value })}>
                  <SelectTrigger className="flex-1 border rounded-xl h-11" style={{ borderColor: '#EEEBE6' }}>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.name}>
                        <div className="flex items-center">
                          <div className="w-2.5 h-2.5 rounded-full mr-2" style={{ backgroundColor: category.color }} />
                          {category.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <button
                  onClick={() => setIsCategoryManageOpen(true)}
                  className="w-11 h-11 rounded-xl border flex items-center justify-center transition-colors hover:bg-[#FAF8F4]"
                  style={{ borderColor: '#EEEBE6' }}
                >
                  <Plus className="h-4 w-4" style={{ color: '#9B9694' }} />
                </button>
              </div>
            </div>
            <div>
              <Label className="text-xs font-medium uppercase tracking-widest" style={{ color: '#9B9694' }}>
                Note <span style={{ color: '#EEEBE6', textTransform: 'none', letterSpacing: 'normal' }}>(optional)</span>
              </Label>
              <Textarea
                id="note"
                value={newExpense.note}
                onChange={(e) => setNewExpense({ ...newExpense, note: e.target.value })}
                placeholder="Any extra details..."
                className="mt-1.5 border rounded-xl resize-none"
                style={{ borderColor: '#EEEBE6' }}
                rows={2}
              />
            </div>
            <div className="space-y-2 pt-1">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  addExpense();
                }}
                type="button"
                className="w-full h-11 rounded-xl text-white text-sm font-medium transition-opacity hover:opacity-90"
                style={{ backgroundColor: '#7C9A7E' }}
              >
                {editingExpense ? 'Update Expense' : 'Add Expense'}
              </button>
              {editingExpense && (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    if (editingExpense) deleteExpense(editingExpense.id);
                  }}
                  type="button"
                  className="w-full text-sm py-2 transition-opacity hover:opacity-60"
                  style={{ color: '#C98D8D' }}
                >
                  Delete expense
                </button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Category Management Dialog */}
      <Dialog
        open={isCategoryManageOpen}
        onOpenChange={(open) => {
          setIsCategoryManageOpen(open);
          if (!open) cancelEditingCategoryColor();
        }}
      >
        <DialogContent className="w-[95vw] max-w-md bg-white rounded-2xl border-0 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-medium" style={{ color: '#2C2C2C' }}>
              Manage Categories
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs font-medium uppercase tracking-widest" style={{ color: '#9B9694' }}>New Category</Label>
              <div className="space-y-2 mt-1.5">
                <Input
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="Category name"
                  className="border rounded-xl h-11"
                  style={{ borderColor: '#EEEBE6' }}
                />
                <div className="grid grid-cols-10 gap-1">
                  {COLOR_PALETTE.map((color) => (
                    <button
                      key={color.value}
                      onClick={() => setNewCategoryColor(color.value)}
                      className="w-8 h-8 rounded-lg transition-all"
                      style={{
                        backgroundColor: color.value,
                        outline: newCategoryColor === color.value ? `2px solid #2C2C2C` : '2px solid transparent',
                        outlineOffset: '2px',
                        transform: newCategoryColor === color.value ? 'scale(1.1)' : 'scale(1)',
                      }}
                      title={color.name}
                    />
                  ))}
                </div>
                <button
                  onClick={addCategory}
                  className="w-full h-10 rounded-xl text-white text-sm font-medium transition-opacity hover:opacity-90"
                  style={{ backgroundColor: '#7C9A7E' }}
                >
                  Add Category
                </button>
              </div>
            </div>
            <div>
              <Label className="text-xs font-medium uppercase tracking-widest" style={{ color: '#9B9694' }}>Existing</Label>
              <div className="space-y-2 mt-2 max-h-56 overflow-y-auto">
                {categories.map((category) => (
                  <div key={category.id} className="px-4 py-3 rounded-xl border" style={{ borderColor: '#EEEBE6' }}>
                    {editingCategoryId === category.id ? (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium" style={{ color: '#2C2C2C' }}>{category.name}</span>
                          <div className="flex gap-3">
                            <button
                              onClick={() => updateCategoryColor(category.id, editingCategoryColor)}
                              className="text-xs font-medium transition-opacity hover:opacity-70"
                              style={{ color: '#7C9A7E' }}
                            >
                              Save
                            </button>
                            <button
                              onClick={cancelEditingCategoryColor}
                              className="text-xs transition-opacity hover:opacity-70"
                              style={{ color: '#9B9694' }}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                        <div className="grid grid-cols-10 gap-1">
                          {COLOR_PALETTE.map((color) => (
                            <button
                              key={color.value}
                              onClick={() => setEditingCategoryColor(color.value)}
                              className="w-6 h-6 rounded transition-all"
                              style={{
                                backgroundColor: color.value,
                                outline: editingCategoryColor === color.value ? `2px solid #2C2C2C` : '2px solid transparent',
                                outlineOffset: '2px',
                              }}
                              title={color.name}
                            />
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => startEditingCategoryColor(category.id, category.color)}
                            className="w-5 h-5 rounded-full transition-transform hover:scale-110"
                            style={{ backgroundColor: category.color, outline: `2px solid #EEEBE6`, outlineOffset: '2px' }}
                            title="Click to change color"
                          />
                          <span className="text-sm" style={{ color: '#2C2C2C' }}>{category.name}</span>
                        </div>
                        <button
                          onClick={() => deleteCategory(category.id)}
                          className="transition-opacity hover:opacity-60"
                        >
                          <Trash2 className="h-3.5 w-3.5" style={{ color: '#C98D8D' }} />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Budget Edit Dialog */}
      <Dialog open={isBudgetEditOpen} onOpenChange={setIsBudgetEditOpen}>
        <DialogContent className="w-[95vw] max-w-md bg-white rounded-2xl border-0 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-medium" style={{ color: '#2C2C2C' }}>
              Budget for {getMonthName(selectedMonth)}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs font-medium uppercase tracking-widest" style={{ color: '#9B9694' }}>Monthly Budget</Label>
              <Input
                id="budget"
                type="text"
                value={editingBudget}
                onChange={(e) => handleBudgetInputChange(e.target.value)}
                placeholder="0.00"
                className="mt-1.5 border rounded-xl h-11 text-lg"
                style={{ borderColor: '#EEEBE6', fontFamily: 'Georgia, serif' }}
              />
              <p className="text-xs mt-1.5" style={{ color: '#9B9694' }}>
                Limit for {selectedMonth} in {getCurrencySymbol(userCurrency)} ({userCurrency})
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={saveBudget}
                className="flex-1 h-11 rounded-xl text-white text-sm font-medium transition-opacity hover:opacity-90"
                style={{ backgroundColor: '#7C9A7E' }}
              >
                Save Budget
              </button>
              <button
                onClick={() => setIsBudgetEditOpen(false)}
                className="flex-1 h-11 rounded-xl text-sm font-medium border transition-colors hover:bg-[#FAF8F4]"
                style={{ borderColor: '#EEEBE6', color: '#2C2C2C' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MainPage;
