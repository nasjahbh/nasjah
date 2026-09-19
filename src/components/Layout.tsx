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
      // Ensure any service worker caches or stale files are bypassed and page is refreshed
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          await registration.update().catch(() => {});
        }
      }
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name))).catch(() => {});
      }
      // Force reload from server bypassing browser cache
      window.location.reload();
    } catch {
      window.location.reload();
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
      const sales = orders
        .filter((o: any) => o.paymentStatus !== 'قيد الدفع')
        .reduce((sum: number, o: any) => sum + (o.total || o.price || 0), 0);
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
      case '/': return '';
      case '/orders': return 'الطلبات والمبيعات';
      case '/inventory': return 'المخزون والأقمشة';
      case '/expenses': return 'سجل المصروفات';
      case '/budget': return 'الميزانية والأرباح';
      default: return '';
    }
  };

  const pageTitle = getPageTitle();
  const isStaticPage = location.pathname === '/' || location.pathname === '/budget';

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
      <header className="hidden md:flex h-15 bg-[#1D3A30] text-[#FAF7F0] px-5 lg:px-8 items-center justify-between border-b border-[#C7B895]/25 shadow-md flex-shrink-0 z-30">
        {/* Brand Logo & Title */}
        <div className="flex items-center gap-3">
          <NasjahLogo variant="emblem" size="sm" className="ring-1 ring-[#C7B895]/40" />
          <div className="flex items-center">
            <span className="font-extrabold text-base tracking-wider text-[#FAF7F0] font-sans">
              &apos;نَسْجَة&apos;
            </span>
          </div>
        </div>

        {/* Current Active Page Title Indicator on Desktop & Tablet (hidden on main dashboard) */}
        {pageTitle ? (
          <div className="flex items-center gap-2 bg-[#25493D]/60 px-4 py-1.5 rounded-2xl border border-[#C7B895]/30 shadow-inner">
            <span className="w-2 h-2 rounded-full bg-[#C7B895]" />
            <span className="text-xs font-extrabold text-[#E8D5A8]">{pageTitle}</span>
          </div>
        ) : <div />}

        {/* Right Actions: Sync, Date, Instagram, PWA, Logout */}
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
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#25493D] hover:bg-[#2E584A] text-[#E8D5A8] rounded-xl border border-[#C7B895]/30 text-xs font-bold transition active:scale-95 disabled:opacity-75 cursor-pointer"
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
            className="w-8.5 h-8.5 flex items-center justify-center rounded-xl bg-[#25493D] hover:bg-[#2E584A] text-[#E8D5A8] transition border border-[#C7B895]/30 cursor-pointer"
            title="حساب إنستغرام @nasjah.bh"
          >
            <Instagram className="w-4 h-4" />
          </a>

          <PWAInstallButton />

          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 px-3 py-1.5 rounded-xl text-xs font-bold transition border border-rose-800/40 active:scale-95 cursor-pointer"
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
            <div className="flex items-center">
              <span className="font-extrabold text-sm tracking-wider text-[#FAF7F0] font-sans">
                &apos;نَسْجَة&apos;
              </span>
            </div>
            {pageTitle ? (
              <p className="text-[10px] text-[#C7B895] font-medium">
                {pageTitle}
              </p>
            ) : null}
          </div>
        </div>

        {/* Mobile Header Actions (Sync, Instagram, PWA, Logout) */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleManualSync}
            disabled={isSyncingData}
            className="w-8.5 h-8.5 flex items-center justify-center rounded-xl bg-[#25493D] hover:bg-[#2E584A] text-[#E8D5A8] transition border border-[#C7B895]/30 active:scale-95 disabled:opacity-75 cursor-pointer"
            title="مزامنة مع قاعدة البيانات السحابية"
          >
            <RefreshCw className={cn("w-4 h-4", isSyncingData && "animate-spin text-[#FAF7F0]")} />
          </button>
          
          <a
            href="https://instagram.com/nasjah.bh"
            target="_blank"
            rel="noreferrer"
            className="w-8.5 h-8.5 flex items-center justify-center rounded-xl bg-[#25493D] hover:bg-[#2E584A] text-[#E8D5A8] transition border border-[#C7B895]/30 active:scale-95 cursor-pointer"
            title="حساب إنستغرام @nasjah.bh"
          >
            <Instagram className="w-4 h-4" />
          </a>

          <PWAInstallButton />

          <button
            onClick={handleLogout}
            className="w-8.5 h-8.5 flex items-center justify-center rounded-xl bg-rose-950/50 hover:bg-rose-900/60 text-rose-300 transition border border-rose-800/40 active:scale-95 cursor-pointer"
            title="تسجيل الخروج"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 3. MAIN VIEWPORT CONTENT (Static on Home & Budget, Scrollable on Others) */}
      {/* ========================================================================= */}
      <main className={cn(
        "flex-1 p-2 sm:p-3 lg:p-4 relative bg-[#FAF7F0] flex flex-col",
        isStaticPage 
          ? "overflow-hidden pb-16 sm:pb-18 lg:pb-20 no-scrollbar" 
          : "overflow-y-auto pb-24 sm:pb-28"
      )}>
        <div className={cn(
          "max-w-7xl mx-auto w-full flex-1 flex flex-col min-h-0",
          isStaticPage && "overflow-hidden"
        )}>
          <Outlet />
        </div>
      </main>

      {/* ========================================================================= */}
      {/* 4. UNIVERSAL BOTTOM NAVIGATION BAR (Desktop, Tablet & Mobile)            */}
      {/* ========================================================================= */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-xl border-t border-[#C7B895]/30 shadow-[0_-4px_25px_rgba(29,58,48,0.09)] px-2 sm:px-6 py-2 pb-[max(0.6rem,env(safe-area-inset-bottom))]">
        <nav className="w-full max-w-4xl mx-auto flex items-center justify-around gap-1 sm:gap-3">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;

            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "relative flex flex-col sm:flex-row items-center justify-center flex-1 py-1.5 sm:py-2.5 px-1 sm:px-4 rounded-2xl transition-all duration-150 active:scale-95 cursor-pointer gap-1 sm:gap-2",
                  isActive 
                    ? "text-[#1D3A30] font-bold" 
                    : "text-[#1D3A30]/60 hover:text-[#1D3A30] hover:bg-[#FAF7F0] font-medium"
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="universalBottomIndicator"
                    className="absolute inset-0 bg-[#E8D5A8]/45 rounded-2xl -z-10 border border-[#C7B895]/40 shadow-xs"
                    transition={{ type: "spring", stiffness: 450, damping: 32 }}
                  />
                )}
                <div className="relative flex items-center justify-center">
                  <Icon className={cn("w-5 h-5 sm:w-5.5 sm:h-5.5 transition-transform", isActive && "scale-105 text-[#1D3A30]")} />
                  {item.badge && (
                    <span className={cn(
                      "absolute -top-1.5 -right-2 text-[9px] font-bold min-w-[15px] h-[15px] flex items-center justify-center rounded-full px-0.5 shadow-xs",
                      item.badgeColor
                    )}>
                      {item.badge}
                    </span>
                  )}
                </div>
                <span className="text-[10px] sm:text-xs font-bold mt-0.5 sm:mt-0 tracking-tight leading-none truncate max-w-full">
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
