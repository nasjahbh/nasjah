import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  TrendingUp, TrendingDown, DollarSign, Activity, ShoppingBag, 
  Layers, PlusCircle, ArrowLeft, AlertCircle, Clock, CheckCircle2, 
  Sparkles, Receipt, ChevronLeft, ArrowUpRight, Check
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatDateTime } from '../lib/dateUtils';
import NasjahLogo from '../components/NasjahLogo';
import WhatsAppIcon from '../components/WhatsAppIcon';
import { getLocalData, persistOrders, syncWithServer, EVENT_DATA_UPDATED } from '../lib/dataService';

export default function Dashboard() {
  const [sales, setSales] = useState(0);
  const [expenses, setExpenses] = useState(0);
  const [orders, setOrders] = useState<any[]>([]);
  const [fabrics, setFabrics] = useState<any[]>([]);
  const [insights, setInsights] = useState<any>(null);
  const [isInsightsLoading, setIsInsightsLoading] = useState(false);

  const reloadDashboardData = () => {
    const local = getLocalData();
    setOrders(local.orders);
    const totalSales = local.orders.reduce((sum: number, order: any) => sum + (order.total || order.price || 0), 0) || 0;
    setSales(totalSales);

    const totalExp = local.expenses.reduce((sum: number, exp: any) => sum + (Number(exp.amount) || 0), 0) || 0;
    setExpenses(totalExp);

    setFabrics(local.inventory);
    return { totalSales, totalExp, fabrics: local.inventory };
  };

  useEffect(() => {
    const { totalSales, totalExp, fabrics: currentFabrics } = reloadDashboardData();

    syncWithServer().then(() => {
      reloadDashboardData();
    });

    const handleDataEvent = () => {
      reloadDashboardData();
    };

    window.addEventListener(EVENT_DATA_UPDATED, handleDataEvent);

    const checkAndFetchData = async () => {
      if (totalSales === 0 && totalExp === 0) {
        return;
      }

      const cachedTime = localStorage.getItem('insights_timestamp');
      const cachedInsights = localStorage.getItem('insights_data');
      const ONE_HOUR = 3600000;
      const now = new Date().getTime();

      if (cachedTime && cachedInsights && (now - parseInt(cachedTime)) < ONE_HOUR) {
        try {
          setInsights(JSON.parse(cachedInsights));
          return;
        } catch {}
      }

      setIsInsightsLoading(true);
      try {
        const insightsRes = await fetch('/api/insights', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sales: totalSales, expenses: totalExp, inventory: currentFabrics })
        });
        
        if (insightsRes.ok && insightsRes.headers.get('content-type')?.includes('application/json')) {
          const insightsData = await insightsRes.json();
          if (insightsData?.insights) {
            setInsights(insightsData.insights);
            localStorage.setItem('insights_data', JSON.stringify(insightsData.insights));
            localStorage.setItem('insights_timestamp', now.toString());
          }
        }
      } catch {
        // silent
      } finally {
        setIsInsightsLoading(false);
      }
    };

    checkAndFetchData();

    return () => {
      window.removeEventListener(EVENT_DATA_UPDATED, handleDataEvent);
    };
  }, []);

  const lowStockFabrics = fabrics.filter(f => (Number(f.quantity) || 0) <= 2);
  const totalMeters = fabrics.reduce((acc, f) => acc + (Number(f.quantity) || 0), 0);
  const netProfit = sales - expenses;
  const pendingOrders = orders.filter(o => o.status !== 'تم التسليم');
  const deliveredOrders = orders.filter(o => o.status === 'تم التسليم');

  const handleDeliverOrder = (orderId: string, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const updated = orders.map((o) => {
      if (o.id === orderId) {
        return { ...o, status: 'تم التسليم' };
      }
      return o;
    });
    setOrders(updated);
    persistOrders(updated);
  };

  return (
    <div className="space-y-4 lg:space-y-6 pb-6">
      {/* Top Financial & Action Row (1 col on mobile, 3 cols on desktop) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5 lg:gap-5">
        
        {/* Net Profit Hero Card */}
        <motion.div 
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className={`lg:col-span-2 p-5 sm:p-6 rounded-3xl text-center shadow-md relative overflow-hidden transition-all flex flex-col justify-between border ${
            netProfit >= 0 
              ? 'bg-[#1D3A30] text-[#FAF7F0] border-[#C7B895]/30' 
              : 'bg-rose-950 text-white border-rose-800/40'
          }`}
        >
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#C7B895] animate-pulse" />
              <span className="text-xs font-semibold text-[#E8D5A8]">صافي الأرباح التشغيلية لدار نَسْجَة</span>
            </div>
            <Link 
              to="/budget"
              className="text-[11px] text-[#1D3A30] hover:bg-[#FAF6EC] flex items-center gap-1 bg-[#E8D5A8] px-3 py-1 rounded-full font-bold transition shadow-xs border border-[#C7B895]"
            >
              تقرير الميزانية <ChevronLeft className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="my-2">
            <h2 className="text-3.5xl sm:text-5xl font-black tracking-tight text-[#FAF7F0] font-mono">
              {netProfit.toFixed(2)} <span className="text-lg sm:text-2xl font-bold text-[#E8D5A8]">د.ب</span>
            </h2>
            <p className="text-[11px] text-[#C7B895] mt-1 font-medium">
              {netProfit >= 0 ? '✓ أرباح تشغيلية إيجابية ومستقرة' : '⚠ تنبيه: المصروفات تتجاوز الإيرادات'}
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-[#C7B895]/20 flex justify-around text-xs sm:text-sm">
            <div>
              <span className="text-[10px] sm:text-[11px] text-[#C7B895] block mb-0.5">المبيعات الكلية</span>
              <span className="font-bold text-[#E8D5A8] font-mono text-xs sm:text-base">+{sales.toFixed(2)} د.ب</span>
            </div>
            <div className="w-px bg-[#C7B895]/20" />
            <div>
              <span className="text-[10px] sm:text-[11px] text-[#C7B895] block mb-0.5">إجمالي المصروفات</span>
              <span className="font-bold text-rose-300 font-mono text-xs sm:text-base">-{expenses.toFixed(2)} د.ب</span>
            </div>
          </div>
        </motion.div>

        {/* Quick Actions Panel */}
        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-[#C7B895]/30 shadow-xs flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <Sparkles className="w-3.5 h-3.5 text-[#A99872]" />
              <h3 className="text-xs font-extrabold text-[#1D3A30]">العمليات السريعة</h3>
            </div>
            <p className="text-[10px] text-[#1D3A30]/60 font-medium">تسجيل الطلبات والمصروفات فورياً</p>
          </div>

          <div className="grid grid-cols-3 lg:grid-cols-1 gap-2">
            <Link 
              to="/orders"
              className="bg-[#1D3A30] text-[#E8D5A8] p-3 lg:py-2.5 lg:px-4 rounded-2xl flex flex-col lg:flex-row items-center justify-center lg:justify-between gap-1 shadow-xs hover:bg-[#25493D] transition active:scale-95 text-center border border-[#C7B895]/40"
            >
              <div className="flex items-center gap-2">
                <PlusCircle className="w-4 h-4 text-[#C7B895]" />
                <span className="text-[11px] font-bold">تسجيل طلب جديد</span>
              </div>
              <ChevronLeft className="w-3.5 h-3.5 hidden lg:block opacity-60 text-[#C7B895]" />
            </Link>

            <Link 
              to="/expenses"
              className="bg-stone-50 text-stone-900 border border-stone-200/80 p-3 lg:py-2.5 lg:px-4 rounded-2xl flex flex-col lg:flex-row items-center justify-center lg:justify-between gap-1 shadow-xs hover:bg-stone-100 transition active:scale-95 text-center"
            >
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-rose-700" />
                <span className="text-[11px] font-bold text-[#1D3A30]">تسجيل مصروف</span>
              </div>
              <ChevronLeft className="w-3.5 h-3.5 hidden lg:block opacity-60" />
            </Link>

            <Link 
              to="/inventory"
              className="bg-[#FAF7F0] text-[#1D3A30] border border-[#C7B895]/30 p-3 lg:py-2.5 lg:px-4 rounded-2xl flex flex-col lg:flex-row items-center justify-center lg:justify-between gap-1 shadow-xs hover:bg-[#F4EBD4] transition active:scale-95 text-center"
            >
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#A99872]" />
                <span className="text-[11px] font-bold">إدارة المخزون</span>
              </div>
              <ChevronLeft className="w-3.5 h-3.5 hidden lg:block opacity-60" />
            </Link>
          </div>
        </div>
      </div>

      {/* 4 Metrics Grid (2x2 on Mobile, 4-in-a-row on Tablet/Desktop) */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {/* Total Orders */}
        <Link 
          to="/orders" 
          className="bg-white p-3.5 sm:p-4 rounded-2xl border border-[#C7B895]/30 shadow-xs hover:border-[#C7B895] transition group"
        >
          <div className="flex justify-between items-start">
            <span className="text-[11px] sm:text-xs text-[#1D3A30]/70 font-semibold">إجمالي الطلبات</span>
            <div className="p-1.5 bg-[#FAF7F0] text-[#1D3A30] rounded-xl group-hover:bg-[#E8D5A8]/50 transition border border-[#C7B895]/20">
              <ShoppingBag className="w-4 h-4 text-[#1D3A30]" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-black text-[#1D3A30] mt-1 font-mono">{orders.length}</p>
          <span className="text-[10px] sm:text-[11px] text-[#A99872] font-semibold">
            {pendingOrders.length} قيد التجهيز
          </span>
        </Link>

        {/* Ready Orders */}
        <Link 
          to="/orders" 
          className="bg-white p-3.5 sm:p-4 rounded-2xl border border-[#C7B895]/30 shadow-xs hover:border-[#C7B895] transition group"
        >
          <div className="flex justify-between items-start">
            <span className="text-[11px] sm:text-xs text-[#1D3A30]/70 font-semibold">الطلبات المسلّمة</span>
            <div className="p-1.5 bg-[#FAF7F0] text-[#1D3A30] rounded-xl group-hover:bg-[#E8D5A8]/50 transition border border-[#C7B895]/20">
              <CheckCircle2 className="w-4 h-4 text-[#1D3A30]" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-black text-[#1D3A30] mt-1 font-mono">
            {orders.length - pendingOrders.length}
          </p>
          <span className="text-[10px] sm:text-[11px] text-[#1D3A30]/70 font-semibold">
            مكتملة ومستلمة
          </span>
        </Link>

        {/* Fabrics count */}
        <Link 
          to="/inventory" 
          className="bg-white p-3.5 sm:p-4 rounded-2xl border border-[#C7B895]/30 shadow-xs hover:border-[#C7B895] transition group"
        >
          <div className="flex justify-between items-start">
            <span className="text-[11px] sm:text-xs text-[#1D3A30]/70 font-semibold">أنواع الأقمشة</span>
            <div className="p-1.5 bg-[#FAF7F0] text-[#1D3A30] rounded-xl group-hover:bg-[#E8D5A8]/50 transition border border-[#C7B895]/20">
              <Layers className="w-4 h-4 text-[#1D3A30]" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-black text-[#1D3A30] mt-1 font-mono">{fabrics.length}</p>
          <span className="text-[10px] sm:text-[11px] text-[#1D3A30]/70 font-semibold">
            {totalMeters} متر مسجل
          </span>
        </Link>

        {/* Low stock fabrics */}
        <Link 
          to="/inventory" 
          className="bg-white p-3.5 sm:p-4 rounded-2xl border border-[#C7B895]/30 shadow-xs hover:border-[#C7B895] transition group"
        >
          <div className="flex justify-between items-start">
            <span className="text-[11px] sm:text-xs text-[#1D3A30]/70 font-semibold">تنبيه المخزون</span>
            <div className="p-1.5 bg-[#FAF7F0] text-amber-800 rounded-xl group-hover:bg-amber-100 transition border border-amber-200">
              <AlertCircle className="w-4 h-4 text-amber-700" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-black text-amber-800 mt-1 font-mono">{lowStockFabrics.length}</p>
          <span className="text-[10px] sm:text-[11px] text-amber-800 font-semibold">
            أقل من مترين
          </span>
        </Link>
      </div>

      {/* Low Stock Warning Banner */}
      {lowStockFabrics.length > 0 && (
        <div className="bg-[#FAF7F0] border border-[#C7B895] p-3 sm:p-3.5 rounded-2xl flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-amber-700 flex-shrink-0" />
            <div>
              <p className="text-xs sm:text-sm font-bold text-[#1D3A30]">
                تنبيه: {lowStockFabrics.length} أقمشة قاربت على النفاد
              </p>
              <p className="text-[11px] text-[#1D3A30]/70 truncate max-w-[280px] sm:max-w-md">
                {lowStockFabrics.map(f => f.name).join('، ')}
              </p>
            </div>
          </div>
          <Link 
            to="/inventory" 
            className="text-xs font-bold text-[#1D3A30] bg-[#E8D5A8] border border-[#C7B895] px-3 py-1.5 rounded-xl hover:bg-[#FAF6EC] transition"
          >
            تزويد المخزون
          </Link>
        </div>
      )}

      {/* 2-Column Responsive Section: Recent Orders + AI Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        
        {/* Recent Orders Card */}
        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-[#C7B895]/30 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold text-sm text-[#1D3A30] flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-[#A99872]" />
                آخر الطلبات المسجلة
              </h3>
              <Link to="/orders" className="text-xs text-[#1D3A30] font-bold hover:underline flex items-center gap-0.5">
                عرض الكل ({orders.length}) <ChevronLeft className="w-3.5 h-3.5" />
              </Link>
            </div>

            {orders.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-xs text-[#1D3A30]/60">لا توجد أي طلبات مسجلة حالياً.</p>
                <Link to="/orders" className="text-[#1D3A30] text-xs font-bold mt-2 inline-block underline">
                  + أضف أول طلب
                </Link>
              </div>
            ) : pendingOrders.length === 0 ? (
              <div className="py-8 text-center bg-[#FAF7F0] rounded-2xl border border-dashed border-[#C7B895]/40 p-4">
                <div className="w-10 h-10 rounded-full bg-[#1D3A30] text-[#E8D5A8] flex items-center justify-center mx-auto mb-2">
                  <CheckCircle2 className="w-5 h-5 text-[#E8D5A8]" />
                </div>
                <p className="text-xs font-bold text-[#1D3A30]">تم تسليم جميع الطلبات للزبائن بنجاح!</p>
                <p className="text-[11px] text-[#1D3A30]/60 mt-0.5">كافة طلبات التفصيل مكتملة ومسلّمة</p>
                <Link to="/orders" className="text-[#1D3A30] text-xs font-bold mt-2.5 inline-block underline">
                  الانتقال لجدول الطلبات الكامل ({orders.length})
                </Link>
              </div>
            ) : (
              <div className="space-y-2.5">
                <AnimatePresence initial={false}>
                  {pendingOrders.slice(0, 5).map((o) => {
                    const { full } = formatDateTime(o.createdAt);
                    const cleanPhone = o.phone?.replace(/[^0-9]/g, '');

                    return (
                      <motion.div 
                        key={o.id} 
                        layout
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: 20, transition: { duration: 0.2 } }}
                        className="p-3 bg-[#FAF7F0] rounded-2xl border border-[#C7B895]/20 flex items-center justify-between hover:bg-[#F4EBD4]/40 transition"
                      >
                        <div className="flex-1 min-w-0 pr-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-xs sm:text-sm text-[#1D3A30] truncate">
                              {o.customerName}
                            </span>
                            <span className="text-[9px] px-2 py-0.5 rounded-full font-bold bg-[#E8D5A8] text-[#1D3A30] border border-[#C7B895]/50">
                              {o.status || 'قيد التجهيز'}
                            </span>
                          </div>
                          <p className="text-[11px] text-[#1D3A30]/70 truncate mt-0.5">
                            {o.details}
                          </p>
                          <p className="text-[9px] text-[#1D3A30]/50 font-mono mt-0.5">
                            {full}
                          </p>
                        </div>

                        <div className="text-left flex-shrink-0 flex items-center gap-1.5 sm:gap-2">
                          <div>
                            <span className="font-bold text-xs sm:text-sm text-[#1D3A30] font-mono block ml-1">
                              {Number(o.price || o.total).toFixed(2)} د.ب
                            </span>
                          </div>

                          {/* Deliver Order Button */}
                          <button
                            type="button"
                            onClick={(e) => handleDeliverOrder(o.id, e)}
                            title="تم تسليم الطلب إلى الزبون (إخفاء من الرئيسية)"
                            aria-label="تم تسليم الطلب إلى الزبون"
                            className="w-7.5 h-7.5 bg-[#1D3A30] hover:bg-[#25493D] active:scale-90 text-[#E8D5A8] rounded-xl flex items-center justify-center transition shadow-xs border border-[#C7B895]/40"
                          >
                            <Check className="w-4 h-4 stroke-[2.5]" />
                          </button>

                          {/* WhatsApp Direct Chat */}
                          {cleanPhone && (
                            <a
                              href={`https://wa.me/${cleanPhone}`}
                              target="_blank"
                              rel="noreferrer"
                              title="مراسلة الزبون عبر واتساب"
                              aria-label="مراسلة الزبون عبر واتساب"
                              className="w-7.5 h-7.5 bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-xl flex items-center justify-center transition shadow-xs active:scale-90"
                            >
                              <WhatsAppIcon className="w-4 h-4" />
                            </a>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-[#C7B895]/20 text-center">
            <Link
              to="/orders"
              className="text-xs font-bold text-[#1D3A30] hover:text-[#25493D] inline-flex items-center gap-1"
            >
              الانتقال إلى جدول الطلبات الكامل
              <ChevronLeft className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* AI Assistant Insight & Fabrics Summary */}
        <div className="space-y-4">
          {/* AI Assistant Card */}
          <div className="bg-[#1D3A30] text-[#FAF7F0] p-5 rounded-3xl shadow-sm border border-[#C7B895]/30">
            <div className="flex items-center gap-2 mb-2.5">
              <Sparkles className="w-4.5 h-4.5 text-[#E8D5A8]" />
              <span className="text-xs sm:text-sm font-bold text-[#E8D5A8]">تحليل الذكاء الاصطناعي للمتجر</span>
            </div>
            <p className="text-xs sm:text-sm text-[#FAF7F0]/90 leading-relaxed">
              {isInsightsLoading ? (
                <span className="flex items-center gap-2 text-[#E8D5A8]">
                  <span className="w-3.5 h-3.5 border-2 border-[#C7B895]/30 border-t-[#E8D5A8] rounded-full animate-spin inline-block" />
                  جاري قراءة البيانات وتوليد التحليل الذكي...
                </span>
              ) : insights 
                ? (typeof insights === 'string' ? insights : insights?.summary || 'استمر في تسجيل العمليات بدقة لتوليد توصيات مالية ذكية.')
                : 'يتم احتساب وتحليل هوامش الربح ووتيرة المبيعات دورياً لدعم قرارات التسعير والمخزون.'
              }
            </p>
          </div>

          {/* Quick Fabrics Overview Widget */}
          <div className="bg-white p-4 sm:p-5 rounded-3xl border border-[#C7B895]/30 shadow-xs">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold text-sm text-[#1D3A30] flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-[#A99872]" />
                أبرز الأقمشة في المخزون
              </h3>
              <Link to="/inventory" className="text-xs text-[#1D3A30] font-bold hover:underline flex items-center gap-0.5">
                المخزون ({fabrics.length}) <ChevronLeft className="w-3.5 h-3.5" />
              </Link>
            </div>

            {fabrics.length === 0 ? (
              <p className="text-xs text-[#1D3A30]/60 py-4 text-center">لا توجد أقمشة مسجلة في المخزون بعد.</p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {fabrics.slice(0, 4).map((f) => (
                  <div key={f.id} className="p-2.5 bg-[#FAF7F0] rounded-xl border border-[#C7B895]/20">
                    <p className="font-bold text-xs text-[#1D3A30] truncate">{f.name}</p>
                    <div className="flex justify-between items-center mt-1 text-[10px] text-[#1D3A30]/70">
                      <span>{f.quantity} متر</span>
                      <span className="font-mono font-bold text-[#A99872]">{f.price} د.ب</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
