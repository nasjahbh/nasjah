import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShoppingBag, ChevronLeft, Check, Clock, CheckCircle2,
  Sparkles, RefreshCw, BarChart3, ShieldCheck, Layers, Zap
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatDateTime } from '../lib/dateUtils';
import WhatsAppIcon from '../components/WhatsAppIcon';
import { getLocalData, persistOrders, syncWithServer, EVENT_DATA_UPDATED } from '../lib/dataService';
import { cn } from '../lib/utils';

interface AIAnalysisData {
  executive_summary: string;
  financial_indicator: string;
  operational_efficiency: string;
  inventory_guidance: string;
}

export default function Dashboard() {
  const [sales, setSales] = useState(0);
  const [expenses, setExpenses] = useState(0);
  const [orders, setOrders] = useState<any[]>([]);
  const [analysis, setAnalysis] = useState<AIAnalysisData | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [lastAnalyzedAt, setLastAnalyzedAt] = useState<string>('');

  const reloadDashboardData = useCallback(() => {
    const local = getLocalData();
    setOrders(local.orders);
    const totalSales = local.orders.reduce((sum: number, order: any) => sum + (order.total || order.price || 0), 0) || 0;
    setSales(totalSales);

    const totalExp = local.expenses.reduce((sum: number, exp: any) => sum + (Number(exp.amount) || 0), 0) || 0;
    setExpenses(totalExp);

    return { totalSales, totalExp, local };
  }, []);

  const runAIAnalysis = useCallback(async () => {
    setIsAnalyzing(true);
    try {
      const local = getLocalData();
      const currentOrders = local.orders || [];
      const currentExpenses = local.expenses || [];
      const currentFabrics = local.inventory || [];

      const totalSales = currentOrders.reduce((sum: number, o: any) => sum + (o.total || o.price || 0), 0) || 0;
      const totalExp = currentExpenses.reduce((sum: number, e: any) => sum + (Number(e.amount) || 0), 0) || 0;
      const pendingCount = currentOrders.filter((o: any) => o.status !== 'تم التسليم').length;
      const deliveredCount = currentOrders.length - pendingCount;
      const totalMeters = currentFabrics.reduce((sum: number, f: any) => sum + (Number(f.quantity) || 0), 0);
      const lowStockCount = currentFabrics.filter((f: any) => (Number(f.quantity) || 0) < 5).length;

      const response = await fetch('/api/ai-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sales: totalSales,
          expenses: totalExp,
          netProfit: totalSales - totalExp,
          ordersCount: currentOrders.length,
          pendingOrdersCount: pendingCount,
          deliveredOrdersCount: deliveredCount,
          fabricsCount: currentFabrics.length,
          totalFabricMeters: Math.round(totalMeters * 10) / 10,
          lowStockFabricsCount: lowStockCount
        })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.analysis) {
          setAnalysis(result.analysis);
          setLastAnalyzedAt(new Date().toLocaleTimeString('ar-BH', { hour: '2-digit', minute: '2-digit' }));
        }
      }
    } catch (err) {
      console.error('Failed to run AI analysis', err);
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  useEffect(() => {
    reloadDashboardData();
    runAIAnalysis();

    syncWithServer().then(() => {
      reloadDashboardData();
    });

    const handleDataEvent = () => {
      reloadDashboardData();
    };

    window.addEventListener(EVENT_DATA_UPDATED, handleDataEvent);

    return () => {
      window.removeEventListener(EVENT_DATA_UPDATED, handleDataEvent);
    };
  }, [reloadDashboardData, runAIAnalysis]);

  const netProfit = sales - expenses;
  const pendingOrders = orders.filter(o => o.status !== 'تم التسليم');

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
    <div className="space-y-4 lg:space-y-5 pb-6">
      {/* Main Stats Row: Net Profit Hero */}
      <motion.div 
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className={`p-5 sm:p-6 rounded-3xl text-center shadow-md relative overflow-hidden transition-all flex flex-col justify-between border ${
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

      {/* Side-by-Side Split Row: Total Orders Card & Recent Orders Card (مربعان أفقيان متساويان) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5 sm:gap-4 items-stretch">
        
        {/* Box 1: Total Orders Summary Card */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-white p-5 sm:p-6 rounded-3xl border border-[#C7B895]/30 shadow-xs flex flex-col justify-between h-full"
        >
          <div>
            <div className="flex justify-between items-start mb-3">
              <div>
                <span className="text-sm font-extrabold text-[#1D3A30]">إجمالي الطلبات</span>
                <p className="text-[11px] text-[#1D3A30]/60 mt-0.5">سجل ومبيعات المتجر التراكمية</p>
              </div>
              <div className="p-2.5 bg-[#FAF7F0] text-[#1D3A30] rounded-2xl border border-[#C7B895]/30">
                <ShoppingBag className="w-5 h-5 text-[#1D3A30]" />
              </div>
            </div>

            <div className="my-4">
              <p className="text-4xl sm:text-5xl font-black text-[#1D3A30] font-mono">{orders.length}</p>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <span className="text-xs font-bold text-[#A99872] bg-[#FAF7F0] px-3 py-1 rounded-xl border border-[#C7B895]/30">
                  {pendingOrders.length} قيد التجهيز
                </span>
                <span className="text-xs font-semibold text-[#1D3A30]/70 bg-[#FAF7F0] px-3 py-1 rounded-xl border border-[#C7B895]/20">
                  {orders.length - pendingOrders.length} تم تسليمها
                </span>
              </div>
            </div>

            <div className="p-3.5 bg-[#FAF7F0]/70 rounded-2xl border border-[#C7B895]/20 text-xs text-[#1D3A30]/80 space-y-1.5 my-3">
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-[#1D3A30]/60">معدل الإنجاز العام:</span>
                <span className="font-bold font-mono text-[#1D3A30]">
                  {orders.length > 0 ? Math.round(((orders.length - pendingOrders.length) / orders.length) * 100) : 0}%
                </span>
              </div>
              <div className="w-full bg-[#E8D5A8]/30 h-1.5 rounded-full overflow-hidden">
                <div 
                  className="bg-[#1D3A30] h-full rounded-full transition-all duration-500"
                  style={{ width: `${orders.length > 0 ? Math.round(((orders.length - pendingOrders.length) / orders.length) * 100) : 0}%` }}
                />
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-[#C7B895]/20 mt-auto">
            <Link
              to="/orders"
              className="w-full bg-[#1D3A30] hover:bg-[#25493D] text-[#E8D5A8] py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs border border-[#C7B895]/30 active:scale-95"
            >
              <span>الانتقال لجدول الطلبات الكامل</span>
              <ChevronLeft className="w-3.5 h-3.5 text-[#C7B895]" />
            </Link>
          </div>
        </motion.div>

        {/* Box 2: Recent Orders Card (مربع آخر الطلبات المسجلة قيد التجهيز) */}
        <motion.div 
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="bg-white rounded-3xl p-5 sm:p-6 border border-[#C7B895]/30 shadow-xs flex flex-col justify-between h-full"
        >
          <div>
            <div className="flex justify-between items-center mb-3">
              <div>
                <h3 className="font-extrabold text-sm text-[#1D3A30] flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-[#A99872]" />
                  آخر الطلبات المسجلة (قيد التجهيز)
                </h3>
                <p className="text-[11px] text-[#1D3A30]/60 mt-0.5">متابعة وتسليم فوري للطلبات الحالية</p>
              </div>
              <Link to="/orders" className="text-xs text-[#1D3A30] font-bold hover:underline flex items-center gap-0.5 flex-shrink-0">
                عرض الكل ({orders.length}) <ChevronLeft className="w-3.5 h-3.5" />
              </Link>
            </div>

            {orders.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-xs text-[#1D3A30]/60">لا توجد أي طلبات مسجلة حالياً.</p>
                <Link to="/orders" className="text-[#1D3A30] text-xs font-bold mt-2 inline-block underline">
                  + أضف أول طلب
                </Link>
              </div>
            ) : pendingOrders.length === 0 ? (
              <div className="py-8 text-center bg-[#FAF7F0] rounded-2xl border border-dashed border-[#C7B895]/40 p-4 my-2">
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
              <div className="space-y-2.5 max-h-[290px] overflow-y-auto pr-1">
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
                        className="p-2.5 sm:p-3 bg-[#FAF7F0] rounded-2xl border border-[#C7B895]/20 flex items-center justify-between hover:bg-[#F4EBD4]/40 transition"
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
                            className="w-7.5 h-7.5 bg-[#1D3A30] hover:bg-[#25493D] active:scale-90 text-[#E8D5A8] rounded-xl flex items-center justify-center transition shadow-xs border border-[#C7B895]/40 cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5 stroke-[2.5]" />
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
                              <WhatsAppIcon className="w-3.5 h-3.5" />
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

          <div className="pt-3 border-t border-[#C7B895]/20 mt-3 text-center">
            <span className="text-[11px] text-[#1D3A30]/60">
              يتم إظهار أحدث 5 طلبات قيد التجهيز مع إمكانية التسليم والمراسلة الفورية
            </span>
          </div>
        </motion.div>
      </div>

      {/* AI Performance Analysis Section (At the Bottom of the Page - Gemini 3.8 Flash) */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.12 }}
        className="bg-white rounded-3xl p-4 sm:p-5 border border-[#C7B895]/35 shadow-xs relative overflow-hidden"
      >
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 mb-3.5 border-b border-[#C7B895]/20">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-[#1D3A30] text-[#E8D5A8] flex items-center justify-center flex-shrink-0 border border-[#C7B895]/30 shadow-2xs">
              <Sparkles className="w-4.5 h-4.5 text-[#E8D5A8]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-sm sm:text-base text-[#1D3A30]">
                  التحليل التنفيذي الذكي للأداء
                </h3>
                <span className="text-[10px] font-bold bg-[#FAF7F0] text-[#1D3A30] px-2 py-0.5 rounded-md border border-[#C7B895]/40 font-mono">
                  Gemini 3.8 Flash
                </span>
              </div>
              <p className="text-[11px] text-[#1D3A30]/60 mt-0.5">
                قراءة تشغيلية ومالية فورية وسريعة مستندة إلى أرقام وسجلات المتجر اللحظية
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-end sm:self-auto">
            {lastAnalyzedAt && (
              <span className="text-[10px] text-[#1D3A30]/50 font-mono hidden md:inline">
                رُصِد في: {lastAnalyzedAt}
              </span>
            )}
            <button
              onClick={() => runAIAnalysis()}
              disabled={isAnalyzing}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FAF7F0] hover:bg-[#F4EBD4] text-[#1D3A30] rounded-xl border border-[#C7B895]/40 text-xs font-bold transition active:scale-95 disabled:opacity-60 shadow-2xs cursor-pointer"
              title="إعادة تشغيل التحليل الفوري"
            >
              <RefreshCw className={cn("w-3.5 h-3.5 text-[#1D3A30]", isAnalyzing && "animate-spin text-[#A99872]")} />
              <span>{isAnalyzing ? "جارِ التحليل الفوري..." : "تحديث التحليل"}</span>
            </button>
          </div>
        </div>

        {/* 4 Professional KPI Cards */}
        {isAnalyzing && !analysis ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="p-4 bg-[#FAF7F0]/60 rounded-2xl border border-[#C7B895]/20 animate-pulse space-y-2">
                <div className="h-3.5 bg-[#C7B895]/30 rounded-md w-1/2" />
                <div className="h-3 bg-[#C7B895]/20 rounded-md w-full" />
                <div className="h-3 bg-[#C7B895]/20 rounded-md w-4/5" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Card 1: Executive Summary */}
            <div className="p-3.5 sm:p-4 bg-[#FAF7F0] rounded-2xl border border-[#C7B895]/25 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2 text-[#1D3A30]">
                  <BarChart3 className="w-4 h-4 text-[#A99872]" />
                  <span className="text-xs font-extrabold">الموجز التنفيذي للأداء</span>
                </div>
                <p className="text-xs text-[#1D3A30]/85 leading-relaxed font-medium">
                  {analysis?.executive_summary || "سجل المتجر جاهز ومتكامل لتوثيق حركة المبيعات وتكاليف التشغيل."}
                </p>
              </div>
              <div className="mt-3 pt-2 border-t border-[#C7B895]/15 flex items-center justify-between text-[10px] text-[#1D3A30]/50 font-medium">
                <span>المبيعات والأرباح</span>
                <span className="font-mono text-[#1D3A30] font-bold">{sales.toFixed(2)} د.ب</span>
              </div>
            </div>

            {/* Card 2: Financial Health */}
            <div className="p-3.5 sm:p-4 bg-[#FAF7F0] rounded-2xl border border-[#C7B895]/25 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2 text-[#1D3A30]">
                  <ShieldCheck className="w-4 h-4 text-[#A99872]" />
                  <span className="text-xs font-extrabold">الانضباط والعائد المالي</span>
                </div>
                <p className="text-xs text-[#1D3A30]/85 leading-relaxed font-medium">
                  {analysis?.financial_indicator || "متابعة دقيقة للتكاليف وهوامش الربحية لضمان تدفق نقدي آمن."}
                </p>
              </div>
              <div className="mt-3 pt-2 border-t border-[#C7B895]/15 flex items-center justify-between text-[10px] text-[#1D3A30]/50 font-medium">
                <span>صافي العائد</span>
                <span className={`font-mono font-bold ${netProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {netProfit.toFixed(2)} د.ب
                </span>
              </div>
            </div>

            {/* Card 3: Operational Efficiency */}
            <div className="p-3.5 sm:p-4 bg-[#FAF7F0] rounded-2xl border border-[#C7B895]/25 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2 text-[#1D3A30]">
                  <Clock className="w-4 h-4 text-[#A99872]" />
                  <span className="text-xs font-extrabold">الكفاءة التشغيلية والطلبات</span>
                </div>
                <p className="text-xs text-[#1D3A30]/85 leading-relaxed font-medium">
                  {analysis?.operational_efficiency || "انتظام دورة تنفيذ طلبات التفصيل وتسليمها للزبائن بالمواعيد المحددة."}
                </p>
              </div>
              <div className="mt-3 pt-2 border-t border-[#C7B895]/15 flex items-center justify-between text-[10px] text-[#1D3A30]/50 font-medium">
                <span>نسبة الإنجاز</span>
                <span className="font-mono text-[#1D3A30] font-bold">
                  {orders.length > 0 ? Math.round(((orders.length - pendingOrders.length) / orders.length) * 100) : 0}%
                </span>
              </div>
            </div>

            {/* Card 4: Inventory Guidance */}
            <div className="p-3.5 sm:p-4 bg-[#FAF7F0] rounded-2xl border border-[#C7B895]/25 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2 text-[#1D3A30]">
                  <Layers className="w-4 h-4 text-[#A99872]" />
                  <span className="text-xs font-extrabold">جاهزية المخزون والتوريد</span>
                </div>
                <p className="text-xs text-[#1D3A30]/85 leading-relaxed font-medium">
                  {analysis?.inventory_guidance || "رصد مستمر لتوفر أمتار الأقمشة لتفادي أي عجز أثناء مراحل التفصيل."}
                </p>
              </div>
              <div className="mt-3 pt-2 border-t border-[#C7B895]/15 flex items-center justify-between text-[10px] text-[#1D3A30]/50 font-medium">
                <span>طلبات مفتوحة</span>
                <span className="font-mono text-[#1D3A30] font-bold">{pendingOrders.length} طلب</span>
              </div>
            </div>
          </div>
        )}
      </motion.div>

    </div>
  );
}

