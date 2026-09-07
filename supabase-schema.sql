-- ==========================================================
-- دار نَسْجة (Nasjah) - سكربت إنشاء جداول قاعدة بيانات Supabase
-- قم بنسخ هذا الكود بالكامل ولصقه في:
-- Supabase Dashboard -> SQL Editor -> New query -> Run
-- ==========================================================

-- 1. جدول الطلبات (Orders)
CREATE TABLE IF NOT EXISTS public.orders (
    id TEXT PRIMARY KEY,
    user_id UUID DEFAULT auth.uid(),
    customer_name TEXT NOT NULL,
    phone TEXT DEFAULT '',
    details TEXT DEFAULT '',
    price NUMERIC DEFAULT 0,
    total NUMERIC DEFAULT 0,
    status TEXT DEFAULT 'قيد التجهيز',
    payment_method TEXT DEFAULT 'بنفت بي',
    delivery_method TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    created_at_ms BIGINT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. جدول المصروفات (Expenses)
CREATE TABLE IF NOT EXISTS public.expenses (
    id TEXT PRIMARY KEY,
    user_id UUID DEFAULT auth.uid(),
    description TEXT NOT NULL,
    amount NUMERIC DEFAULT 0,
    category TEXT DEFAULT 'أقمشة ومواد خام',
    payment_method TEXT DEFAULT 'بنفت بي',
    paid_to TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    created_at_ms BIGINT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. جدول المخزون والأقمشة (Inventory)
CREATE TABLE IF NOT EXISTS public.inventory (
    id TEXT PRIMARY KEY,
    user_id UUID DEFAULT auth.uid(),
    name TEXT NOT NULL,
    quantity NUMERIC DEFAULT 0,
    price NUMERIC DEFAULT 0,
    category TEXT DEFAULT '',
    image_url TEXT DEFAULT '',
    barcode TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- تفعيل حماية أمان مستوى الصفوف (Row Level Security - RLS)
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;

-- سياسات الأمان: السماح للمستخدم المسجل فقط بالتحكم ببياناته
DROP POLICY IF EXISTS "Users can manage their own orders" ON public.orders;
CREATE POLICY "Users can manage their own orders" ON public.orders
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage their own expenses" ON public.expenses;
CREATE POLICY "Users can manage their own expenses" ON public.expenses
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage their own inventory" ON public.inventory;
CREATE POLICY "Users can manage their own inventory" ON public.inventory
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
