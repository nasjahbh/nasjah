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
    <div className="h-full flex flex-col justify-between gap-1.5 sm:gap-2.5 pb-1 sm:pb-2 select-none overflow-hidden">
      {/* Top Header & Actions */}
      <div className="flex items-center justify-between bg-white px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-2xl border border-[#C7B895]/30 shadow-xs flex-shrink-0">
        <div>
          <h1 className="text-xs sm:text-base font-extrabold text-[#1D3A30]">الميزانية والأرباح</h1>
          <p className="text-[9px] sm:text-[11px] text-[#1D3A30]/70 font-medium">
            التحليل المالي لصافي الأرباح وهوامش العائد لـ &apos;نَسْجَة&apos;
          </p>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            onClick={() => window.print()}
            className="bg-[#FAF7F0] text-[#1D3A30] border border-[#C7B895]/30 px-2 py-1 sm:px-3 sm:py-1.5 rounded-xl text-[11px] sm:text-xs font-bold hover:bg-[#E8D5A8]/40 transition flex items-center gap-1 cursor-pointer"
            title="طباعة التقرير"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-[#A99872]" />
            <span className="hidden sm:inline">طباعة</span>
          </button>
          <button
            onClick={() => setShowResetModal(true)}
            className="bg-rose-50 text-rose-700 px-2 py-1 sm:px-3 sm:py-1.5 rounded-xl text-[11px] sm:text-xs font-bold hover:bg-rose-100 transition border border-rose-200 flex items-center gap-1 cursor-pointer"
            title="تصفير السجلات والبدء من الصفر"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">تصفير</span>
          </button>
        </div>
      </div>

      {/* Top Section: Net Profit Hero */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.99 }} 
        animate={{ opacity: 1, scale: 1 }} 
        className={`p-2.5 sm:p-3.5 rounded-2xl sm:rounded-3xl text-center shadow-xs relative overflow-hidden transition-all flex flex-col justify-center border border-[#C7B895]/30 flex-shrink-0 ${
          netProfit >= 0 
            ? 'bg-gradient-to-br from-[#1D3A30] via-[#24483C] to-[#142922] text-[#FAF7F0]' 
            : 'bg-gradient-to-br from-rose-950 via-rose-900 to-rose-950 text-white'
        }`}
      >
        <p className="text-[10px] sm:text-xs font-medium text-[#E8D5A8]/80 mb-0.5">صافي الأرباح التشغيلية المحققة</p>
        <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight my-0.5 text-white font-mono">
          {netProfit.toFixed(2)} <span className="text-base sm:text-xl font-bold text-[#E8D5A8]">د.ب</span>
        </h2>
        <p className="text-[9px] sm:text-[11px] font-mono text-[#FAF7F0]/80 mt-0.5">
          {netProfit >= 0 ? '✓ أرباح تشغيلية إيجابية ومستقرة' : '⚠ تنبيه: المصروفات تتجاوز الإيرادات'}
        </p>
      </motion.div>

      {/* Bottom Section: Exactly 4 Boxes as a 2x2 Grid (2 on top, 2 below) filling the screen */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3 flex-1 min-h-0">
        
        {/* Box 1 (Top Left in RTL): Cashflow Visual Comparison */}
        <div className="bg-white p-2.5 sm:p-3 rounded-2xl border border-[#C7B895]/30 shadow-xs flex flex-col justify-between overflow-hidden">
          <div className="flex justify-between items-center text-xs">
            <span className="font-extrabold text-[#1D3A30] text-[10px] sm:text-xs truncate">التدفق النقدي</span>
            <span className="text-[10px] sm:text-[11px] text-[#A99872] font-mono font-bold">
              {revenuePercent}% / {100 - revenuePercent}%
            </span>
          </div>

          <div className="my-1 sm:my-1.5 space-y-1">
            <div className="w-full bg-rose-100 rounded-full h-2 sm:h-2.5 flex overflow-hidden">
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
            <div className="flex justify-between text-[9px] sm:text-[11px] font-mono font-bold">
              <span className="text-[#1D3A30] truncate">+{revenues.toFixed(1)} مبيعات</span>
              <span className="text-rose-700 truncate">-{expenses.toFixed(1)} مصروف</span>
            </div>
          </div>

          <div className="text-[9px] sm:text-[10px] text-[#1D3A30]/70 truncate bg-[#FAF7F0] px-2 py-0.5 rounded-lg border border-[#C7B895]/20">
            الحركة: <strong className="font-mono text-[#1D3A30]">{totalCashflow.toFixed(2)} د.ب</strong>
          </div>
        </div>

        {/* Box 2 (Top Right in RTL): Total Revenue (Sales) */}
        <div className="bg-white p-2.5 sm:p-3 rounded-2xl border border-[#C7B895]/30 shadow-xs flex flex-col justify-between overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-[11px] font-bold text-[#1D3A30]/70 uppercase truncate">
              إجمالي المبيعات
            </span>
            <Link 
              to="/orders"
              className="p-1 sm:p-1.5 bg-[#FAF7F0] text-[#1D3A30] border border-[#C7B895]/30 rounded-lg hover:bg-[#E8D5A8]/40 transition"
              title="الطلبات"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div>
            <h3 className="text-base sm:text-2xl font-black text-[#1D3A30] font-mono">
              +{revenues.toFixed(2)} <span className="text-xs font-medium">د.ب</span>
            </h3>
            <p className="text-[9px] sm:text-[10px] text-[#1D3A30]/60 mt-0.5 truncate">من {ordersCount} طلب مبيعات</p>
          </div>

          <div className="text-[9px] sm:text-[10px] text-[#1D3A30]/70 bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-md font-bold truncate">
            ✓ مدخول مسجل وموثق
          </div>
        </div>

        {/* Box 3 (Bottom Left in RTL): Total Expenses */}
        <div className="bg-white p-2.5 sm:p-3 rounded-2xl border border-[#C7B895]/30 shadow-xs flex flex-col justify-between overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-[11px] font-bold text-rose-800/70 uppercase truncate">
              إجمالي المصروفات
            </span>
            <Link 
              to="/expenses"
              className="p-1 sm:p-1.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg hover:bg-rose-100 transition"
              title="المصروفات"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div>
            <h3 className="text-base sm:text-2xl font-black text-rose-700 font-mono">
              -{expenses.toFixed(2)} <span className="text-xs font-medium">د.ب</span>
            </h3>
            <p className="text-[9px] sm:text-[10px] text-[#1D3A30]/60 mt-0.5 truncate">من {expensesCount} بند مصروف</p>
          </div>

          <div className="text-[9px] sm:text-[10px] bg-rose-50 text-rose-800 px-2 py-0.5 rounded-md font-bold truncate">
            نفقات تشغيل ومواد
          </div>
        </div>

        {/* Box 4 (Bottom Right in RTL): Profit Margin */}
        <div className="bg-white p-2.5 sm:p-3 rounded-2xl border border-[#C7B895]/30 shadow-xs flex flex-col justify-between overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-[11px] font-bold text-[#A99872] uppercase truncate">
              هامش الربح التشغيلي
            </span>
            <div className="p-1 bg-[#FAF7F0] text-[#1D3A30] border border-[#C7B895]/30 rounded-lg">
              <Percent className="w-3 h-3 text-[#A99872]" />
            </div>
          </div>

          <div>
            <h3 className="text-base sm:text-2xl font-black text-[#1D3A30] font-mono">
              {profitMargin}%
            </h3>
            <div className="w-full bg-[#FAF7F0] border border-[#C7B895]/20 rounded-full h-1.5 overflow-hidden mt-1">
              <div 
                className="bg-[#1D3A30] h-full rounded-full transition-all duration-500" 
                style={{ width: `${Math.min(100, Math.max(0, Number(profitMargin)))}%` }} 
              />
            </div>
          </div>

          <div className="text-[9px] sm:text-[10px] text-[#1D3A30]/70 bg-[#FAF7F0] px-2 py-0.5 rounded-md font-bold truncate">
            معدل العائد من الإيراد
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
