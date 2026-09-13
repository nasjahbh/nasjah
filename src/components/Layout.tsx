import { useState, useEffect } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  Home, ShoppingBag, Layers, Receipt, TrendingUp, 
  LogOut, Plus, ChevronLeft, Calendar,
  Instagram, User, Sparkles, RefreshCw, Cloud
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';
import { syncWithServer, getCloudData, EVENT_DATA_UPDATED } from '../lib/dataService';
import NasjahLogo from './NasjahLogo';
import { PWAInstallButton } from './PWAInstallButton';

export default function Layout() {
  const [pendingOrdersCount, setPendingOrdersCount] = useState(0);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [totalSales, setTotalSales] = useState(0);
  const [userEmail, setUserEmail] = useState<string>('');
  const [isSyncingData, setIsSyncingData] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleManualSync = async () => {
    if (isSyncingData) return;
    setIsSyncingData(true);
    try {
      await syncWithServer();
      updateBadges();
    } finally {
      setTimeout(() => setIsSyncingData(false), 500);
    }
  };

  useEffect(() => {
    if (supabase) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user?.email) {
          setUserEmail(session.user.email);
        }
      });
    }
  }, []);

  // Load badge and summary data purely from cloud state
  const updateBadges = () => {
    try {
      const { orders, inventory } = getCloudData();
      const pending = orders.filter((o: any) => o.status === 'قيد التجهيز' || !o.status).length;
      setPendingOrdersCount(pending);
      const sales = orders.reduce((sum: number, o: any) => sum + (o.total || o.price || 0), 0);
      setTotalSales(sales);

      const lowStock = inventory.filter((f: any) => (Number(f.quantity) || 0) <= 2).length;
      setLowStockCount(lowStock);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    updateBadges();
    syncWithServer().then(() => updateBadges());

    const handleUpdate = () => updateBadges();
    window.addEventListener(EVENT_DATA_UPDATED, handleUpdate);
    const interval = setInterval(updateBadges, 4000);

    return () => {
      window.removeEventListener(EVENT_DATA_UPDATED, handleUpdate);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
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
      badgeColor: 'bg-[#C7B895] text-[#1D3A30]'
    },
    { 
      name: 'المخزون', 
      path: '/inventory', 
      icon: Layers,
      badge: lowStockCount > 0 ? '!' : null,
      badgeColor: 'bg-amber-600 text-white'
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
      default: return 'دار نَسْجَة';
    }
  };

  const todayFormatted = new Date().toLocaleDateString('ar-BH', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  return (
    <div className="fixed inset-0 h-[100dvh] w-full overflow-hidden bg-[#FAF7F0] text-[#1D3A30] font-sans flex flex-col select-none" dir="rtl">
      
      {/* ========================================================================= */}
      {/* 1. DESKTOP & TABLET TOP HEADER BAR (md: and up)                           */}
      {/* ========================================================================= */}
      <header className="hidden md:flex h-16 bg-[#1D3A30] text-[#FAF7F0] px-5 lg:px-8 items-center justify-between border-b border-[#C7B895]/25 shadow-md flex-shrink-0 z-30">
        {/* Brand Logo & Title */}
        <div className="flex items-center gap-3">
          <NasjahLogo variant="emblem" size="sm" className="ring-1 ring-[#C7B895]/40" />
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-base tracking-wider text-[#FAF7F0]">دار نَسْجَة</span>
              <span className="text-[10px] bg-[#C7B895]/20 text-[#E8D5A8] border border-[#C7B895]/30 px-1.5 py-0.2 rounded font-bold">
                فاخر
              </span>
            </div>
            <p className="text-[11px] text-[#C7B895] font-medium hidden lg:block">
              خياطة وتفصيل الأقمشة الراقية
            </p>
          </div>
        </div>

        {/* Center Page Tabs */}
        <nav className="flex items-center gap-1 bg-[#25493D]/70 p-1.5 rounded-2xl border border-[#C7B895]/30 shadow-inner">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all relative",
                  isActive 
                    ? "bg-[#1D3A30] text-[#E8D5A8] shadow-xs border border-[#C7B895]/40" 
                    : "text-[#FAF7F0]/75 hover:text-white hover:bg-[#25493D]/50"
                )}
              >
                <Icon className={cn("w-4 h-4", isActive ? "text-[#E8D5A8]" : "text-[#C7B895]")} />
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

        {/* Right Actions: Sync, Date, Instagram, Logout */}
        <div className="flex items-center gap-2.5">
          {/* Cloud Storage Status Indicator */}
          <div 
            className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 bg-[#25493D]/60 text-[#E8D5A8] rounded-xl border border-[#C7B895]/25 text-[11px] font-bold"
            title="جميع البيانات والعمليات مخزنة سحابياً ومؤمنة"
          >
            <Cloud className="w-3.5 h-3.5 text-[#C7B895]" />
            <span>سحابي</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
          </div>

          <button
            onClick={handleManualSync}
            disabled={isSyncingData}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#25493D] hover:bg-[#2E584A] text-[#E8D5A8] rounded-xl border border-[#C7B895]/30 text-xs font-bold transition active:scale-95 disabled:opacity-75"
            title="مزامنة مع قاعدة البيانات السحابية"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", isSyncingData && "animate-spin text-white")} />
            <span className="hidden xl:inline">{isSyncingData ? 'جارِ المزامنة...' : 'مزامنة'}</span>
          </button>

          <div className="hidden lg:flex items-center gap-1.5 text-xs text-[#E8D5A8] bg-[#25493D]/40 px-3 py-1.5 rounded-xl border border-[#C7B895]/20">
            <Calendar className="w-3.5 h-3.5 text-[#C7B895]" />
            <span className="font-medium text-[11px]">{todayFormatted}</span>
          </div>

          <a
            href="https://instagram.com/nasjah.bh"
            target="_blank"
            rel="noreferrer"
            className="w-8.5 h-8.5 flex items-center justify-center rounded-xl bg-[#25493D] hover:bg-[#2E584A] text-[#E8D5A8] transition border border-[#C7B895]/30"
            title="حساب إنستغرام @nasjah.bh"
          >
            <Instagram className="w-4 h-4" />
          </a>

          <PWAInstallButton />

          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 px-3 py-1.5 rounded-xl text-xs font-bold transition border border-rose-800/40 active:scale-95"
            title="تسجيل الخروج"
          >
            <LogOut className="w-3.5 h-3.5 text-rose-400" />
            <span className="hidden sm:inline">خروج</span>
          </button>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 2. MOBILE APP HEADER (Visible ONLY on mobile < md, width < 768px)         */}
      {/* ========================================================================= */}
      <header className="flex md:hidden h-14 bg-[#1D3A30] text-[#FAF7F0] px-3.5 items-center justify-between flex-shrink-0 z-30 shadow-sm border-b border-[#C7B895]/20">
        <div className="flex items-center gap-2.5">
          <NasjahLogo variant="emblem" size="sm" />
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-sm tracking-wider text-[#FAF7F0]">نَسْجَة</span>
              <span className="text-[9px] bg-[#C7B895]/20 text-[#E8D5A8] border border-[#C7B895]/30 px-1.5 py-0.2 rounded font-bold">
                فاخر
              </span>
            </div>
            <p className="text-[10px] text-[#C7B895] font-medium">
              {getPageTitle()}
            </p>
          </div>
        </div>

        {/* Mobile Header Actions (Sync, Instagram, PWA, Logout) - No side menu needed! */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleManualSync}
            disabled={isSyncingData}
            className="w-8.5 h-8.5 flex items-center justify-center rounded-xl bg-[#25493D] hover:bg-[#2E584A] text-[#E8D5A8] transition border border-[#C7B895]/30 active:scale-95 disabled:opacity-75"
            title="مزامنة مع قاعدة البيانات السحابية"
          >
            <RefreshCw className={cn("w-4 h-4", isSyncingData && "animate-spin text-[#FAF7F0]")} />
          </button>
          
          <a
            href="https://instagram.com/nasjah.bh"
            target="_blank"
            rel="noreferrer"
            className="w-8.5 h-8.5 flex items-center justify-center rounded-xl bg-[#25493D] hover:bg-[#2E584A] text-[#E8D5A8] transition border border-[#C7B895]/30 active:scale-95"
            title="حساب إنستغرام @nasjah.bh"
          >
            <Instagram className="w-4 h-4" />
          </a>

          <PWAInstallButton className="py-1 px-2 text-[10px] hidden sm:flex" />

          <button
            onClick={handleLogout}
            className="w-8.5 h-8.5 flex items-center justify-center rounded-xl bg-rose-950/50 hover:bg-rose-900/60 text-rose-300 transition border border-rose-800/40 active:scale-95"
            title="تسجيل الخروج"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 3. SCROLLABLE VIEWPORT CONTENT                                            */}
      {/* ========================================================================= */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden p-3.5 sm:p-5 lg:p-8 pb-24 md:pb-8 relative no-scrollbar bg-[#FAF7F0]">
        <div className="max-w-7xl mx-auto w-full">
          <Outlet />
        </div>
      </main>

      {/* ========================================================================= */}
      {/* 4. MOBILE BOTTOM NAVIGATION BAR (Direct access to all 5 pages)            */}
      {/* ========================================================================= */}
      <div className="flex md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-xl border-t border-[#C7B895]/30 shadow-[0_-4px_25px_rgba(29,58,48,0.09)] px-1.5 py-1.5 pb-[max(0.6rem,env(safe-area-inset-bottom))]">
        <nav className="w-full flex items-center justify-around">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;

            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "relative flex flex-col items-center justify-center flex-1 py-1.5 px-0.5 rounded-xl transition-all duration-150 active:scale-95",
                  isActive 
                    ? "text-[#1D3A30] font-bold" 
                    : "text-[#1D3A30]/55 hover:text-[#1D3A30] font-medium"
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="mobileBottomIndicator"
                    className="absolute inset-0 bg-[#E8D5A8]/45 rounded-xl -z-10 border border-[#C7B895]/40 shadow-xs"
                    transition={{ type: "spring", stiffness: 450, damping: 32 }}
                  />
                )}
                <div className="relative">
                  <Icon className={cn("w-5 h-5 transition-transform", isActive && "scale-105 text-[#1D3A30]")} />
                  {item.badge && (
                    <span className={cn(
                      "absolute -top-1.5 -right-2 text-[9px] font-bold min-w-[15px] h-[15px] flex items-center justify-center rounded-full px-0.5 shadow-xs",
                      item.badgeColor
                    )}>
                      {item.badge}
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-bold mt-1 tracking-tight leading-none truncate max-w-full">
                  {item.name}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>

    </div>
  );
}
