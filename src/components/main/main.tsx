import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Label } from './ui/label';
import { Progress } from './ui/progress';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { Plus, Wallet, TrendingUp, PieChartIcon, Trash2, ChevronLeft, ChevronRight, Calendar, Search, Filter, X } from 'lucide-react';
import { Textarea } from './ui/textarea';

interface MainPageProps {
  session: any; // Replace with proper Session type from Supabase
  supabase: any; // Replace with proper Supabase client type
}

interface Expense {
  id: string;
  amount: number;
  category: string;
  name: string;
  note?: string;
  date: string;
  month: string;
  user_id: string;
}

interface Category {
  id: string;
  name: string;
  color: string;
  user_id: string;
}

const COLORS = ['#FFFFFF', '#FEF3C7', '#D1FAE5', '#DBEAFE', '#FCE7F3', '#F3E8FF', '#F0F9FF', '#F9FAFB'];

const DEFAULT_CATEGORIES: Omit<Category, 'id' | 'user_id'>[] = [
  { name: 'Food & Dining', color: '#FFFFFF' },
  { name: 'Transportation', color: '#FEF3C7' },
  { name: 'Shopping', color: '#D1FAE5' },
  { name: 'Entertainment', color: '#DBEAFE' },
  { name: 'Bills & Utilities', color: '#FCE7F3' },
  { name: 'Healthcare', color: '#F3E8FF' },
];

const MainPage: React.FC<MainPageProps> = ({ session, supabase }) => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [isCategoryManageOpen, setIsCategoryManageOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [newExpense, setNewExpense] = useState({
    amount: '',
    category: '',
    name: '',
    note: '',
    month: ''
  });
  const [newCategoryName, setNewCategoryName] = useState('');
  const [monthlyBudget] = useState(1000);
  const [loading, setLoading] = useState(true);
  const [monthOffset, setMonthOffset] = useState(0);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>(''); // New state for selected month
  
  // New state for filtering and searching
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'name' | 'category'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Toast replacement - simple alert for now
  const toast = (options: { title: string; description: string; variant?: string }) => {
    alert(`${options.title}: ${options.description}`);
  };

  // Helper function to get current month string
  const getCurrentMonth = () => {
    const currentDate = new Date();
    return currentDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
  };

  // Load data from Supabase
  useEffect(() => {
    if (session?.user?.id) {
      loadUserData();
    }
  }, [session?.user?.id]);

  // Set current month when component mounts
  useEffect(() => {
    const currentMonth = getCurrentMonth();
    setNewExpense(prev => ({ ...prev, month: currentMonth }));
    setSelectedMonth(currentMonth); // Set selected month to current month
  }, []);

  const loadUserData = async () => {
    try {
      setLoading(true);
      await Promise.all([loadExpenses(), loadCategories()]);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Error",
        description: "Failed to load data from database",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadExpenses = async () => {
    const { data, error } = await supabase
      .from('spending')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading expenses:', error);
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
          category: category.name || 'Unknown',
          name: spending.name || 'Unknown Transaction',
          note: spending.note || '',
          date: spending.date || new Date().toISOString().split('T')[0],
          month: spending.month || new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long' }),
          user_id: record.user_id
        };
      });

    setExpenses(transformedExpenses);
  };

  const loadCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('user_id', session.user.id);

      if (error) {
        console.error('Error loading categories:', error);
        return;
      }

      if (!data || data.length === 0) {
        // If no categories exist, create default ones
        await createDefaultCategories();
      } else {
        // Remove duplicates by name before setting categories
        const uniqueCategories = data.reduce((acc: any[], category: any) => {
          const exists = acc.find(cat => cat.name === category.name);
          if (!exists) {
            acc.push(category);
          }
          return acc;
        }, []);
        
        const transformedCategories: Category[] = uniqueCategories.map((category: any) => ({
          id: category.id.toString(),
          name: category.name || 'Unknown',
          color: category.color || '#FFFFFF',
          user_id: category.user_id
        }));
        setCategories(transformedCategories);
      }
    } catch (error) {
      console.error('Error in loadCategories:', error);
      // Fallback to creating default categories
      await createDefaultCategories();
    }
  };

  const createDefaultCategories = async () => {
    const defaultCategoriesWithUser = DEFAULT_CATEGORIES.map((category) => ({
      name: category.name,
      color: category.color,
      user_id: session.user.id
    }));

    const { data, error } = await supabase
      .from('categories')
      .insert(defaultCategoriesWithUser)
      .select();

    if (error) {
      console.error('Error creating default categories:', error);
      // Fallback to local categories
      const fallbackCategories = DEFAULT_CATEGORIES.map((cat, index) => ({
        id: (Date.now() + index).toString(),
        name: cat.name,
        color: cat.color,
        user_id: session.user.id
      }));
      setCategories(fallbackCategories);
    } else {
      const transformedCategories: Category[] = data.map((category: any) => ({
        id: category.id.toString(),
        name: category.name,
        color: category.color,
        user_id: category.user_id
      }));
      setCategories(transformedCategories);
    }
  };

  const addExpense = async () => {
    console.log('Add expense called with:', newExpense); // Debug log
    
    if (!newExpense.amount || !newExpense.category || !newExpense.name || !newExpense.month) {
      console.log('Validation failed:', { 
        amount: newExpense.amount, 
        category: newExpense.category, 
        name: newExpense.name, 
        month: newExpense.month 
      }); // Debug log
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    try {
      // Create date based on selected month (first day of the month)
      const selectedDate = new Date(newExpense.month + ' 1');
      const dateString = selectedDate.toISOString().split('T')[0];
      const monthString = newExpense.month;

      // Find the selected category to get its color
      const selectedCat = categories.find(cat => cat.name === newExpense.category);

      if (editingExpense) {
        // Update existing expense
        const updatedRecord = {
          categories: {
            name: newExpense.category,
            color: selectedCat?.color || '#FFFFFF'
          },
          spendings: {
            amount: parseFloat(newExpense.amount),
            name: newExpense.name,
            note: newExpense.note || '',
            date: dateString,
            month: monthString
          }
        };

        const { data, error } = await supabase
          .from('spending')
          .update(updatedRecord)
          .eq('id', editingExpense.id)
          .eq('user_id', session.user.id)
          .select()
          .single();

        if (error) {
          console.error('Error updating expense:', error);
          toast({
            title: "Error",
            description: "Failed to update expense in database",
            variant: "destructive"
          });
          return;
        }

        // Update local state
        const updatedExpense: Expense = {
          ...editingExpense,
          amount: parseFloat(newExpense.amount),
          category: newExpense.category,
          name: newExpense.name,
          note: newExpense.note || '',
          date: dateString,
          month: monthString
        };

        setExpenses(expenses.map(exp => exp.id === editingExpense.id ? updatedExpense : exp));
      } else {
        // Add new expense
        const spendingRecord = {
          user_id: session.user.id,
          categories: {
            name: newExpense.category,
            color: selectedCat?.color || '#FFFFFF'
          },
          spendings: {
            amount: parseFloat(newExpense.amount),
            name: newExpense.name,
            note: newExpense.note || '',
            date: dateString,
            month: monthString
          }
        };

        console.log('Inserting record:', spendingRecord); // Debug log

        const { data, error } = await supabase
          .from('spending')
          .insert(spendingRecord)
          .select()
          .single();

        if (error) {
          console.error('Error adding expense:', error);
          toast({
            title: "Error",
            description: "Failed to add expense to database",
            variant: "destructive"
          });
          return;
        }

        console.log('Insert successful:', data); // Debug log

        // Add to local state
        const newExpenseRecord: Expense = {
          id: data.id,
          amount: parseFloat(newExpense.amount),
          category: newExpense.category,
          name: newExpense.name,
          note: newExpense.note || '',
          date: dateString,
          month: monthString,
          user_id: session.user.id
        };

        setExpenses([newExpenseRecord, ...expenses]);
      }

      // Reset form
      const currentMonth = getCurrentMonth();
      setNewExpense({
        amount: '',
        category: '',
        name: '',
        note: '',
        month: currentMonth
      });
      setEditingExpense(null);
      setIsAddExpenseOpen(false);
    } catch (error) {
      console.error('Exception in addExpense:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive"
      });
    }
  };

  const deleteExpense = async (expenseId: string) => {
    try {
      const { error } = await supabase
        .from('spending')
        .delete()
        .eq('id', expenseId)
        .eq('user_id', session.user.id);

      if (error) {
        console.error('Error deleting expense:', error);
        toast({
          title: "Error",
          description: "Failed to delete expense from database",
          variant: "destructive"
        });
        return;
      }

      // Remove from local state
      setExpenses(expenses.filter(exp => exp.id !== expenseId));
      
      // Close the dialog
      handleCloseDialog();
      
      toast({
        title: "Success!",
        description: "Expense deleted successfully",
      });
    } catch (error) {
      console.error('Exception in deleteExpense:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive"
      });
    }
  };

  const addCategory = async () => {
    if (!newCategoryName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a category name",
        variant: "destructive"
      });
      return;
    }

    const newCategoryData = {
      name: newCategoryName.trim(),
      color: COLORS[categories.length % COLORS.length],
      user_id: session.user.id
    };

    const { data, error } = await supabase
      .from('categories')
      .insert(newCategoryData)
      .select()
      .single();

    if (error) {
      console.error('Error adding category:', error);
      toast({
        title: "Error",
        description: "Failed to add category to database",
        variant: "destructive"
      });
      return;
    }

    const newCategory: Category = {
      id: data.id.toString(),
      name: data.name,
      color: data.color,
      user_id: data.user_id
    };

    setCategories([...categories, newCategory]);
    setNewCategoryName('');
    toast({
      title: "Success!",
      description: "Category added successfully",
    });
  };

  const deleteCategory = async (categoryId: string) => {
    const categoryToDelete = categories.find(cat => cat.id === categoryId);
    if (!categoryToDelete) return;

    // Check if any expenses use this category
    const hasExpenses = expenses.some(expense => expense.category === categoryToDelete.name);
    if (hasExpenses) {
      toast({
        title: "Cannot Delete",
        description: "This category is being used by existing expenses",
        variant: "destructive"
      });
      return;
    }

    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', parseInt(categoryId))
      .eq('user_id', session.user.id);

    if (error) {
      console.error('Error deleting category:', error);
      toast({
        title: "Error",
        description: "Failed to delete category from database",
        variant: "destructive"
      });
      return;
    }

    setCategories(categories.filter(cat => cat.id !== categoryId));
    toast({
      title: "Success!",
      description: "Category deleted successfully",
    });
  };

  const getAvailableMonths = () => {
    const months = [];
    const currentDate = new Date();
    
    // Add previous 6 months
    for (let i = 6; i >= 1; i--) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const monthName = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
      months.push(monthName);
    }
    
    // Add current month and next 6 months
    for (let i = 0; i <= 6; i++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() + i, 1);
      const monthName = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
      months.push(monthName);
    }
    
    return months;
  };

  const handleEditExpense = (expense: Expense) => {
    setEditingExpense(expense);
    setNewExpense({
      amount: expense.amount.toString(),
      category: expense.category,
      name: expense.name,
      note: expense.note || '',
      month: expense.month
    });
    setIsAddExpenseOpen(true);
  };

  const handleCloseDialog = () => {
    setIsAddExpenseOpen(false);
    setEditingExpense(null);
    const currentMonth = getCurrentMonth();
    setNewExpense({
      amount: '',
      category: '',
      name: '',
      note: '',
      month: currentMonth
    });
  };

  // Updated to filter by selected month
  const getCategoryData = () => {
    const categoryTotals = categories.map(category => {
      const total = expenses
        .filter(expense => expense.category === category.name && expense.month === selectedMonth)
        .reduce((sum, expense) => sum + expense.amount, 0);
      return {
        name: category.name,
        value: total,
        color: category.color
      };
    }).filter(item => item.value > 0).sort((a, b) => b.value - a.value);

    return categoryTotals;
  };

  const getMonthlyData = () => {
    const monthlyTotals = expenses.reduce((acc, expense) => {
      const month = expense.month;
      acc[month] = (acc[month] || 0) + expense.amount;
      return acc;
    }, {} as Record<string, number>);

    // Get 5 months starting from current month + offset
    const months = [];
    const now = new Date();
    for (let i = 0; i < 5; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() + monthOffset + i, 1);
      const monthName = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
      months.push(monthName);
    }

    return months.map(month => ({
      month: month.split(' ')[0], // Just the month name
      fullMonth: month, // Keep full month for data lookup
      amount: monthlyTotals[month] || 0
    }));
  };

  // Updated to use selected month
  const getSelectedMonthSpent = () => {
    return expenses
      .filter(expense => expense.month === selectedMonth)
      .reduce((sum, expense) => sum + expense.amount, 0);
  };

  // New function to get filtered and searched expenses for the selected month
  const getFilteredExpenses = () => {
    let filteredExpenses = expenses.filter(expense => expense.month === selectedMonth);

    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filteredExpenses = filteredExpenses.filter(expense => 
        expense.name.toLowerCase().includes(searchLower) ||
        expense.category.toLowerCase().includes(searchLower) ||
        expense.amount.toString().includes(searchTerm) ||
        (expense.note && expense.note.toLowerCase().includes(searchLower))
      );
    }

    // Apply category filter
    if (filterCategory !== 'all') {
      filteredExpenses = filteredExpenses.filter(expense => expense.category === filterCategory);
    }

    // Apply sorting
    filteredExpenses.sort((a, b) => {
      let aValue: any = a[sortBy];
      let bValue: any = b[sortBy];

      if (sortBy === 'amount') {
        aValue = a.amount;
        bValue = b.amount;
      } else if (sortBy === 'date') {
        aValue = new Date(a.date);
        bValue = new Date(b.date);
      } else {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filteredExpenses;
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchTerm('');
    setFilterCategory('all');
    setSortBy('date');
    setSortOrder('desc');
  };

  // Helper function to get month name only (e.g., "May" from "May 2025")
  const getMonthName = (fullMonth: string) => {
    return fullMonth.split(' ')[0];
  };

  // Helper function to check if selected month is current month
  const isCurrentMonth = () => {
    return selectedMonth === getCurrentMonth();
  };

  const selectedMonthSpent = getSelectedMonthSpent();
  const budgetProgress = (selectedMonthSpent / monthlyBudget) * 100;

  const categoryData = getCategoryData();
  const displayedCategory = selectedCategory 
    ? categoryData.find(cat => cat.name === selectedCategory) || categoryData[0]
    : categoryData[0];

  const handlePieChartClick = () => {
    if (categoryData.length === 0) return;
    
    const currentIndex = categoryData.findIndex(cat => cat.name === (selectedCategory || categoryData[0]?.name));
    const nextIndex = (currentIndex + 1) % categoryData.length;
    setSelectedCategory(categoryData[nextIndex].name);
  };

  const filteredExpenses = getFilteredExpenses();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-lg">Loading your spending data...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white p-4 pb-20">

      <div className="max-w-4xl mx-auto space-y-6">


        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm">
                    {isCurrentMonth() ? "This Month's Spending" : `${getMonthName(selectedMonth)}'s Spending`}
                  </p>
                  <p className="text-2xl font-bold">${selectedMonthSpent.toFixed(2)} / ${monthlyBudget}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-blue-200" />
              </div>
              <div className="mt-4">
                <div className="relative h-2 bg-blue-400 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-white transition-all duration-300 ease-in-out"
                    style={{ width: `${Math.min(budgetProgress, 100)}%` }}
                  />
                </div>
                <p className="text-blue-100 text-xs mt-1">
                  {budgetProgress > 100 ? 'Over budget' : `${(100 - budgetProgress).toFixed(0)}% remaining`}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white border-0 shadow-lg cursor-pointer" onClick={handlePieChartClick}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-purple-100 text-sm font-medium">
                    {isCurrentMonth() ? "Category Breakdown" : `${getMonthName(selectedMonth)}'s Categories`}
                  </p>
                  <div className="flex items-center space-x-2 mt-1">
                    <p className="text-lg font-semibold text-white">{displayedCategory?.name || 'No data'}</p>
                    {displayedCategory && selectedMonthSpent > 0 && (
                      <span className="text-sm text-purple-200 bg-purple-400/30 px-2 py-1 rounded">
                        {Math.round((displayedCategory.value / selectedMonthSpent) * 100)}%
                      </span>
                    )}
                  </div>
                </div>
                <PieChartIcon className="h-5 w-5 text-purple-200" />
              </div>
              <div className="h-48 relative">
                {categoryData.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-purple-200 text-sm">
                    No spending data for {getMonthName(selectedMonth)}
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={2}
                        dataKey="value"
                        stroke="none"
                      >
                        {categoryData.map((entry, index) => {
                          const isSelected = entry.name === (selectedCategory || categoryData[0]?.name);
                          return (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={entry.color} 
                              stroke="#8B5CF6" 
                              strokeWidth={1}
                              style={{
                                filter: isSelected ? 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))' : 'none',
                                transform: isSelected ? 'scale(1.05)' : 'scale(1)',
                                transformOrigin: 'center',
                                transition: 'all 0.2s ease-in-out'
                              }}
                            />
                          );
                        })}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                )}
                {/* Center content - show selected category amount */}
                {categoryData.length > 0 && displayedCategory && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <p className="text-2xl font-bold text-white">${displayedCategory.value.toFixed(0)}</p>
                    <p className="text-xs text-purple-200">{displayedCategory.name}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Enhanced Expenses Section with Search and Filters */}
        <Card className="shadow-lg">
          <CardHeader>
            <div className="flex flex-col space-y-4">
              <CardTitle>
                {isCurrentMonth() ? "All Expenses" : `${getMonthName(selectedMonth)}'s Expenses`}
              </CardTitle>
              
              {/* Search and Filter Controls */}
              <div className="flex flex-col sm:flex-row gap-4">
                {/* Search Bar */}
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search by name, category, amount, or note..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-10"
                  />
                  {searchTerm && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSearchTerm('')}
                      className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>

                {/* Category Filter */}
                <Select value={filterCategory} onValueChange={setFilterCategory}>
                  <SelectTrigger className="w-full sm:w-48">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Filter by category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.name}>
                        <div className="flex items-center">
                          <div 
                            className="w-3 h-3 rounded-full mr-2 border border-gray-300" 
                            style={{ backgroundColor: category.color }}
                          />
                          {category.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Sort Options */}
                <div className="flex gap-2">
                  <Select value={sortBy} onValueChange={(value: 'date' | 'amount' | 'name' | 'category') => setSortBy(value)}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="date">Date</SelectItem>
                      <SelectItem value="amount">Amount</SelectItem>
                      <SelectItem value="name">Name</SelectItem>
                      <SelectItem value="category">Category</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                    className="px-3"
                  >
                    {sortOrder === 'asc' ? '↑' : '↓'}
                  </Button>
                </div>

                {/* Clear Filters Button */}
                {(searchTerm || filterCategory !== 'all' || sortBy !== 'date' || sortOrder !== 'desc') && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearFilters}
                    className="whitespace-nowrap"
                  >
                    Clear Filters
                  </Button>
                )}
              </div>

              {/* Results Summary */}
              <div className="text-sm text-gray-600">
                Showing {filteredExpenses.length} of {expenses.filter(e => e.month === selectedMonth).length} expenses
                {searchTerm && ` matching "${searchTerm}"`}
                {filterCategory !== 'all' && ` in ${filterCategory}`}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredExpenses.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Wallet className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>
                  {expenses.filter(e => e.month === selectedMonth).length === 0 
                    ? (isCurrentMonth() 
                        ? "No expenses yet. Start tracking by adding your first expense!" 
                        : `No expenses recorded for ${getMonthName(selectedMonth)}.`)
                    : "No expenses match your current filters."
                  }
                </p>
                {(searchTerm || filterCategory !== 'all') && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearFilters}
                    className="mt-2"
                  >
                    Clear Filters
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {filteredExpenses.map((expense) => {
                  const category = categories.find(cat => cat.name === expense.category);
                  return (
                    <div 
                      key={expense.id} 
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                      onClick={() => handleEditExpense(expense)}
                    >
                      <div className="flex items-center space-x-3">
                        <div 
                          className="w-4 h-4 rounded-full border border-gray-300" 
                          style={{ backgroundColor: category?.color || '#FFFFFF' }}
                        />
                        <div>
                          <p className="font-medium">{expense.name}</p>
                          <p className="text-sm text-gray-500">
                            {expense.category}
                            {expense.note && <span className="ml-2 text-gray-400">({expense.note})</span>}
                          </p>
                          <p className="text-xs text-gray-400">
                            {new Date(expense.date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <p className="text-lg font-semibold">${expense.amount.toFixed(2)}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Monthly Spending Chart - Now serves as Month Selector */}
        <Card className="shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-center flex-1">
                Monthly Spending Overview
              </CardTitle>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setMonthOffset(monthOffset - 1)}
                  className="h-8 w-8 p-0"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setMonthOffset(monthOffset + 1)}
                  className="h-8 w-8 p-0"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart 
                data={getMonthlyData()} 
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(value) => `${value}`} />
                <Tooltip 
                  formatter={(value) => [`${value}`, 'Amount']} 
                  labelFormatter={(label, payload) => {
                    const data = payload?.[0]?.payload;
                    return data?.fullMonth || label;
                  }}
                />
                <Bar 
                  dataKey="amount" 
                  radius={[4, 4, 0, 0]}
                  style={{ cursor: 'pointer' }}
                  onClick={(data) => {
                    if (data && data.fullMonth) {
                      setSelectedMonth(data.fullMonth);
                    }
                  }}
                >
                  {getMonthlyData().map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.fullMonth === selectedMonth ? "#6366F1" : "#8B5CF6"}
                      stroke={entry.fullMonth === selectedMonth ? "#4338CA" : "none"}
                      strokeWidth={entry.fullMonth === selectedMonth ? 2 : 0}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <p className="text-sm text-gray-500 text-center mt-2">
              Click on any bar to select that month and view its data above
            </p>
          </CardContent>
        </Card>

        {/* Sign Out Button */}
        <div className="flex justify-center mt-6">
          <Button 
            onClick={() => supabase.auth.signOut()}
            className="bg-red-400 text-white"
          >
            Sign Out
          </Button>
        </div>
      </div>

      {/* Floating Add Button */}
      <Button 
        onClick={(e) => {
          console.log('Floating button clicked!'); // Debug log
          e.stopPropagation();
          setIsAddExpenseOpen(true);
        }}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 z-[9999]"
        size="icon"
      >
        <Plus className="h-6 w-6" />
      </Button>

      <Dialog open={isAddExpenseOpen} onOpenChange={handleCloseDialog}>
        <DialogContent className="w-[95vw] max-w-md bg-gradient-to-br from-purple-50 to-blue-50 shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              {editingExpense ? 'Edit Expense' : 'Add New Expense'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="month" className="text-sm font-medium text-gray-700">Month</Label>
              <Select value={newExpense.month} onValueChange={(value) => setNewExpense({...newExpense, month: value})}>
                <SelectTrigger className="mt-1 border-purple-200 focus:border-purple-400 focus:ring-purple-400">
                  <SelectValue placeholder="Select month" />
                </SelectTrigger>
                <SelectContent className="bg-white max-h-48 overflow-y-auto">
                  {getAvailableMonths().map((month) => (
                    <SelectItem key={month} value={month}>
                      {month}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="name" className="text-sm font-medium text-gray-700">Transaction Name</Label>
              <Input
                id="name"
                value={newExpense.name}
                onChange={(e) => setNewExpense({...newExpense, name: e.target.value})}
                placeholder="What did you buy?"
                className="mt-1 border-purple-200 focus:border-purple-400 focus:ring-purple-400"
              />
            </div>
            <div>
              <Label htmlFor="amount" className="text-sm font-medium text-gray-700">Amount ($)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={newExpense.amount}
                onChange={(e) => setNewExpense({...newExpense, amount: e.target.value})}
                placeholder="0.00"
                className="mt-1 border-purple-200 focus:border-purple-400 focus:ring-purple-400"
              />
            </div>
            <div>
              <Label htmlFor="category" className="text-sm font-medium text-gray-700">Category</Label>
              <div className="flex gap-2 mt-1">
                <Select value={newExpense.category} onValueChange={(value) => setNewExpense({...newExpense, category: value})}>
                  <SelectTrigger className="flex-1 border-purple-200 focus:border-purple-400 focus:ring-purple-400">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.name}>
                        <div className="flex items-center">
                          <div 
                            className="w-3 h-3 rounded-full mr-2 border border-gray-300" 
                            style={{ backgroundColor: category.color }}
                          />
                          {category.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setIsCategoryManageOpen(true)}
                  className="border-purple-200 hover:bg-purple-50"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div>
              <Label htmlFor="note" className="text-sm font-medium text-gray-700">Note (optional)</Label>
              <Textarea
                id="note"
                value={newExpense.note}
                onChange={(e) => setNewExpense({...newExpense, note: e.target.value})}
                placeholder="Additional details..."
                className="mt-1 border-purple-200 focus:border-purple-400 focus:ring-purple-400"
                rows={2}
              />
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={(e) => {
                  e.preventDefault();
                  console.log('Button clicked!'); // Debug log
                  addExpense();
                }} 
                type="button"
                className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
              >
                {editingExpense ? 'Update Expense' : 'Add Expense'}
              </Button>
              {editingExpense && (
                <Button 
                  onClick={(e) => {
                    e.preventDefault();
                    if (editingExpense) {
                      deleteExpense(editingExpense.id);
                    }
                  }} 
                  type="button"
                  variant="outline"
                  size="icon"
                  className="border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Category Management Dialog */}
      <Dialog open={isCategoryManageOpen} onOpenChange={setIsCategoryManageOpen}>
        <DialogContent className="w-[95vw] max-w-md bg-gradient-to-br from-purple-50 to-blue-50 border-0 shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              Manage Categories
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="newCategory" className="text-sm font-medium text-gray-700">Add New Category</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  id="newCategory"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="Category name"
                  className="flex-1 border-purple-200 focus:border-purple-400 focus:ring-purple-400"
                />
                <Button 
                  onClick={addCategory}
                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
                >
                  Add
                </Button>
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-700">Existing Categories</Label>
              <div className="space-y-2 mt-2 max-h-48 overflow-y-auto">
                {categories.map((category) => (
                  <div key={category.id} className="flex items-center justify-between p-2 bg-white rounded-lg border border-purple-100">
                    <div className="flex items-center">
                      <div 
                        className="w-3 h-3 rounded-full mr-2 border border-gray-300" 
                        style={{ backgroundColor: category.color }}
                      />
                      <span className="text-sm">{category.name}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteCategory(category.id)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MainPage;