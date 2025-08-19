-- Create monthly_budgets table
CREATE TABLE IF NOT EXISTS monthly_budgets (
  id SERIAL PRIMARY KEY,
  month VARCHAR(7) NOT NULL, -- Format: YYYY-MM
  budget DECIMAL(10, 2) NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one budget per month per user
  UNIQUE(month, user_id)
);

-- Create index for faster queries
CREATE INDEX idx_monthly_budgets_user_id ON monthly_budgets(user_id);
CREATE INDEX idx_monthly_budgets_month ON monthly_budgets(month);

-- Enable Row Level Security
ALTER TABLE monthly_budgets ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can only see their own budgets
CREATE POLICY "Users can view own budgets" ON monthly_budgets
  FOR SELECT USING (auth.uid() = user_id);

-- Users can create their own budgets
CREATE POLICY "Users can create own budgets" ON monthly_budgets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own budgets
CREATE POLICY "Users can update own budgets" ON monthly_budgets
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own budgets
CREATE POLICY "Users can delete own budgets" ON monthly_budgets
  FOR DELETE USING (auth.uid() = user_id);