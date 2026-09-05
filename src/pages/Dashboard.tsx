import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { 
  TrendingUp, TrendingDown, DollarSign, Activity, ShoppingBag, 
  Layers, PlusCircle, ArrowLeft, AlertCircle, Clock, CheckCircle2, 
  MessageSquare, Sparkles, Receipt, ChevronLeft, ArrowUpRight
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatDateTime } from '../lib/dateUtils';
import NasjahLogo from '../components/NasjahLogo';

export default function Dashboard() {
  const [sales, setSales] = useState(0);
  const [expenses, setExpenses] = useState(0);
  const [orders, setOrders] = useState<any[]>([]);
  const [fabrics, setFabrics] = useState<any[]>([]);
  const [insights, setInsights] = useState<any>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const savedOrders = JSON.parse(localStorage.getItem('ordersData') || '[]');
    setOrders(savedOrders);
    const totalSales = savedOrders.reduce((sum: number, order: any) => sum + (order.total || order.price || 0), 0) || 0;
    setSales(totalSales);

    const savedExpenses = JSON.parse(localStorage.getItem('expensesData') || '[]');
    const totalExp = savedExpenses.reduce((sum: number, exp: any) => sum + (Number(exp.amount) || 0), 0) || 0;
    setExpenses(totalExp);

    const savedFabrics = JSON.parse(localStorage.getItem('inventory') || '[]');
    setFabrics(savedFabrics);

    const checkAndFetchData = async () => {
      if (totalSales === 0 && totalExp === 0) {
        setIsInitializing(false);
        return;
      }

      const cachedTime = localStorage.getItem('insights_timestamp');
      const cachedInsights = localStorage.getItem('insights_data');
      const ONE_HOUR = 3600000;
      const now = new Date().getTime();

      if (cachedTime && cachedInsights && (now - parseInt(cachedTime)) < ONE_HOUR) {
        try {
          setInsights(JSON.parse(cachedInsights));
        } catch {}
        setIsInitializing(false);
        return;
      }

      try {
        const insightsRes = await fetch('/api/insights', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sales: totalSales, expenses: totalExp, inventory: savedFabrics })
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
        setIsInitializing(false);
      }
    };

    checkAndFetchData();
  }, []);

  const lowStockFabrics = fabrics.filter(f => (Number(f.quantity) || 0) <= 2);
  const totalMeters = fabrics.reduce((acc, f) => acc + (Number(f.quantity) || 0), 0);
  const netProfit = sales - expenses;
  const pendingOrders = orders.filter(o => o.status === 'قيد التجهيز' || !o.status);

  if (isInitializing) {
    return (
      <div className="h-full flex flex-col items-center justify-center py-20 text-center">
        <motion.div
          animate={{ scale: [1, 1.1, 1], rotate: [0, 180, 360] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="w-12 h-12 border-3 border-emerald-900 border-t-amber-400 rounded-full mb-3"
        />
        <h2 className="text-sm font-bold text-emerald-950">جاري مزامنة بيانات نَسْجَة...</h2>
        <p className="text-emerald-800/60 mt-1 text-xs">تحميل الإحصائيات والمخزون</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 lg:space-y-6 pb-6">
      {/* Top Financial & Action Row (1 col on mobile, 3 cols on desktop) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5 lg:gap-5">
        
        {/* Net Profit Card */}
        <motion.div 
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className={`lg:col-span-2 p-5 sm:p-6 rounded-3xl text-center shadow-md relative overflow-hidden transition-all flex flex-col justify-between ${
            netProfit >= 0 
              ? 'bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950 text-emerald-50' 
              : 'bg-gradient-to-br from-red-950 via-red-900 to-red-950 text-white'
          }`}
        >
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs font-medium text-emerald-200/80">صافي الأرباح الصافية للمتجر</span>
            <Link 
              to="/budget"
              className="text-[11px] text-amber-300 hover:text-amber-200 flex items-center gap-0.5 bg-white/10 px-2.5 py-1 rounded-full font-bold transition"
            >
              تقرير الميزانية <ChevronLeft className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="my-2">
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-white">
              {netProfit.toFixed(2)} <span className="text-lg sm:text-xl font-bold text-amber-300">د.ب</span>
            </h2>
            <p className="text-[11px] opacity-80 mt-1 font-mono">
              {netProfit >= 0 ? '✓ أرباح تشغيلية إيجابية ومستقرة' : '⚠ تنبيه: المصروفات تتجاوز الإيرادات'}
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-white/10 flex justify-around text-xs sm:text-sm">
            <div>
              <span className="text-[10px] sm:text-[11px] opacity-70 block">المبيعات الكلية</span>
              <span className="font-bold text-emerald-300 font-mono text-xs sm:text-base">+{sales.toFixed(2)} د.ب</span>
            </div>
            <div className="w-px bg-white/10" />
            <div>
              <span className="text-[10px] sm:text-[11px] opacity-70 block">إجمالي المصروفات</span>
              <span className="font-bold text-red-300 font-mono text-xs sm:text-base">-{expenses.toFixed(2)} د.ب</span>
            </div>
          </div>
        </motion.div>

        {/* Quick Actions Panel */}
        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-emerald-900/10 shadow-xs flex flex-col justify-between space-y-2.5">
          <div>
            <h3 className="text-xs font-extrabold text-emerald-950 mb-1">العمليات السريعة</h3>
            <p className="text-[10px] text-emerald-800/60 font-medium">تسجيل الطلبات والمصروفات فورياً</p>
          </div>

          <div className="grid grid-cols-3 lg:grid-cols-1 gap-2">
            <Link 
              to="/orders"
              className="bg-emerald-900 text-white p-3 lg:py-2.5 lg:px-4 rounded-2xl flex flex-col lg:flex-row items-center justify-center lg:justify-between gap-1 shadow-xs hover:bg-emerald-800 transition active:scale-95 text-center"
            >
              <div className="flex items-center gap-2">
                <PlusCircle className="w-4 h-4 text-amber-300" />
                <span className="text-[11px] font-bold">تسجيل طلب جديد</span>
              </div>
              <ChevronLeft className="w-3.5 h-3.5 hidden lg:block opacity-60" />
            </Link>

            <Link 
              to="/expenses"
              className="bg-red-50 text-red-900 border border-red-200/80 p-3 lg:py-2.5 lg:px-4 rounded-2xl flex flex-col lg:flex-row items-center justify-center lg:justify-between gap-1 shadow-xs hover:bg-red-100 transition active:scale-95 text-center"
            >
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-red-600" />
                <span className="text-[11px] font-bold">تسجيل مصروف</span>
              </div>
              <ChevronLeft className="w-3.5 h-3.5 hidden lg:block opacity-60" />
            </Link>

            <Link 
              to="/inventory"
              className="bg-emerald-50 text-emerald-950 border border-emerald-900/10 p-3 lg:py-2.5 lg:px-4 rounded-2xl flex flex-col lg:flex-row items-center justify-center lg:justify-between gap-1 shadow-xs hover:bg-emerald-100 transition active:scale-95 text-center"
            >
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-700" />
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
          className="bg-white p-3.5 sm:p-4 rounded-2xl border border-emerald-900/10 shadow-xs hover:border-emerald-300 transition group"
        >
          <div className="flex justify-between items-start">
            <span className="text-[11px] sm:text-xs text-emerald-800/70 font-semibold">إجمالي الطلبات</span>
            <div className="p-1.5 bg-emerald-100 text-emerald-900 rounded-lg group-hover:bg-emerald-200 transition">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-black text-emerald-950 mt-1">{orders.length}</p>
          <span className="text-[10px] sm:text-[11px] text-amber-700 font-medium">
            {pendingOrders.length} قيد التجهيز
          </span>
        </Link>

        {/* Ready Orders */}
        <Link 
          to="/orders" 
          className="bg-white p-3.5 sm:p-4 rounded-2xl border border-emerald-900/10 shadow-xs hover:border-emerald-300 transition group"
        >
          <div className="flex justify-between items-start">
            <span className="text-[11px] sm:text-xs text-emerald-800/70 font-semibold">الطلبات المسلّمة</span>
            <div className="p-1.5 bg-emerald-100 text-emerald-900 rounded-lg group-hover:bg-emerald-200 transition">
              <CheckCircle2 className="w-4 h-4 text-emerald-700" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-black text-emerald-950 mt-1">
            {orders.length - pendingOrders.length}
          </p>
          <span className="text-[10px] sm:text-[11px] text-emerald-700 font-medium">
            مكتملة ومستلمة
          </span>
        </Link>

        {/* Fabrics count */}
        <Link 
          to="/inventory" 
          className="bg-white p-3.5 sm:p-4 rounded-2xl border border-emerald-900/10 shadow-xs hover:border-emerald-300 transition group"
        >
          <div className="flex justify-between items-start">
            <span className="text-[11px] sm:text-xs text-emerald-800/70 font-semibold">أنواع الأقمشة</span>
            <div className="p-1.5 bg-emerald-100 text-emerald-900 rounded-lg group-hover:bg-emerald-200 transition">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-black text-emerald-950 mt-1">{fabrics.length}</p>
          <span className="text-[10px] sm:text-[11px] text-emerald-800/70 font-medium">
            {totalMeters} متر مسجل
          </span>
        </Link>

        {/* Low stock fabrics */}
        <Link 
          to="/inventory" 
          className="bg-white p-3.5 sm:p-4 rounded-2xl border border-emerald-900/10 shadow-xs hover:border-emerald-300 transition group"
        >
          <div className="flex justify-between items-start">
            <span className="text-[11px] sm:text-xs text-emerald-800/70 font-semibold">تنبيه المخزون</span>
            <div className="p-1.5 bg-amber-100 text-amber-900 rounded-lg group-hover:bg-amber-200 transition">
              <AlertCircle className="w-4 h-4 text-amber-600" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-black text-amber-700 mt-1">{lowStockFabrics.length}</p>
          <span className="text-[10px] sm:text-[11px] text-amber-800/80 font-medium">
            أقل من مترين
          </span>
        </Link>
      </div>

      {/* Low Stock Warning Banner */}
      {lowStockFabrics.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 p-3 sm:p-3.5 rounded-2xl flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <div>
              <p className="text-xs sm:text-sm font-bold text-amber-950">
                تنبيه: {lowStockFabrics.length} أقمشة قاربت على النفاد
              </p>
              <p className="text-[11px] text-amber-800 truncate max-w-[280px] sm:max-w-md">
                {lowStockFabrics.map(f => f.name).join('، ')}
              </p>
            </div>
          </div>
          <Link 
            to="/inventory" 
            className="text-xs font-bold text-amber-950 bg-amber-200 px-3 py-1.5 rounded-xl hover:bg-amber-300 transition"
          >
            تزويد المخزون
          </Link>
        </div>
      )}

      {/* 2-Column Responsive Section: Recent Orders + AI Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        
        {/* Recent Orders Card */}
        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-emerald-900/10 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold text-sm text-emerald-950 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-emerald-800" />
                آخر الطلبات المسجلة
              </h3>
              <Link to="/orders" className="text-xs text-emerald-800 font-bold hover:underline flex items-center gap-0.5">
                عرض الكل ({orders.length}) <ChevronLeft className="w-3.5 h-3.5" />
              </Link>
            </div>

            {orders.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-xs text-emerald-800/60">لا توجد أي طلبات مسجلة حالياً.</p>
                <Link to="/orders" className="text-emerald-900 text-xs font-bold mt-2 inline-block underline">
                  + أضف أول طلب
                </Link>
              </div>
            ) : (
              <div className="space-y-2.5">
                {orders.slice(0, 5).map((o) => {
                  const { full } = formatDateTime(o.createdAt);
                  const cleanPhone = o.phone?.replace(/[^0-9]/g, '');

                  return (
                    <div 
                      key={o.id} 
                      className="p-3 bg-emerald-50/50 rounded-2xl border border-emerald-900/5 flex items-center justify-between hover:bg-emerald-50 transition"
                    >
                      <div className="flex-1 min-w-0 pr-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-xs sm:text-sm text-emerald-950 truncate">
                            {o.customerName}
                          </span>
                          <span className={`text-[9px] px-1.5 py-0.2 rounded font-semibold ${
                            o.status === 'تم التسليم' 
                              ? 'bg-emerald-100 text-emerald-800' 
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {o.status || 'قيد التجهيز'}
                          </span>
                        </div>
                        <p className="text-[11px] text-emerald-800/70 truncate mt-0.5">
                          {o.details}
                        </p>
                        <p className="text-[9px] text-emerald-800/50 font-mono mt-0.5">
                          {full}
                        </p>
                      </div>

                      <div className="text-left flex-shrink-0 flex items-center gap-2">
                        <div>
                          <span className="font-bold text-xs sm:text-sm text-emerald-950 font-mono block">
                            {Number(o.price || o.total).toFixed(2)} د.ب
                          </span>
                        </div>
                        {cleanPhone && (
                          <a
                            href={`https://wa.me/${cleanPhone}`}
                            target="_blank"
                            rel="noreferrer"
                            title="واتساب"
                            className="w-7 h-7 bg-emerald-100 text-emerald-800 rounded-lg flex items-center justify-center hover:bg-emerald-200 transition"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-emerald-900/10 text-center">
            <Link
              to="/orders"
              className="text-xs font-bold text-emerald-900 hover:text-emerald-700 inline-flex items-center gap-1"
            >
              الانتقال إلى جدول الطلبات الكامل
              <ChevronLeft className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* AI Assistant Insight & Fabrics Summary */}
        <div className="space-y-4">
          {/* AI Assistant Card */}
          <div className="bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950 text-emerald-50 p-5 rounded-3xl shadow-sm border border-emerald-800/40">
            <div className="flex items-center gap-2 mb-2.5">
              <Sparkles className="w-5 h-5 text-amber-300" />
              <span className="text-xs sm:text-sm font-bold text-amber-300">تحليل الذكاء الاصطناعي للمتجر</span>
            </div>
            <p className="text-xs sm:text-sm text-emerald-100/90 leading-relaxed">
              {insights 
                ? (typeof insights === 'string' ? insights : insights?.summary || 'استمر في تسجيل العمليات بدقة لتوليد توصيات مالية ذكية.')
                : 'يتم احتساب وتحليل هوامش الربح ووتيرة المبيعات دورياً لدعم قرارات التسعير والمخزون.'
              }
            </p>
          </div>

          {/* Quick Fabrics Overview Widget */}
          <div className="bg-white p-4 sm:p-5 rounded-3xl border border-emerald-900/10 shadow-xs">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold text-sm text-emerald-950 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-emerald-800" />
                أبرز الأقمشة في المخزون
              </h3>
              <Link to="/inventory" className="text-xs text-emerald-800 font-bold hover:underline flex items-center gap-0.5">
                المخزون ({fabrics.length}) <ChevronLeft className="w-3.5 h-3.5" />
              </Link>
            </div>

            {fabrics.length === 0 ? (
              <p className="text-xs text-emerald-800/60 py-4 text-center">لا توجد أقمشة مسجلة في المخزون بعد.</p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {fabrics.slice(0, 4).map((f) => (
                  <div key={f.id} className="p-2.5 bg-emerald-50/50 rounded-xl border border-emerald-900/5">
                    <p className="font-bold text-xs text-emerald-950 truncate">{f.name}</p>
                    <div className="flex justify-between items-center mt-1 text-[10px] text-emerald-800/70">
                      <span>{f.quantity} متر</span>
                      <span className="font-mono font-bold">{f.price} د.ب</span>
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
