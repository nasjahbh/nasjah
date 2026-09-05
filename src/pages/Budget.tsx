import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { TrendingUp, TrendingDown, DollarSign, Percent, ArrowLeft, RotateCcw, AlertTriangle, FileSpreadsheet, ChevronLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Budget() {
  const [revenues, setRevenues] = useState(0);
  const [expenses, setExpenses] = useState(0);
  const [ordersCount, setOrdersCount] = useState(0);
  const [expensesCount, setExpensesCount] = useState(0);
  const [showResetModal, setShowResetModal] = useState(false);

  const loadData = () => {
    const savedOrders = JSON.parse(localStorage.getItem('ordersData') || '[]');
    const totalSales = savedOrders.reduce((sum: number, order: any) => sum + (order.total || order.price || 0), 0);
    setRevenues(totalSales);
    setOrdersCount(savedOrders.length);

    const savedExpenses = JSON.parse(localStorage.getItem('expensesData') || '[]');
    const totalExp = savedExpenses.reduce((sum: number, exp: any) => sum + (Number(exp.amount) || 0), 0);
    setExpenses(totalExp);
    setExpensesCount(savedExpenses.length);
  };

  useEffect(() => {
    loadData();
  }, []);

  const netProfit = revenues - expenses;
  const profitMargin = revenues > 0 ? ((netProfit / revenues) * 100).toFixed(1) : '0.0';

  const handleResetData = () => {
    localStorage.removeItem('ordersData');
    localStorage.removeItem('expensesData');
    localStorage.removeItem('insights_timestamp');
    localStorage.removeItem('insights_data');
    loadData();
    setShowResetModal(false);
  };

  const totalCashflow = revenues + expenses;
  const revenuePercent = totalCashflow > 0 ? Math.round((revenues / totalCashflow) * 100) : 50;

  return (
    <div className="space-y-4 lg:space-y-6 pb-6">
      {/* Top Header & Actions */}
      <div className="flex items-center justify-between bg-white px-4 py-3 sm:px-5 sm:py-3.5 rounded-2xl border border-emerald-900/10 shadow-xs">
        <div>
          <h1 className="text-base sm:text-lg font-extrabold text-emerald-950">الميزانية والأرباح</h1>
          <p className="text-[11px] text-emerald-800/60 font-medium">
            التحليل المالي لصافي الأرباح وهوامش العائد لأتيليه نَسْجَة
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="bg-emerald-100 text-emerald-900 p-2 sm:px-3 sm:py-2 rounded-xl text-xs font-bold hover:bg-emerald-200 transition flex items-center gap-1.5"
            title="طباعة التقرير"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span className="hidden sm:inline">طباعة التقرير</span>
          </button>
          <button
            onClick={() => setShowResetModal(true)}
            className="bg-red-50 text-red-600 p-2 sm:px-3 sm:py-2 rounded-xl text-xs font-bold hover:bg-red-100 transition border border-red-200 flex items-center gap-1.5"
            title="تصفير السجلات والبدء من الصفر"
          >
            <RotateCcw className="w-4 h-4" />
            <span className="hidden sm:inline">تصفير السجل</span>
          </button>
        </div>
      </div>

      {/* Top 2-Column Section: Profit Hero + Cashflow Bar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-5">
        
        {/* Main Net Profit Card */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }} 
          animate={{ opacity: 1, scale: 1 }} 
          className={`p-5 sm:p-6 rounded-3xl text-center shadow-md relative overflow-hidden transition-all flex flex-col justify-between ${
            netProfit >= 0 
              ? 'bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950 text-emerald-50' 
              : 'bg-gradient-to-br from-red-950 via-red-900 to-red-950 text-white'
          }`}
        >
          <div className="inline-flex p-2.5 rounded-2xl bg-white/10 mx-auto mb-2">
            <DollarSign className="w-6 h-6 text-amber-300" />
          </div>
          <p className="text-[11px] sm:text-xs font-medium opacity-80 mb-0.5">صافي الأرباح الصافية للمتجر</p>
          <h2 className="text-3xl sm:text-5xl font-black tracking-tight my-1">
            {netProfit.toFixed(2)} <span className="text-lg sm:text-xl font-bold text-amber-300">د.ب</span>
          </h2>
          <p className="mt-2 text-[11px] font-mono opacity-80">
            {netProfit >= 0 ? '✓ أرباح تشغيلية إيجابية ومستقرة' : '⚠ تنبيه: المصروفات تتجاوز الإيرادات'}
          </p>
        </motion.div>

        {/* Cashflow Comparison Visual Bar */}
        <div className="bg-white p-5 sm:p-6 rounded-3xl border border-emerald-900/10 shadow-xs flex flex-col justify-between space-y-3">
          <div>
            <div className="flex justify-between items-center text-xs sm:text-sm mb-1">
              <span className="font-extrabold text-emerald-950">مقارنة التدفق النقدي الشامل</span>
              <span className="text-[11px] text-emerald-800/70 font-mono font-bold">
                {revenuePercent}% مبيعات / {100 - revenuePercent}% مصروفات
              </span>
            </div>
            <p className="text-[11px] text-emerald-800/60">
              توازن السيولة النقدية ومعدل استنزاف المصروفات مقارنة بالمبيعات
            </p>
          </div>

          <div className="space-y-2 my-2">
            <div className="w-full bg-red-100 rounded-full h-3 flex overflow-hidden">
              <div 
                className="bg-emerald-600 h-full transition-all duration-500" 
                style={{ width: `${revenuePercent}%` }}
                title={`الإيرادات: ${revenuePercent}%`}
              />
              <div 
                className="bg-red-500 h-full transition-all duration-500" 
                style={{ width: `${100 - revenuePercent}%` }}
                title={`المصروفات: ${100 - revenuePercent}%`}
              />
            </div>
            <div className="flex justify-between text-xs font-mono pt-1 text-emerald-800/90 font-bold">
              <span className="text-emerald-700">+{revenues.toFixed(2)} د.ب مبيعات</span>
              <span className="text-red-700">-{expenses.toFixed(2)} د.ب مصروفات</span>
            </div>
          </div>

          <div className="p-3 bg-emerald-50/60 rounded-2xl border border-emerald-900/5 text-[11px] text-emerald-900/80">
            مجموع الحركة المالية الكلية في المتجر: <strong className="font-mono text-emerald-950">{totalCashflow.toFixed(2)} د.ب</strong>
          </div>
        </div>

      </div>

      {/* Metric Breakdown Cards (1 col mobile, 3 cols tablet/desktop) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 sm:gap-4">
        {/* Revenue Card */}
        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-emerald-900/10 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] sm:text-[11px] font-bold text-emerald-800/70 uppercase block">
              إجمالي الإيرادات (المبيعات)
            </span>
            <h3 className="text-xl sm:text-2xl font-black text-emerald-950 font-mono mt-1">
              +{revenues.toFixed(2)} د.ب
            </h3>
            <p className="text-[11px] text-emerald-800/60 mt-0.5">من {ordersCount} طلب مبيعات</p>
          </div>
          <Link 
            to="/orders"
            className="p-2.5 bg-emerald-100 text-emerald-900 rounded-2xl hover:bg-emerald-200 transition"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
        </div>

        {/* Expenses Card */}
        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-emerald-900/10 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] sm:text-[11px] font-bold text-red-800/70 uppercase block">
              إجمالي المصروفات والنفقات
            </span>
            <h3 className="text-xl sm:text-2xl font-black text-red-700 font-mono mt-1">
              -{expenses.toFixed(2)} د.ب
            </h3>
            <p className="text-[11px] text-emerald-800/60 mt-0.5">من {expensesCount} بند مصروف</p>
          </div>
          <Link 
            to="/expenses"
            className="p-2.5 bg-red-100 text-red-900 rounded-2xl hover:bg-red-200 transition"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
        </div>

        {/* Profit Margin Card */}
        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-emerald-900/10 shadow-xs space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-[11px] font-bold text-amber-800/70 uppercase">
              هامش الربح التشغيلي
            </span>
            <div className="p-1.5 bg-amber-100 text-amber-900 rounded-xl">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-emerald-950 font-mono">
            {profitMargin}%
          </h3>
          <div className="w-full bg-emerald-100 rounded-full h-2 overflow-hidden">
            <div 
              className="bg-emerald-700 h-full rounded-full transition-all duration-500" 
              style={{ width: `${Math.min(100, Math.max(0, Number(profitMargin)))}%` }} 
            />
          </div>
        </div>
      </div>

      {/* Confirmation Modal for Reset */}
      <AnimatePresence>
        {showResetModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 0.6 }} 
              exit={{ opacity: 0 }}
              onClick={() => setShowResetModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-xs"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl z-10 text-center space-y-3"
            >
              <div className="w-12 h-12 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-emerald-950">تصفير سجل العمليات والبدء من جديد</h3>
              <p className="text-xs text-emerald-800/70 leading-relaxed">
                هل ترغب في مسح جميع الطلبات والمصروفات المسجلة للبدء بسجل مالي نظيف من الصفر؟ (لن يتم حذف أقمشة المخزون).
              </p>
              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  onClick={handleResetData}
                  className="py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition text-xs shadow-xs"
                >
                  نعم، تصفير السجل
                </button>
                <button
                  onClick={() => setShowResetModal(false)}
                  className="py-2.5 bg-slate-100 text-slate-700 hover:bg-slate-200 font-bold rounded-xl transition text-xs"
                >
                  إلغاء
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
