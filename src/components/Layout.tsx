import { useState, useEffect } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  Home, ShoppingBag, Layers, Receipt, TrendingUp, 
  Menu, X, LogOut, Plus, ChevronLeft, Calendar,
  Instagram, ArrowUpRight, User, Sparkles,
  RefreshCw, PackagePlus
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { syncWithServer, EVENT_DATA_UPDATED } from '../lib/dataService';
import NasjahLogo from './NasjahLogo';
import { PWAInstallButton } from './PWAInstallButton';

export default function Layout() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
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
      setTimeout(() => setIsSyncingData(false), 700);
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
    syncWithServer().then(() => updateBadges());

    const handleUpdate = () => updateBadges();
    window.addEventListener(EVENT_DATA_UPDATED, handleUpdate);
    const interval = setInterval(updateBadges, 4000);

    return () => {
      window.removeEventListener(EVENT_DATA_UPDATED, handleUpdate);
      clearInterval(interval);
    };
  }, []);

  // Close menu on route change
  useEffect(() => {
    setIsMenuOpen(false);
    setIsQuickAddOpen(false);
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
    <div className="fixed inset-0 h-[100dvh] w-full overflow-hidden bg-[#FAF7F0] text-[#1D3A30] font-sans flex flex-col lg:flex-row select-none" dir="rtl">
      
      {/* ========================================================================= */}
      {/* 1. DESKTOP PERMANENT SIDEBAR (lg: screens and up, width >= 1024px)        */}
      {/* ========================================================================= */}
      <aside className="hidden lg:flex flex-col w-64 xl:w-72 bg-[#1D3A30] text-[#FAF7F0] border-l border-[#C7B895]/20 shadow-2xl z-20 flex-shrink-0 justify-between p-5 h-full">
        <div>
          {/* Atelier Brand Header */}
          <div className="flex items-center gap-3 pb-5 border-b border-[#C7B895]/20 mb-6">
            <NasjahLogo variant="emblem" size="md" className="flex-shrink-0 ring-1 ring-[#C7B895]/40" />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-base tracking-wider text-[#FAF7F0]">نَسْجَة</span>
                <span className="text-[10px] bg-[#C7B895]/20 text-[#E8D5A8] border border-[#C7B895]/30 px-1.5 py-0.5 rounded font-bold">
                  فاخر
                </span>
              </div>
              <p className="text-[11px] text-[#C7B895] font-medium truncate">
                دار تفصيل وخياطة الأقمشة
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
                    "flex items-center justify-between px-3.5 py-3 rounded-2xl transition-all duration-200 text-xs font-bold group relative",
                    isActive 
                      ? "bg-[#25493D] text-[#E8D5A8] shadow-md border border-[#C7B895]/40" 
                      : "text-[#FAF7F0]/70 hover:bg-[#25493D]/60 hover:text-white"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={cn("w-4 h-4 transition-transform group-hover:scale-110", isActive ? "text-[#E8D5A8]" : "text-[#C7B895]")} />
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
          <div className="mt-8 pt-5 border-t border-[#C7B895]/20">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#C7B895] block mb-2.5">
              إجراءات فورية
            </span>
            <div className="space-y-2">
              <Link
                to="/orders"
                className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-[#25493D]/50 hover:bg-[#25493D] text-[#FAF7F0] text-xs font-semibold border border-[#C7B895]/20 transition"
              >
                <div className="flex items-center gap-2">
                  <Plus className="w-3.5 h-3.5 text-[#E8D5A8]" />
                  <span>تسجيل طلب جديد</span>
                </div>
                <ArrowUpRight className="w-3 h-3 text-[#C7B895]" />
              </Link>
              <Link
                to="/inventory"
                className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-[#25493D]/50 hover:bg-[#25493D] text-[#FAF7F0] text-xs font-semibold border border-[#C7B895]/20 transition"
              >
                <div className="flex items-center gap-2">
                  <PackagePlus className="w-3.5 h-3.5 text-[#C7B895]" />
                  <span>إضافة قماش للمخزون</span>
                </div>
                <ArrowUpRight className="w-3 h-3 text-[#C7B895]" />
              </Link>
            </div>
          </div>
        </div>

        {/* Desktop Sidebar Footer */}
        <div className="pt-4 border-t border-[#C7B895]/20 space-y-2.5">
          <div className="p-3 bg-[#25493D]/40 rounded-2xl border border-[#C7B895]/20">
            <div className="flex justify-between items-center text-[10px] text-[#C7B895]">
              <span>إجمالي المبيعات</span>
              <span className="font-bold text-[#E8D5A8] font-mono">+{totalSales.toFixed(2)} د.ب</span>
            </div>
            <div className="flex justify-between items-center text-[10px] text-[#C7B895] mt-1">
              <span>طلبات قيد التجهيز</span>
              <span className="font-bold text-[#FAF7F0] font-mono">{pendingOrdersCount} طلب</span>
            </div>
          </div>

          <a
            href="https://instagram.com/nasjah.bh"
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-between px-3 py-2 rounded-xl text-xs text-[#C7B895] bg-[#25493D]/30 hover:bg-[#25493D]/60 transition"
          >
            <div className="flex items-center gap-2">
              <Instagram className="w-3.5 h-3.5 text-[#E8D5A8]" />
              <span className="text-[11px]">@nasjah.bh</span>
            </div>
            <ArrowUpRight className="w-3 h-3 opacity-60" />
          </a>

          <button 
            onClick={handleLogout}
            className="flex items-center justify-between w-full px-3 py-2.5 text-rose-300 hover:text-white bg-rose-950/30 hover:bg-rose-900/50 rounded-xl transition text-xs font-bold border border-rose-900/40 active:scale-95"
            title="تسجيل الخروج والعودة لشاشة تسجيل الدخول"
          >
            <div className="flex items-center gap-2">
              <LogOut className="w-3.5 h-3.5 text-rose-400" />
              <span>تسجيل الخروج</span>
            </div>
            <span className="text-[10px] bg-rose-900/60 px-2 py-0.5 rounded-md text-rose-200">
              خروج
            </span>
          </button>
        </div>
      </aside>

      {/* ========================================================================= */}
      {/* 2. TABLET TOP BAR (md to < lg screens, 768px - 1023px)                    */}
      {/* ========================================================================= */}
      <header className="hidden md:flex lg:hidden h-16 bg-[#1D3A30] text-[#FAF7F0] px-5 items-center justify-between border-b border-[#C7B895]/20 shadow-md flex-shrink-0 z-30">
        <div className="flex items-center gap-3">
          <NasjahLogo variant="emblem" size="sm" />
          <span className="font-extrabold text-sm tracking-wider text-[#FAF7F0]">نَسْجَة</span>
        </div>

        <nav className="flex items-center gap-1 bg-[#25493D]/60 p-1 rounded-2xl border border-[#C7B895]/20">
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
                    ? "bg-[#1D3A30] text-[#E8D5A8] shadow-xs border border-[#C7B895]/30" 
                    : "text-[#FAF7F0]/70 hover:text-white hover:bg-[#25493D]/40"
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

        <div className="flex items-center gap-2">
          <PWAInstallButton />
          <Link
            to="/orders"
            className="bg-[#E8D5A8] text-[#1D3A30] px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-[#FAF6EC] transition flex items-center gap-1 shadow-xs border border-[#C7B895]"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>طلب جديد</span>
          </Link>
          <button
            onClick={handleLogout}
            className="p-2 text-[#C7B895] hover:text-rose-300 rounded-xl hover:bg-[#25493D] transition"
            title="تسجيل الخروج"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 3. MOBILE APP HEADER (Visible ONLY on mobile < md, width < 768px)         */}
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

        {/* Mobile Actions: Sync, PWA, Menu */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleManualSync}
            disabled={isSyncingData}
            className="w-8 h-8 flex items-center justify-center rounded-xl bg-[#25493D] hover:bg-[#2E584A] text-[#E8D5A8] transition border border-[#C7B895]/30 active:scale-95 disabled:opacity-75"
            title="مزامنة مع قاعدة البيانات السحابية"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", isSyncingData && "animate-spin text-[#FAF7F0]")} />
          </button>
          
          <PWAInstallButton className="py-1 px-2 text-[11px]" />
          
          <button
            onClick={() => setIsMenuOpen(true)}
            className="w-8 h-8 flex items-center justify-center rounded-xl bg-[#25493D] hover:bg-[#2E584A] text-[#FAF7F0] transition border border-[#C7B895]/30 active:scale-95"
            aria-label="القائمة"
          >
            <Menu className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* MAIN VIEWPORT WRAPPER (Desktop Topbar + Responsive Scroll Content)        */}
      {/* ========================================================================= */}
      <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0 bg-[#FAF7F0]">
        
        {/* Desktop Top Header Bar (lg: and above) */}
        <div className="hidden lg:flex h-16 bg-white/90 backdrop-blur-md border-b border-[#C7B895]/25 px-8 items-center justify-between shadow-xs flex-shrink-0 z-10">
          <div>
            <h1 className="text-base font-extrabold text-[#1D3A30]">{getPageTitle()}</h1>
            <p className="text-[11px] text-[#1D3A30]/60 font-medium">
              لوحة التحكم والإدارة الذكية لدار نَسْجَة للأقمشة الراقية
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleManualSync}
              disabled={isSyncingData}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FAF7F0] hover:bg-[#F4EBD4] text-[#1D3A30] rounded-xl border border-[#C7B895]/40 text-xs font-bold transition active:scale-95 disabled:opacity-75"
              title="مزامنة البيانات سحابياً بين جميع أجهزتك"
            >
              <RefreshCw className={cn("w-3.5 h-3.5 text-[#1D3A30]", isSyncingData && "animate-spin")} />
              <span>{isSyncingData ? 'جارِ المزامنة...' : 'مزامنة سحابية'}</span>
            </button>

            <PWAInstallButton />

            <div className="flex items-center gap-2 text-xs text-[#1D3A30]/75 bg-[#FAF7F0] px-3 py-1.5 rounded-xl border border-[#C7B895]/30">
              <Calendar className="w-3.5 h-3.5 text-[#C7B895]" />
              <span className="font-medium">{todayFormatted}</span>
            </div>

            {lowStockCount > 0 && (
              <Link 
                to="/inventory"
                className="text-xs bg-[#E8D5A8]/30 text-[#1D3A30] border border-[#C7B895] px-3 py-1.5 rounded-xl font-bold hover:bg-[#E8D5A8]/50 transition flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#A99872]" />
                <span>{lowStockCount} أقمشة قاربت على النفاد</span>
              </Link>
            )}

            <Link
              to="/orders"
              className="bg-[#1D3A30] text-[#E8D5A8] px-4 py-2 rounded-xl text-xs font-bold hover:bg-[#25493D] transition flex items-center gap-1.5 shadow-xs border border-[#C7B895]/40 active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>طلب جديد</span>
            </Link>

            {/* Account Profile & Logout */}
            <div className="flex items-center gap-2 pr-2 border-r border-[#C7B895]/30 mr-1">
              <div 
                className="hidden xl:flex items-center gap-1.5 bg-[#FAF7F0] px-2.5 py-1.5 rounded-xl border border-[#C7B895]/30 text-xs"
                title="الحساب الحالي المعتمد"
              >
                <div className="w-4 h-4 rounded-full bg-[#1D3A30] text-[#E8D5A8] flex items-center justify-center">
                  <User className="w-2.5 h-2.5" />
                </div>
                <span className="font-semibold text-[11px] text-[#1D3A30] font-mono" dir="ltr">
                  {userEmail || 'nasjahbh@gmail.com'}
                </span>
              </div>

              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 bg-rose-50 hover:bg-rose-100 text-rose-800 px-3 py-1.5 rounded-xl text-xs font-bold transition border border-rose-200 active:scale-95"
                title="تسجيل الخروج والعودة لواجهة تسجيل الدخول"
              >
                <LogOut className="w-3.5 h-3.5 text-rose-600" />
                <span>تسجيل الخروج</span>
              </button>
            </div>
          </div>
        </div>

        {/* Scrollable Viewport Content */}
        {/* Mobile: pb-28 to allow ample clearance above the floating bottom bar */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-3.5 sm:p-5 lg:p-8 pb-28 md:pb-8 relative no-scrollbar">
          <div className="max-w-7xl mx-auto w-full">
            <Outlet />
          </div>
        </main>
      </div>

      {/* ========================================================================= */}
      {/* 4. MODERN MOBILE FLOATING BOTTOM NAVIGATION BAR (Visible ONLY on mobile)   */}
      {/* ========================================================================= */}
      <div className="flex md:hidden fixed bottom-2.5 left-3 right-3 z-40">
        <nav className="w-full h-15 bg-white/95 backdrop-blur-xl border border-[#C7B895]/35 rounded-2xl px-2 py-1 flex items-center justify-between shadow-[0_10px_30px_rgba(29,58,48,0.15)]">
          {/* Item 1: Home */}
          <Link
            to="/"
            className={cn(
              "relative flex flex-col items-center justify-center flex-1 py-1 rounded-xl transition-all duration-200 active:scale-90",
              location.pathname === '/' 
                ? "text-[#1D3A30] font-bold" 
                : "text-[#1D3A30]/50 hover:text-[#1D3A30] font-medium"
            )}
          >
            {location.pathname === '/' && (
              <motion.div
                layoutId="mobileBottomIndicator"
                className="absolute inset-0 bg-[#E8D5A8]/45 rounded-xl -z-10 border border-[#C7B895]/30"
                transition={{ type: "spring", stiffness: 450, damping: 30 }}
              />
            )}
            <Home className={cn("w-4.5 h-4.5 transition-transform", location.pathname === '/' && "scale-110 text-[#1D3A30]")} />
            <span className="text-[10px] mt-0.5">الرئيسية</span>
          </Link>

          {/* Item 2: Orders */}
          <Link
            to="/orders"
            className={cn(
              "relative flex flex-col items-center justify-center flex-1 py-1 rounded-xl transition-all duration-200 active:scale-90",
              location.pathname === '/orders' 
                ? "text-[#1D3A30] font-bold" 
                : "text-[#1D3A30]/50 hover:text-[#1D3A30] font-medium"
            )}
          >
            {location.pathname === '/orders' && (
              <motion.div
                layoutId="mobileBottomIndicator"
                className="absolute inset-0 bg-[#E8D5A8]/45 rounded-xl -z-10 border border-[#C7B895]/30"
                transition={{ type: "spring", stiffness: 450, damping: 30 }}
              />
            )}
            <div className="relative">
              <ShoppingBag className={cn("w-4.5 h-4.5 transition-transform", location.pathname === '/orders' && "scale-110 text-[#1D3A30]")} />
              {pendingOrdersCount > 0 && (
                <span className="absolute -top-1.5 -right-2 text-[9px] font-bold min-w-[15px] h-[15px] flex items-center justify-center rounded-full px-0.5 bg-[#C7B895] text-[#1D3A30] shadow-xs">
                  {pendingOrdersCount}
                </span>
              )}
            </div>
            <span className="text-[10px] mt-0.5">الطلبات</span>
          </Link>

          {/* Center: Quick Add Action Trigger (+) */}
          <div className="flex-none px-1">
            <button
              onClick={() => setIsQuickAddOpen(true)}
              className="w-11 h-11 rounded-2xl bg-[#1D3A30] hover:bg-[#25493D] text-[#E8D5A8] flex items-center justify-center shadow-md border border-[#C7B895]/50 active:scale-90 transition-transform"
              title="إجراء سريع جديد"
              aria-label="إضافة سريعة"
            >
              <Plus className="w-5 h-5 stroke-[2.5]" />
            </button>
          </div>

          {/* Item 3: Inventory */}
          <Link
            to="/inventory"
            className={cn(
              "relative flex flex-col items-center justify-center flex-1 py-1 rounded-xl transition-all duration-200 active:scale-90",
              location.pathname === '/inventory' 
                ? "text-[#1D3A30] font-bold" 
                : "text-[#1D3A30]/50 hover:text-[#1D3A30] font-medium"
            )}
          >
            {location.pathname === '/inventory' && (
              <motion.div
                layoutId="mobileBottomIndicator"
                className="absolute inset-0 bg-[#E8D5A8]/45 rounded-xl -z-10 border border-[#C7B895]/30"
                transition={{ type: "spring", stiffness: 450, damping: 30 }}
              />
            )}
            <div className="relative">
              <Layers className={cn("w-4.5 h-4.5 transition-transform", location.pathname === '/inventory' && "scale-110 text-[#1D3A30]")} />
              {lowStockCount > 0 && (
                <span className="absolute -top-1.5 -right-2 text-[9px] font-bold min-w-[15px] h-[15px] flex items-center justify-center rounded-full px-0.5 bg-amber-600 text-white shadow-xs">
                  !
                </span>
              )}
            </div>
            <span className="text-[10px] mt-0.5">المخزون</span>
          </Link>

          {/* Item 4: Expenses & Budget */}
          <Link
            to="/expenses"
            className={cn(
              "relative flex flex-col items-center justify-center flex-1 py-1 rounded-xl transition-all duration-200 active:scale-90",
              (location.pathname === '/expenses' || location.pathname === '/budget')
                ? "text-[#1D3A30] font-bold" 
                : "text-[#1D3A30]/50 hover:text-[#1D3A30] font-medium"
            )}
          >
            {(location.pathname === '/expenses' || location.pathname === '/budget') && (
              <motion.div
                layoutId="mobileBottomIndicator"
                className="absolute inset-0 bg-[#E8D5A8]/45 rounded-xl -z-10 border border-[#C7B895]/30"
                transition={{ type: "spring", stiffness: 450, damping: 30 }}
              />
            )}
            <Receipt className={cn("w-4.5 h-4.5 transition-transform", (location.pathname === '/expenses' || location.pathname === '/budget') && "scale-110 text-[#1D3A30]")} />
            <span className="text-[10px] mt-0.5">المصروفات</span>
          </Link>
        </nav>
      </div>

      {/* ========================================================================= */}
      {/* 5. MOBILE QUICK ADD MODAL SHEET                                           */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {isQuickAddOpen && (
          <div className="md:hidden fixed inset-0 z-50 flex items-end">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsQuickAddOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-xs"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
              className="relative w-full bg-white rounded-t-[28px] border-t border-[#C7B895]/30 p-5 shadow-2xl z-10 space-y-4"
            >
              {/* Drag Handle indicator */}
              <div className="w-10 h-1 bg-stone-300 rounded-full mx-auto mb-1" />
              
              <div className="flex items-center justify-between pb-3 border-b border-[#C7B895]/20">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-[#1D3A30] text-[#E8D5A8] flex items-center justify-center">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-[#1D3A30]">إجراء سريع لدار نَسْجَة</h3>
                    <p className="text-[11px] text-[#1D3A30]/60">اختر العملية التي ترغب في إنجازها</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsQuickAddOpen(false)}
                  className="p-1.5 rounded-lg bg-stone-100 text-stone-600 hover:bg-stone-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 gap-2.5">
                <Link
                  to="/orders"
                  onClick={() => setIsQuickAddOpen(false)}
                  className="flex items-center justify-between p-3.5 rounded-2xl bg-[#FAF7F0] hover:bg-[#F4EBD4] border border-[#C7B895]/30 transition group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#1D3A30] text-[#E8D5A8] flex items-center justify-center">
                      <ShoppingBag className="w-5 h-5" />
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-xs text-[#1D3A30] block">تسجيل طلب ومبيعة جديدة</span>
                      <span className="text-[10px] text-[#1D3A30]/60">إضافة قياسات العميل والفاتورة</span>
                    </div>
                  </div>
                  <ChevronLeft className="w-4 h-4 text-[#C7B895] group-hover:-translate-x-1 transition-transform" />
                </Link>

                <Link
                  to="/inventory"
                  onClick={() => setIsQuickAddOpen(false)}
                  className="flex items-center justify-between p-3.5 rounded-2xl bg-[#FAF7F0] hover:bg-[#F4EBD4] border border-[#C7B895]/30 transition group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#C7B895] text-[#1D3A30] flex items-center justify-center">
                      <Layers className="w-5 h-5" />
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-xs text-[#1D3A30] block">إضافة قماش للمخزون</span>
                      <span className="text-[10px] text-[#1D3A30]/60">تصوير القماش وإدخال الأمتار والسعر</span>
                    </div>
                  </div>
                  <ChevronLeft className="w-4 h-4 text-[#C7B895] group-hover:-translate-x-1 transition-transform" />
                </Link>

                <Link
                  to="/expenses"
                  onClick={() => setIsQuickAddOpen(false)}
                  className="flex items-center justify-between p-3.5 rounded-2xl bg-[#FAF7F0] hover:bg-[#F4EBD4] border border-[#C7B895]/30 transition group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-700 text-[#FAF7F0] flex items-center justify-center">
                      <Receipt className="w-5 h-5" />
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-xs text-[#1D3A30] block">تسجيل مصروف ومشتريات</span>
                      <span className="text-[10px] text-[#1D3A30]/60">خيوط، كلف، فواتير، ومصروفات المحل</span>
                    </div>
                  </div>
                  <ChevronLeft className="w-4 h-4 text-[#C7B895] group-hover:-translate-x-1 transition-transform" />
                </Link>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => {
                    setIsQuickAddOpen(false);
                    handleManualSync();
                  }}
                  className="w-full py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-[#1D3A30] text-xs font-bold transition flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-[#1D3A30]" />
                  <span>تحديث ومزامنة البيانات مع السحابة</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* 6. MOBILE SLIDE-OVER DRAWER MENU                                          */}
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
              className="absolute top-0 right-0 bottom-0 w-72 bg-[#1D3A30] text-[#FAF7F0] shadow-2xl flex flex-col justify-between p-5 border-l border-[#C7B895]/20"
            >
              <div>
                {/* Header in Drawer */}
                <div className="flex justify-between items-center pb-4 border-b border-[#C7B895]/20 mb-5">
                  <div className="flex items-center gap-2.5">
                    <NasjahLogo variant="emblem" size="sm" />
                    <div>
                      <h3 className="font-bold text-sm text-[#FAF7F0]">دار نَسْجَة للأقمشة</h3>
                      <p className="text-[10px] text-[#C7B895]">إدارة المتجر والمبيعات</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setIsMenuOpen(false)}
                    className="p-1.5 rounded-lg bg-[#25493D] text-[#C7B895] hover:text-white"
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
                            ? "bg-[#25493D] text-[#E8D5A8] border border-[#C7B895]/40 shadow-xs" 
                            : "text-[#FAF7F0]/80 hover:bg-[#25493D]/50"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <Icon className={cn("w-4 h-4", isActive ? "text-[#E8D5A8]" : "text-[#C7B895]")} />
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

                {/* Quick Shortcuts in Drawer */}
                <div className="mt-6 pt-5 border-t border-[#C7B895]/20">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#C7B895] mb-2">
                    اختصارات سريعة
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <Link
                      to="/orders"
                      onClick={() => setIsMenuOpen(false)}
                      className="bg-[#25493D]/60 hover:bg-[#25493D] p-2.5 rounded-xl text-center border border-[#C7B895]/20 text-[#FAF7F0] text-xs font-medium"
                    >
                      + طلب جديد
                    </Link>
                    <Link
                      to="/inventory"
                      onClick={() => setIsMenuOpen(false)}
                      className="bg-[#25493D]/60 hover:bg-[#25493D] p-2.5 rounded-xl text-center border border-[#C7B895]/20 text-[#FAF7F0] text-xs font-medium"
                    >
                      + قماش جديد
                    </Link>
                  </div>
                </div>
              </div>

              {/* Drawer Footer */}
              <div className="pt-4 border-t border-[#C7B895]/20 space-y-2">
                <div className="px-1">
                  <PWAInstallButton className="w-full justify-center py-2.5" />
                </div>

                <a
                  href="https://instagram.com/nasjah.bh"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between px-3 py-2 rounded-xl text-xs text-[#C7B895] bg-[#25493D]/40 hover:bg-[#25493D]"
                >
                  <div className="flex items-center gap-2">
                    <Instagram className="w-3.5 h-3.5 text-[#E8D5A8]" />
                    <span>حساب إنستغرام @nasjah.bh</span>
                  </div>
                  <ChevronLeft className="w-4 h-4" />
                </a>

                <button 
                  onClick={handleLogout}
                  className="flex items-center gap-2.5 w-full px-3.5 py-2.5 text-rose-300 hover:bg-rose-950/40 hover:text-rose-200 rounded-xl transition text-xs font-medium"
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
