import { useState, useEffect } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  Home, ShoppingBag, Layers, Receipt, TrendingUp, 
  Menu, X, LogOut, Plus, ChevronLeft, Calendar,
  Instagram, PlusCircle, ArrowUpRight
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export default function Layout() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [pendingOrdersCount, setPendingOrdersCount] = useState(0);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [totalSales, setTotalSales] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();

  // Load badge and summary data
  const updateBadges = () => {
    try {
      const orders = JSON.parse(localStorage.getItem('ordersData') || '[]');
      const pending = orders.filter((o: any) => o.status === 'قيد التجهيز' || !o.status).length;
      setPendingOrdersCount(pending);
      const sales = orders.reduce((sum: number, o: any) => sum + (o.total || o.price || 0), 0);
      setTotalSales(sales);

      const inventory = JSON.parse(localStorage.getItem('inventory') || '[]');
      const lowStock = inventory.filter((f: any) => (Number(f.quantity) || 0) <= 2).length;
      setLowStockCount(lowStock);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    updateBadges();
    const interval = setInterval(updateBadges, 3000);
    return () => clearInterval(interval);
  }, []);

  // Close menu on route change
  useEffect(() => {
    setIsMenuOpen(false);
    updateBadges();
  }, [location.pathname]);

  const handleLogout = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    navigate('/login');
  };

  const navItems = [
    { name: 'الرئيسية', path: '/', icon: Home },
    { 
      name: 'الطلبات', 
      path: '/orders', 
      icon: ShoppingBag,
      badge: pendingOrdersCount > 0 ? pendingOrdersCount : null,
      badgeColor: 'bg-amber-500 text-white'
    },
    { 
      name: 'المخزون', 
      path: '/inventory', 
      icon: Layers,
      badge: lowStockCount > 0 ? '!' : null,
      badgeColor: 'bg-red-500 text-white'
    },
    { name: 'المصروفات', path: '/expenses', icon: Receipt },
    { name: 'الميزانية', path: '/budget', icon: TrendingUp },
  ];

  const getPageTitle = () => {
    switch (location.pathname) {
      case '/': return 'لوحة التحكم الرئيسية';
      case '/orders': return 'الطلبات والمبيعات';
      case '/inventory': return 'المخزون والأقمشة';
      case '/expenses': return 'سجل المصروفات';
      case '/budget': return 'الميزانية والأرباح';
      default: return 'نَسْجَة';
    }
  };

  const todayFormatted = new Date().toLocaleDateString('ar-BH', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  return (
    <div className="fixed inset-0 h-[100dvh] w-full overflow-hidden bg-[#f4f7f5] text-emerald-950 font-sans flex flex-col lg:flex-row select-none" dir="rtl">
      
      {/* ========================================================================= */}
      {/* 1. DESKTOP PERMANENT SIDEBAR (Visible on lg: screens and up, width >= 1024px) */}
      {/* ========================================================================= */}
      <aside className="hidden lg:flex flex-col w-64 xl:w-72 bg-emerald-950 text-emerald-50 border-l border-emerald-900/50 shadow-xl z-20 flex-shrink-0 justify-between p-5 h-full">
        <div>
          {/* Atelier Brand Header */}
          <div className="flex items-center gap-3 pb-5 border-b border-emerald-900/60 mb-6">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-amber-400 p-0.5 shadow-md flex items-center justify-center flex-shrink-0">
              <div className="w-full h-full bg-emerald-950 rounded-[14px] flex items-center justify-center text-amber-300 font-black text-lg">
                ن
              </div>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-base tracking-wider uppercase text-emerald-100">NASJAH</span>
                <span className="text-[10px] bg-emerald-800 text-amber-300 px-1.5 py-0.2 rounded font-mono font-bold">
                  PRO
                </span>
              </div>
              <p className="text-[11px] text-emerald-400 font-medium truncate">
                أتيليه وتفصيل الأقمشة
              </p>
            </div>
          </div>

          {/* Desktop Nav Items */}
          <nav className="space-y-1.5">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              const Icon = item.icon;

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "flex items-center justify-between px-3.5 py-3 rounded-2xl transition-all duration-200 text-xs font-bold group",
                    isActive 
                      ? "bg-gradient-to-l from-emerald-800/90 to-emerald-900 text-amber-300 shadow-md border border-emerald-700/40" 
                      : "text-emerald-300/80 hover:bg-emerald-900/60 hover:text-white"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={cn("w-4 h-4 transition-transform group-hover:scale-110", isActive ? "text-amber-300" : "text-emerald-400")} />
                    <span className="text-xs">{item.name}</span>
                  </div>
                  {item.badge && (
                    <span className={cn(
                      "text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs",
                      item.badgeColor
                    )}>
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Quick Shortcuts for Desktop */}
          <div className="mt-8 pt-5 border-t border-emerald-900/60">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400/80 block mb-2.5">
              إجراءات سريعة
            </span>
            <div className="space-y-2">
              <Link
                to="/orders"
                className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-emerald-900/50 hover:bg-emerald-900 text-emerald-100 text-xs font-semibold border border-emerald-800/40 transition"
              >
                <div className="flex items-center gap-2">
                  <PlusCircle className="w-3.5 h-3.5 text-amber-400" />
                  <span>تسجيل طلب جديد</span>
                </div>
                <ArrowUpRight className="w-3 h-3 text-emerald-400" />
              </Link>
              <Link
                to="/expenses"
                className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-emerald-900/50 hover:bg-emerald-900 text-emerald-100 text-xs font-semibold border border-emerald-800/40 transition"
              >
                <div className="flex items-center gap-2">
                  <PlusCircle className="w-3.5 h-3.5 text-red-400" />
                  <span>تسجيل مصروف جديد</span>
                </div>
                <ArrowUpRight className="w-3 h-3 text-emerald-400" />
              </Link>
            </div>
          </div>
        </div>

        {/* Desktop Sidebar Footer */}
        <div className="pt-4 border-t border-emerald-900/60 space-y-2.5">
          <div className="p-3 bg-emerald-900/40 rounded-2xl border border-emerald-800/30">
            <div className="flex justify-between items-center text-[10px] text-emerald-400">
              <span>إجمالي المبيعات</span>
              <span className="font-bold text-amber-300 font-mono">+{totalSales.toFixed(2)} د.ب</span>
            </div>
            <div className="flex justify-between items-center text-[10px] text-emerald-400 mt-1">
              <span>طلبات قيد التجهيز</span>
              <span className="font-bold text-white font-mono">{pendingOrdersCount} طلب</span>
            </div>
          </div>

          <a
            href="https://instagram.com/nasjah.bh"
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-between px-3 py-2 rounded-xl text-xs text-emerald-300 bg-emerald-900/30 hover:bg-emerald-900/60 transition"
          >
            <div className="flex items-center gap-2">
              <Instagram className="w-3.5 h-3.5 text-amber-300" />
              <span className="text-[11px]">@nasjah.bh</span>
            </div>
            <ArrowUpRight className="w-3 h-3 opacity-60" />
          </a>

          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 w-full px-3 py-2 text-red-300 hover:bg-red-950/50 hover:text-red-200 rounded-xl transition text-xs font-semibold"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>تسجيل الخروج</span>
          </button>
        </div>
      </aside>

      {/* ========================================================================= */}
      {/* 2. TABLET TOP BAR (Visible on md to < lg screens, 768px - 1023px)         */}
      {/* ========================================================================= */}
      <header className="hidden md:flex lg:hidden h-16 bg-emerald-950 text-emerald-50 px-5 items-center justify-between border-b border-emerald-900/50 shadow-md flex-shrink-0 z-30">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-amber-400 p-0.5 flex items-center justify-center">
            <div className="w-full h-full bg-emerald-950 rounded-[10px] flex items-center justify-center text-amber-300 font-bold text-sm">
              ن
            </div>
          </div>
          <span className="font-extrabold text-sm tracking-wider uppercase text-emerald-100">NASJAH</span>
        </div>

        {/* Tablet Horizontal Nav Tabs */}
        <nav className="flex items-center gap-1 bg-emerald-900/60 p-1 rounded-2xl border border-emerald-800/40">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition relative",
                  isActive 
                    ? "bg-emerald-800 text-amber-300 shadow-xs" 
                    : "text-emerald-300/80 hover:text-white hover:bg-emerald-900/40"
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.name}</span>
                {item.badge && (
                  <span className={cn("text-[9px] font-bold px-1.5 py-0.2 rounded-full", item.badgeColor)}>
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Tablet Quick Action & Logout */}
        <div className="flex items-center gap-2">
          <Link
            to="/orders"
            className="bg-amber-400 text-emerald-950 px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-amber-300 transition flex items-center gap-1 shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>طلب جديد</span>
          </Link>
          <button
            onClick={handleLogout}
            className="p-2 text-emerald-300 hover:text-red-300 rounded-xl hover:bg-emerald-900 transition"
            title="تسجيل الخروج"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 3. MOBILE APP HEADER (Visible ONLY on mobile < md, width < 768px)         */}
      {/* ========================================================================= */}
      <header className="flex md:hidden h-14 bg-emerald-950 text-emerald-50 px-4 items-center justify-between flex-shrink-0 z-30 shadow-md border-b border-emerald-900/40">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-amber-400 p-0.5 shadow-sm flex items-center justify-center">
            <div className="w-full h-full bg-emerald-950 rounded-[10px] flex items-center justify-center text-amber-300 font-bold text-sm">
              ن
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-sm tracking-wider uppercase text-emerald-100">NASJAH</span>
              <span className="text-[10px] bg-emerald-800/80 text-amber-300 px-1.5 py-0.2 rounded font-mono">
                PRO
              </span>
            </div>
            <p className="text-[10px] text-emerald-400/80 font-medium">
              {getPageTitle()}
            </p>
          </div>
        </div>

        {/* Mobile Hamburger Drawer Trigger */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setIsMenuOpen(true)}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-emerald-900/80 hover:bg-emerald-800 text-emerald-200 transition border border-emerald-800/40 active:scale-95"
            aria-label="القائمة"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* MAIN VIEWPORT WRAPPER (Desktop Topbar + Unified Responsive Scroll Content) */}
      {/* ========================================================================= */}
      <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
        
        {/* Desktop Top Header Bar (lg: and above) */}
        <div className="hidden lg:flex h-16 bg-white border-b border-emerald-900/10 px-8 items-center justify-between shadow-xs flex-shrink-0 z-10">
          <div>
            <h1 className="text-base font-extrabold text-emerald-950">{getPageTitle()}</h1>
            <p className="text-[11px] text-emerald-800/60 font-medium">
              لوحة التحكم والإدارة الذكية لأتيليه نَسْجَة
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-xs text-emerald-800/70 bg-emerald-50 px-3.5 py-1.5 rounded-xl border border-emerald-900/10">
              <Calendar className="w-4 h-4 text-emerald-700" />
              <span className="font-medium">{todayFormatted}</span>
            </div>

            {lowStockCount > 0 && (
              <Link 
                to="/inventory"
                className="text-xs bg-amber-50 text-amber-800 border border-amber-200 px-3 py-1.5 rounded-xl font-bold hover:bg-amber-100 transition"
              >
                تنبيه: {lowStockCount} أقمشة قاربت على النفاد
              </Link>
            )}

            <Link
              to="/orders"
              className="bg-emerald-900 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-emerald-800 transition flex items-center gap-1.5 shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>طلب جديد</span>
            </Link>
          </div>
        </div>

        {/* Tablet Top Info Strip (md: and above, below lg) */}
        <div className="hidden md:flex lg:hidden bg-white border-b border-emerald-900/10 px-6 py-2.5 items-center justify-between text-xs flex-shrink-0">
          <span className="font-bold text-emerald-950">{getPageTitle()}</span>
          <span className="text-[11px] text-emerald-800/60">{todayFormatted}</span>
        </div>

        {/* Scrollable Viewport Content */}
        {/* Mobile: pb-20 for bottom navigation. Tablet/Desktop: pb-8, full width fluid */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-3.5 sm:p-5 lg:p-8 pb-24 md:pb-8 relative no-scrollbar">
          <div className="max-w-7xl mx-auto w-full">
            <Outlet />
          </div>
        </main>
      </div>

      {/* ========================================================================= */}
      {/* 4. MOBILE FIXED BOTTOM NAVIGATION BAR (Visible ONLY on mobile < md)       */}
      {/* ========================================================================= */}
      <nav className="flex md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white/95 backdrop-blur-md border-t border-emerald-900/10 px-2 items-center justify-around z-30 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;

          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "relative flex flex-col items-center justify-center w-14 py-1.5 rounded-2xl transition-all duration-200 active:scale-90",
                isActive 
                  ? "text-emerald-900 font-bold" 
                  : "text-emerald-800/50 hover:text-emerald-900 font-medium"
              )}
            >
              {/* Active Indicator background pill */}
              {isActive && (
                <motion.div
                  layoutId="mobileBottomNavIndicator"
                  className="absolute inset-0 bg-emerald-100/90 rounded-2xl -z-10 shadow-sm border border-emerald-200/60"
                  transition={{ type: "spring", stiffness: 450, damping: 30 }}
                />
              )}

              <div className="relative">
                <Icon className={cn("w-5 h-5 transition-transform", isActive && "scale-110 text-emerald-900 stroke-[2.2px]")} />
                
                {/* Badge */}
                {item.badge && (
                  <span className={cn(
                    "absolute -top-1.5 -right-2 text-[9px] font-bold min-w-[15px] h-[15px] flex items-center justify-center rounded-full px-0.5 shadow-sm ring-1 ring-white",
                    item.badgeColor
                  )}>
                    {item.badge}
                  </span>
                )}
              </div>

              <span className={cn("text-[10px] mt-1 tracking-tight leading-none", isActive ? "text-emerald-950 font-bold" : "text-emerald-800/70")}>
                {item.name}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* ========================================================================= */}
      {/* 5. MOBILE SLIDE-OVER DRAWER MENU (Visible ONLY on mobile < md)            */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {isMenuOpen && (
          <div className="md:hidden fixed inset-0 z-50">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMenuOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-xs"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 260 }}
              className="absolute top-0 right-0 bottom-0 w-72 bg-emerald-950 text-emerald-50 shadow-2xl flex flex-col justify-between p-5 border-l border-emerald-900/50"
            >
              <div>
                {/* Header in Drawer */}
                <div className="flex justify-between items-center pb-4 border-b border-emerald-900/60 mb-5">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-amber-400 text-emerald-950 font-black flex items-center justify-center text-sm">
                      ن
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-emerald-100">نَسْجَة • NASJAH</h3>
                      <p className="text-[10px] text-emerald-400">إدارة الأتيليه والمبيعات</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setIsMenuOpen(false)}
                    className="p-1.5 rounded-lg bg-emerald-900 text-emerald-300 hover:text-white"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Navigation Links */}
                <div className="space-y-1">
                  {navItems.map((item) => {
                    const isActive = location.pathname === item.path;
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={() => setIsMenuOpen(false)}
                        className={cn(
                          "flex items-center justify-between px-3.5 py-3 rounded-xl transition text-xs font-semibold",
                          isActive 
                            ? "bg-emerald-800 text-amber-300 shadow-sm" 
                            : "text-emerald-200 hover:bg-emerald-900/70"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <Icon className="w-4 h-4" />
                          <span>{item.name}</span>
                        </div>
                        {item.badge && (
                          <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded-full", item.badgeColor)}>
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>

                {/* Quick Shortcuts */}
                <div className="mt-6 pt-5 border-t border-emerald-900/60">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-400/70 mb-2">
                    اختصارات سريعة
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <Link
                      to="/orders"
                      onClick={() => setIsMenuOpen(false)}
                      className="bg-emerald-900/60 hover:bg-emerald-900 p-2.5 rounded-xl text-center border border-emerald-800/40 text-emerald-100 text-xs font-medium"
                    >
                      + طلب جديد
                    </Link>
                    <Link
                      to="/expenses"
                      onClick={() => setIsMenuOpen(false)}
                      className="bg-emerald-900/60 hover:bg-emerald-900 p-2.5 rounded-xl text-center border border-emerald-800/40 text-emerald-100 text-xs font-medium"
                    >
                      + مصروف جديد
                    </Link>
                  </div>
                </div>
              </div>

              {/* Drawer Footer */}
              <div className="pt-4 border-t border-emerald-900/60 space-y-2">
                <a
                  href="https://instagram.com/nasjah.bh"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between px-3 py-2 rounded-xl text-xs text-emerald-300 bg-emerald-900/40 hover:bg-emerald-900"
                >
                  <span>حساب إنستغرام @nasjah.bh</span>
                  <ChevronLeft className="w-4 h-4" />
                </a>

                <button 
                  onClick={handleLogout}
                  className="flex items-center gap-2.5 w-full px-3.5 py-2.5 text-red-300 hover:bg-red-950/40 hover:text-red-200 rounded-xl transition text-xs font-medium"
                >
                  <LogOut className="w-4 h-4" />
                  <span>تسجيل الخروج</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
