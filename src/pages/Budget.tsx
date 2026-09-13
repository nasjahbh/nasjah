import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { TrendingUp, TrendingDown, DollarSign, Percent, ArrowLeft, RotateCcw, AlertTriangle, FileSpreadsheet, ChevronLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getLocalData, resetDatabase, syncWithServer, EVENT_DATA_UPDATED } from '../lib/dataService';

export default function Budget() {
  const [revenues, setRevenues] = useState(0);
  const [expenses, setExpenses] = useState(0);
  const [ordersCount, setOrdersCount] = useState(0);
  const [expensesCount, setExpensesCount] = useState(0);
  const [showResetModal, setShowResetModal] = useState(false);

  const loadData = () => {
    const { orders, expenses: expList } = getLocalData();
    const totalSales = orders.reduce((sum: number, order: any) => sum + (order.total || order.price || 0), 0);
    setRevenues(totalSales);
    setOrdersCount(orders.length);

    const totalExp = expList.reduce((sum: number, exp: any) => sum + (Number(exp.amount) || 0), 0);
    setExpenses(totalExp);
    setExpensesCount(expList.length);
  };

  useEffect(() => {
    loadData();
    syncWithServer().then(() => loadData());

    const handleUpdate = () => loadData();
    window.addEventListener(EVENT_DATA_UPDATED, handleUpdate);
    return () => window.removeEventListener(EVENT_DATA_UPDATED, handleUpdate);
  }, []);

  const netProfit = revenues - expenses;
  const profitMargin = revenues > 0 ? ((netProfit / revenues) * 100).toFixed(1) : '0.0';

  const handleResetData = async () => {
    await resetDatabase();
    loadData();
    setShowResetModal(false);
  };

  const totalCashflow = revenues + expenses;
  const revenuePercent = totalCashflow > 0 ? Math.round((revenues / totalCashflow) * 100) : 50;

  return (
    <div className="space-y-4 lg:space-y-6 pb-6">
      {/* Top Header & Actions */}
      <div className="flex items-center justify-between bg-white px-4 py-3 sm:px-5 sm:py-3.5 rounded-2xl border border-[#C7B895]/30 shadow-xs">
        <div>
          <h1 className="text-base sm:text-lg font-extrabold text-[#1D3A30]">الميزانية والأرباح</h1>
          <p className="text-[11px] text-[#1D3A30]/70 font-medium">
            التحليل المالي لصافي الأرباح وهوامش العائد لدار نَسْجَة للأقمشة
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="bg-[#FAF7F0] text-[#1D3A30] border border-[#C7B895]/30 p-2 sm:px-3 sm:py-2 rounded-xl text-xs font-bold hover:bg-[#E8D5A8]/40 transition flex items-center gap-1.5"
            title="طباعة التقرير"
          >
            <FileSpreadsheet className="w-4 h-4 text-[#A99872]" />
            <span className="hidden sm:inline">طباعة التقرير</span>
          </button>
          <button
            onClick={() => setShowResetModal(true)}
            className="bg-rose-50 text-rose-700 p-2 sm:px-3 sm:py-2 rounded-xl text-xs font-bold hover:bg-rose-100 transition border border-rose-200 flex items-center gap-1.5"
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
          className={`p-5 sm:p-6 rounded-3xl text-center shadow-md relative overflow-hidden transition-all flex flex-col justify-between border border-[#C7B895]/30 ${
            netProfit >= 0 
              ? 'bg-gradient-to-br from-[#1D3A30] via-[#24483C] to-[#142922] text-[#FAF7F0]' 
              : 'bg-gradient-to-br from-rose-950 via-rose-900 to-rose-950 text-white'
          }`}
        >
          <div className="inline-flex p-2.5 rounded-2xl bg-white/10 mx-auto mb-2 border border-white/10">
            <DollarSign className="w-6 h-6 text-[#E8D5A8]" />
          </div>
          <p className="text-[11px] sm:text-xs font-medium text-[#E8D5A8]/80 mb-0.5">صافي الأرباح الصافية للمتجر</p>
          <h2 className="text-3xl sm:text-5xl font-black tracking-tight my-1 text-white">
            {netProfit.toFixed(2)} <span className="text-lg sm:text-xl font-bold text-[#E8D5A8]">د.ب</span>
          </h2>
          <p className="mt-2 text-[11px] font-mono text-[#FAF7F0]/80">
            {netProfit >= 0 ? '✓ أرباح تشغيلية إيجابية ومستقرة' : '⚠ تنبيه: المصروفات تتجاوز الإيرادات'}
          </p>
        </motion.div>

        {/* Cashflow Comparison Visual Bar */}
        <div className="bg-white p-5 sm:p-6 rounded-3xl border border-[#C7B895]/30 shadow-xs flex flex-col justify-between space-y-3">
          <div>
            <div className="flex justify-between items-center text-xs sm:text-sm mb-1">
              <span className="font-extrabold text-[#1D3A30]">مقارنة التدفق النقدي الشامل</span>
              <span className="text-[11px] text-[#A99872] font-mono font-bold">
                {revenuePercent}% مبيعات / {100 - revenuePercent}% مصروفات
              </span>
            </div>
            <p className="text-[11px] text-[#1D3A30]/60">
              توازن السيولة النقدية ومعدل استنزاف المصروفات مقارنة بالمبيعات
            </p>
          </div>

          <div className="space-y-2 my-2">
            <div className="w-full bg-rose-100 rounded-full h-3 flex overflow-hidden">
              <div 
                className="bg-[#1D3A30] h-full transition-all duration-500" 
                style={{ width: `${revenuePercent}%` }}
                title={`الإيرادات: ${revenuePercent}%`}
              />
              <div 
                className="bg-rose-500 h-full transition-all duration-500" 
                style={{ width: `${100 - revenuePercent}%` }}
                title={`المصروفات: ${100 - revenuePercent}%`}
              />
            </div>
            <div className="flex justify-between text-xs font-mono pt-1 font-bold">
              <span className="text-[#1D3A30]">+{revenues.toFixed(2)} د.ب مبيعات</span>
              <span className="text-rose-700">-{expenses.toFixed(2)} د.ب مصروفات</span>
            </div>
          </div>

          <div className="p-3 bg-[#FAF7F0] rounded-2xl border border-[#C7B895]/30 text-[11px] text-[#1D3A30]">
            مجموع الحركة المالية الكلية في المتجر: <strong className="font-mono text-[#1D3A30]">{totalCashflow.toFixed(2)} د.ب</strong>
          </div>
        </div>

      </div>

      {/* Metric Breakdown Cards (1 col mobile, 3 cols tablet/desktop) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 sm:gap-4">
        {/* Revenue Card */}
        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-[#C7B895]/30 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] sm:text-[11px] font-bold text-[#1D3A30]/70 uppercase block">
              إجمالي الإيرادات (المبيعات)
            </span>
            <h3 className="text-xl sm:text-2xl font-black text-[#1D3A30] font-mono mt-1">
              +{revenues.toFixed(2)} د.ب
            </h3>
            <p className="text-[11px] text-[#1D3A30]/60 mt-0.5">من {ordersCount} طلب مبيعات</p>
          </div>
          <Link 
            to="/orders"
            className="p-2.5 bg-[#FAF7F0] text-[#1D3A30] border border-[#C7B895]/30 rounded-2xl hover:bg-[#E8D5A8]/40 transition"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
        </div>

        {/* Expenses Card */}
        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-[#C7B895]/30 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] sm:text-[11px] font-bold text-rose-800/70 uppercase block">
              إجمالي المصروفات والنفقات
            </span>
            <h3 className="text-xl sm:text-2xl font-black text-rose-700 font-mono mt-1">
              -{expenses.toFixed(2)} د.ب
            </h3>
            <p className="text-[11px] text-[#1D3A30]/60 mt-0.5">من {expensesCount} بند مصروف</p>
          </div>
          <Link 
            to="/expenses"
            className="p-2.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-2xl hover:bg-rose-100 transition"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
        </div>

        {/* Profit Margin Card */}
        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-[#C7B895]/30 shadow-xs space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-[11px] font-bold text-[#A99872] uppercase">
              هامش الربح التشغيلي
            </span>
            <div className="p-1.5 bg-[#FAF7F0] text-[#1D3A30] border border-[#C7B895]/30 rounded-xl">
              <Percent className="w-4 h-4 text-[#A99872]" />
            </div>
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-[#1D3A30] font-mono">
            {profitMargin}%
          </h3>
          <div className="w-full bg-[#FAF7F0] border border-[#C7B895]/20 rounded-full h-2 overflow-hidden">
            <div 
              className="bg-[#1D3A30] h-full rounded-full transition-all duration-500" 
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
              className="relative bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl z-10 text-center space-y-3 border border-[#C7B895]/30"
            >
              <div className="w-12 h-12 bg-rose-50 text-rose-600 border border-rose-200 rounded-2xl flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-[#1D3A30]">تصفير سجل العمليات والبدء من جديد</h3>
              <p className="text-xs text-[#1D3A30]/70 leading-relaxed">
                هل ترغب في مسح جميع الطلبات والمصروفات المسجلة للبدء بسجل مالي نظيف من الصفر؟ (لن يتم حذف أقمشة المخزون).
              </p>
              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  onClick={handleResetData}
                  className="py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl transition text-xs shadow-xs"
                >
                  نعم، تصفير السجل
                </button>
                <button
                  onClick={() => setShowResetModal(false)}
                  className="py-2.5 bg-stone-100 text-stone-700 hover:bg-stone-200 font-bold rounded-xl transition text-xs border border-stone-200"
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
