import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Label } from './ui/label';
import { Progress } from './ui/progress';
import { Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { Plus, Wallet, TrendingUp, PieChart, Trash2 } from 'lucide-react';
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

const COLORS = ['#8B5CF6', '#06B6D4', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#8B5A2B', '#6B7280'];

const DEFAULT_CATEGORIES: Omit<Category, 'id' | 'user_id'>[] = [
  { name: 'Food & Dining', color: '#8B5CF6' },
  { name: 'Transportation', color: '#06B6D4' },
  { name: 'Shopping', color: '#10B981' },
  { name: 'Entertainment', color: '#F59E0B' },
  { name: 'Bills & Utilities', color: '#EF4444' },
  { name: 'Healthcare', color: '#EC4899' },
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
    note: ''
  });
  const [newCategoryName, setNewCategoryName] = useState('');
  const [monthlyBudget] = useState(1000);
  const [loading, setLoading] = useState(true);

  // Toast replacement - simple alert for now
  const toast = (options: { title: string; description: string; variant?: string }) => {
    alert(`${options.title}: ${options.description}`);
  };

  // Load data from Supabase
  useEffect(() => {
    if (session?.user?.id) {
      loadUserData();
    }
  }, [session?.user?.id]);

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
        const transformedCategories: Category[] = data.map((category: any) => ({
          id: category.id.toString(),
          name: category.name || 'Unknown',
          color: category.color || '#8B5CF6',
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
    if (!newExpense.amount || !newExpense.category || !newExpense.name) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    const currentDate = new Date();
    const dateString = currentDate.toISOString().split('T')[0];
    const monthString = currentDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });

    // Find the selected category to get its color
    const selectedCat = categories.find(cat => cat.name === newExpense.category);

    const spendingRecord = {
      user_id: session.user.id,
      categories: {
        name: newExpense.category,
        color: selectedCat?.color || '#8B5CF6'
      },
      spendings: {
        amount: parseFloat(newExpense.amount),
        name: newExpense.name,
        note: newExpense.note || '',
        date: dateString,
        month: monthString
      },
      monthly_spending: {
        month: monthString,
        total: parseFloat(newExpense.amount)
      },
      category_breakdown: null
    };

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
    setNewExpense({
      amount: '',
      category: '',
      name: '',
      note: ''
    });
    setIsAddExpenseOpen(false);
    
    toast({
      title: "Success!",
      description: "Expense added successfully",
    });
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

  const getCategoryData = () => {
    const categoryTotals = categories.map(category => {
      const total = expenses
        .filter(expense => expense.category === category.name)
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

    // Get last 5 months
    const months = [];
    const now = new Date();
    for (let i = 4; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
      months.push(monthName);
    }

    return months.map(month => ({
      month: month.split(' ')[0], // Just the month name
      total: monthlyTotals[month] || 0
    }));
  };

  const currentMonth = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
  const currentMonthSpent = expenses
    .filter(expense => expense.month === currentMonth)
    .reduce((sum, expense) => sum + expense.amount, 0);

  const budgetProgress = (currentMonthSpent / monthlyBudget) * 100;

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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-lg">Loading your spending data...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 p-4 pb-20">
      {/* Header with user info and sign out */}
      <div className="max-w-4xl mx-auto mb-6">
        <Card className="shadow-lg">
          <CardContent className="p-4">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                  Spending Tracker
                </h1>
                <p className="text-gray-600">Welcome, {session?.user?.email}!</p>
              </div>
              <Button 
                onClick={() => supabase.auth.signOut()}
                className="bg-red-500 hover:bg-red-600 text-white"
              >
                Sign Out
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="max-w-4xl mx-auto space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm">This Month's Spending</p>
                  <p className="text-2xl font-bold">${currentMonthSpent.toFixed(2)} / ${monthlyBudget}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-blue-200" />
              </div>
              <div className="mt-4">
                <Progress value={budgetProgress} className="h-2 bg-blue-400" />
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
                  <p className="text-purple-100 text-sm">Top Category</p>
                  <p className="text-lg font-bold">{displayedCategory?.name || 'No data'}</p>
                  <p className="text-purple-200 text-sm">${displayedCategory?.value?.toFixed(2) || '0.00'}</p>
                </div>
                <PieChart className="h-8 w-8 text-purple-200" />
              </div>
              <div className="h-32">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={20}
                      outerRadius={50}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {categoryData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.name === (selectedCategory || categoryData[0]?.name) ? entry.color : '#9CA3AF'} 
                        />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <p className="text-purple-100 text-xs text-center mt-2">Click to cycle categories</p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Expenses */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Recent Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            {expenses.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Wallet className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No expenses yet. Start tracking by adding your first expense!</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {expenses.slice(0, 10).map((expense) => {
                  const category = categories.find(cat => cat.name === expense.category);
                  return (
                    <div key={expense.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div 
                          className="w-4 h-4 rounded-full" 
                          style={{ backgroundColor: category?.color || '#gray' }}
                        />
                        <div>
                          <p className="font-medium">{expense.name}</p>
                          <p className="text-sm text-gray-500">
                            {expense.category} • {expense.date}
                            {expense.note && <span className="ml-2 text-gray-400">({expense.note})</span>}
                          </p>
                        </div>
                      </div>
                      <p className="font-bold text-lg">${expense.amount.toFixed(2)}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Monthly Spending - Horizontal */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-center">Monthly Spending</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={getMonthlyData()} layout="horizontal" margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis 
                  dataKey="month" 
                  type="category"
                  fontSize={12}
                />
                <Tooltip formatter={(value) => [`$${value}`, 'Total']} />
                <Bar dataKey="total" fill="#8B5CF6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Floating Add Button */}
      <Dialog open={isAddExpenseOpen} onOpenChange={setIsAddExpenseOpen}>
        <DialogTrigger asChild>
          <Button 
            className="fixed bottom-6 right-6 h-14 w-14 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 z-50"
            size="icon"
          >
            <Plus className="h-6 w-6" />
          </Button>
        </DialogTrigger>
        <DialogContent className="w-[95vw] max-w-md bg-gradient-to-br from-purple-50 to-blue-50 border-0 shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              Add New Expense
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
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
                            className="w-3 h-3 rounded-full mr-2" 
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
            <Button 
              onClick={addExpense} 
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
            >
              Add Expense
            </Button>
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
                        className="w-3 h-3 rounded-full mr-2" 
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