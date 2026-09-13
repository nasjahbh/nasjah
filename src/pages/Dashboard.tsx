import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShoppingBag, ChevronLeft, Check, Clock, CheckCircle2,
  Sparkles, RefreshCw, BarChart3, ShieldCheck, Layers, X,
  Instagram, TrendingUp, ExternalLink, ArrowRight
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatDateTime } from '../lib/dateUtils';
import WhatsAppIcon from '../components/WhatsAppIcon';
import { getLocalData, persistOrders, syncWithServer, EVENT_DATA_UPDATED } from '../lib/dataService';
import { requestAIAnalysis, AIAnalysisData } from '../lib/aiAnalysisService';
import { cn } from '../lib/utils';

export default function Dashboard() {
  const [sales, setSales] = useState(0);
  const [expenses, setExpenses] = useState(0);
  const [orders, setOrders] = useState<any[]>([]);
  
  // AI & Instagram Modal state - ONLY triggered on demand
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [analysis, setAnalysis] = useState<AIAnalysisData | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [lastAnalyzedAt, setLastAnalyzedAt] = useState<string>('');
  const [instagramUsername, setInstagramUsername] = useState<string>('nasjah.bh');
  const [isEditingInsta, setIsEditingInsta] = useState(false);
  const [tempInsta, setTempInsta] = useState('nasjah.bh');

  const reloadDashboardData = useCallback(() => {
    const local = getLocalData();
    setOrders(local.orders);
    const totalSales = local.orders.reduce((sum: number, order: any) => sum + (order.total || order.price || 0), 0) || 0;
    setSales(totalSales);

    const totalExp = local.expenses.reduce((sum: number, exp: any) => sum + (Number(exp.amount) || 0), 0) || 0;
    setExpenses(totalExp);

    return { totalSales, totalExp, local };
  }, []);

  // On-demand AI & Instagram analysis - ONLY called when user requests it!
  const triggerAIAnalysis = useCallback(async (targetInsta?: string) => {
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

      const result = await requestAIAnalysis({
        sales: totalSales,
        expenses: totalExp,
        netProfit: totalSales - totalExp,
        ordersCount: currentOrders.length,
        pendingOrdersCount: pendingCount,
        deliveredOrdersCount: deliveredCount,
        fabricsCount: currentFabrics.length,
        totalFabricMeters: Math.round(totalMeters * 10) / 10,
        lowStockFabricsCount: lowStockCount,
        instagramUsername: targetInsta || instagramUsername
      });

      if (result) {
        setAnalysis(result);
        setLastAnalyzedAt(new Date().toLocaleTimeString('ar-BH', { hour: '2-digit', minute: '2-digit' }));
      }
    } catch {
      // Fallback is handled automatically inside requestAIAnalysis
    } finally {
      setIsAnalyzing(false);
    }
  }, [instagramUsername]);

  const handleOpenAIModal = () => {
    setIsAIModalOpen(true);
    // Only fetch if not analyzed yet, otherwise keep existing analysis and let user refresh
    if (!analysis) {
      triggerAIAnalysis();
    }
  };

  useEffect(() => {
    reloadDashboardData();

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
  }, [reloadDashboardData]);

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
    <div className="h-full flex flex-col justify-between gap-1.5 sm:gap-2.5 pb-1 sm:pb-2 select-none overflow-hidden">
      {/* ========================================================================= */}
      {/* 1. TOP SECTION: NET PROFIT HERO (Enlarged Vertically & Static)            */}
      {/* ========================================================================= */}
      <motion.div 
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        className={`p-3 sm:p-4 rounded-2xl sm:rounded-3xl text-center shadow-xs relative overflow-hidden transition-all flex flex-col justify-between border flex-shrink-0 ${
          netProfit >= 0 
            ? 'bg-[#1D3A30] text-[#FAF7F0] border-[#C7B895]/30' 
            : 'bg-rose-950 text-white border-rose-800/40'
        }`}
      >
        <div className="flex justify-between items-center mb-1.5">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#C7B895] animate-pulse" />
            <span className="text-xs sm:text-sm font-bold text-[#E8D5A8]">
              صافي الأرباح التشغيلية لـ &apos;نَسْجَة&apos;
            </span>
          </div>

          {/* Budget Report Link */}
          <Link 
            to="/budget"
            className="text-[10px] sm:text-xs text-[#E8D5A8] hover:bg-white/10 flex items-center gap-1 bg-black/25 px-2.5 sm:px-3 py-1 rounded-xl font-bold transition border border-white/10"
            title="الانتقال لتقرير الميزانية الشامل"
          >
            <span>تقرير الميزانية</span>
            <ChevronLeft className="w-3.5 h-3.5 text-[#C7B895]" />
          </Link>
        </div>

        <div className="my-1 sm:my-1.5">
          <h2 className="text-3xl sm:text-4.5xl font-black tracking-tight text-[#FAF7F0] font-mono leading-none">
            {netProfit.toFixed(2)} <span className="text-base sm:text-2xl font-bold text-[#E8D5A8]">د.ب</span>
          </h2>
          <p className="text-[10px] sm:text-xs text-[#C7B895] font-medium mt-1">
            {netProfit >= 0 ? '✓ أرباح تشغيلية إيجابية ومستقرة' : '⚠ تنبيه: المصروفات تتجاوز الإيرادات'}
          </p>
        </div>

        <div className="mt-2.5 pt-2 sm:pt-2.5 border-t border-[#C7B895]/20 grid grid-cols-2 divide-x divide-x-reverse divide-[#C7B895]/20 text-xs text-center">
          <div className="px-2">
            <span className="text-[10px] sm:text-[11px] text-[#C7B895] block mb-0.5">المبيعات الكلية</span>
            <span className="font-bold text-[#E8D5A8] font-mono text-xs sm:text-sm">+{sales.toFixed(2)} د.ب</span>
          </div>
          <div className="px-2">
            <span className="text-[10px] sm:text-[11px] text-[#C7B895] block mb-0.5">إجمالي المصروفات</span>
            <span className="font-bold text-rose-300 font-mono text-xs sm:text-sm">-{expenses.toFixed(2)} د.ب</span>
          </div>
        </div>
      </motion.div>

      {/* ========================================================================= */}
      {/* 2. MIDDLE SECTION: TWO VERTICALLY EXPANDED BALANCED CARDS                */}
      {/* ========================================================================= */}
      <div className="flex-1 min-h-0 grid grid-cols-2 gap-2 sm:gap-3.5 w-full items-stretch overflow-hidden">
        
        {/* Box 1: إجمالي الطلبات (ممتد عمودياً ليغطي كامل الارتفاع المتاح) */}
        <div className="h-full bg-white p-2.5 sm:p-3.5 rounded-2xl sm:rounded-3xl border border-[#C7B895]/30 shadow-xs flex flex-col justify-between overflow-hidden">
          <div className="flex justify-between items-start mb-1 flex-shrink-0">
            <div>
              <span className="text-xs sm:text-sm font-extrabold text-[#1D3A30]">إجمالي الطلبات</span>
              <p className="text-[9px] sm:text-[10px] text-[#1D3A30]/60">سجل المتجر التراكمي</p>
            </div>
            <div className="p-1.5 sm:p-2 bg-[#FAF7F0] text-[#1D3A30] rounded-xl border border-[#C7B895]/30 flex-shrink-0">
              <ShoppingBag className="w-3.5 h-3.5 sm:w-4.5 sm:h-4.5 text-[#1D3A30]" />
            </div>
          </div>

          <div className="my-auto py-2 text-center flex-shrink-0">
            <p className="text-3xl sm:text-5xl font-black text-[#1D3A30] font-mono leading-none">{orders.length}</p>
            <span className="text-[10px] sm:text-xs font-semibold text-[#1D3A30]/65 mt-1 sm:mt-1.5 block">
              طلب تفصيل مسجل
            </span>
          </div>

          <div className="space-y-1.5 pt-2 border-t border-[#C7B895]/20 flex-shrink-0">
            <div className="flex items-center justify-between px-2.5 py-1.5 bg-[#FAF7F0] rounded-xl border border-[#C7B895]/20 text-[10px] sm:text-xs">
              <span className="font-bold text-[#A99872]">قيد التجهيز</span>
              <span className="font-mono font-black text-[#1D3A30] text-xs sm:text-sm">{pendingOrders.length}</span>
            </div>
            <div className="flex items-center justify-between px-2.5 py-1.5 bg-[#FAF7F0] rounded-xl border border-[#C7B895]/20 text-[10px] sm:text-xs">
              <span className="font-semibold text-[#1D3A30]/70">تم تسليمها</span>
              <span className="font-mono font-black text-[#1D3A30] text-xs sm:text-sm">{orders.length - pendingOrders.length}</span>
            </div>
          </div>
        </div>

        {/* Box 2: آخر الطلبات قيد التجهيز (ممتد عمودياً مع قائمة قابلة للتمرير الداخلي) */}
        <div className="h-full bg-white p-2.5 sm:p-3.5 rounded-2xl sm:rounded-3xl border border-[#C7B895]/30 shadow-xs flex flex-col justify-between overflow-hidden">
          <div className="flex justify-between items-center mb-1.5 flex-shrink-0">
            <div>
              <h3 className="font-extrabold text-xs sm:text-sm text-[#1D3A30] flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-[#A99872]" />
                آخر الطلبات
              </h3>
              <p className="text-[9px] text-[#1D3A30]/60">قيد التجهيز</p>
            </div>
            <Link to="/orders" className="text-[9px] sm:text-[10px] text-[#1D3A30] font-bold hover:underline flex items-center gap-0.5 flex-shrink-0">
              عرض الكل ({orders.length}) <ChevronLeft className="w-3 h-3" />
            </Link>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto pr-0.5 space-y-1.5 no-scrollbar my-1">
            {orders.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-4">
                <p className="text-[10px] sm:text-[11px] text-[#1D3A30]/60">لا توجد طلبات مسجلة.</p>
                <Link to="/orders" className="text-[#1D3A30] text-[10px] font-bold mt-1 inline-block underline">
                  + أضف أول طلب
                </Link>
              </div>
            ) : pendingOrders.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center bg-[#FAF7F0] rounded-xl border border-dashed border-[#C7B895]/40 p-3">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#1D3A30] text-[#E8D5A8] flex items-center justify-center mx-auto mb-1.5 shadow-2xs">
                  <CheckCircle2 className="w-4 h-4 text-[#E8D5A8]" />
                </div>
                <p className="text-[10px] sm:text-xs font-bold text-[#1D3A30]">كافة الطلبات مُسلّمة بنجاح!</p>
                <Link to="/orders" className="text-[#1D3A30] text-[9px] font-bold mt-1 inline-block underline">
                  جدول الطلبات ({orders.length})
                </Link>
              </div>
            ) : (
              <AnimatePresence initial={false}>
                {pendingOrders.slice(0, 5).map((o) => {
                  const { full } = formatDateTime(o.createdAt);
                  const cleanPhone = o.phone?.replace(/[^0-9]/g, '');

                  return (
                    <motion.div 
                      key={o.id} 
                      layout
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: 15, transition: { duration: 0.15 } }}
                      className="p-1.5 sm:p-2 bg-[#FAF7F0] rounded-xl border border-[#C7B895]/20 flex items-center justify-between hover:bg-[#F4EBD4]/40 transition gap-1.5"
                    >
                      <div className="flex-1 min-w-0 pr-0.5">
                        <div className="flex items-center gap-1">
                          <span className="font-bold text-[10px] sm:text-xs text-[#1D3A30] truncate">
                            {o.customerName}
                          </span>
                        </div>
                        <p className="text-[9px] text-[#1D3A30]/70 truncate">
                          {o.details}
                        </p>
                        <p className="text-[8px] text-[#1D3A30]/50 font-mono">
                          {full}
                        </p>
                      </div>

                      <div className="text-left flex-shrink-0 flex items-center gap-1">
                        <span className="font-bold text-[10px] text-[#1D3A30] font-mono">
                          {Number(o.price || o.total).toFixed(2)} د.ب
                        </span>

                        {/* Deliver Order Button */}
                        <button
                          type="button"
                          onClick={(e) => handleDeliverOrder(o.id, e)}
                          title="تم تسليم الطلب"
                          aria-label="تم تسليم الطلب"
                          className="w-6 h-6 bg-[#1D3A30] hover:bg-[#25493D] active:scale-90 text-[#E8D5A8] rounded-lg flex items-center justify-center transition shadow-xs border border-[#C7B895]/40 cursor-pointer"
                        >
                          <Check className="w-3 h-3 stroke-[2.5]" />
                        </button>

                        {/* WhatsApp Direct Chat */}
                        {cleanPhone && (
                          <a
                            href={`https://wa.me/${cleanPhone}`}
                            target="_blank"
                            rel="noreferrer"
                            title="مراسلة واتساب"
                            aria-label="مراسلة واتساب"
                            className="w-6 h-6 bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-lg flex items-center justify-center transition shadow-xs active:scale-90"
                          >
                            <WhatsAppIcon className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            )}
          </div>

          <div className="pt-1.5 border-t border-[#C7B895]/20 mt-auto text-center flex-shrink-0">
            <span className="text-[9px] text-[#1D3A30]/60">
              تسليم ومراسلة فورية
            </span>
          </div>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* 3. BOTTOM SECTION: AI & INSTAGRAM ANALYSIS FIXED FULL BUTTON (Taller)      */}
      {/* ========================================================================= */}
      <button
        type="button"
        onClick={handleOpenAIModal}
        className="w-full flex-shrink-0 bg-[#1D3A30] hover:bg-[#25493D] active:scale-[0.99] text-[#FAF7F0] p-2.5 sm:p-3.5 rounded-2xl sm:rounded-3xl border border-[#C7B895]/40 shadow-xs flex items-center justify-between transition cursor-pointer"
        title="فتح نافذة استشارة الذكاء الاصطناعي وتحليل حساب الإنستغرام"
      >
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-br from-[#E8D5A8] to-[#C7B895] text-[#1D3A30] flex items-center justify-center font-bold flex-shrink-0 shadow-xs">
            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-[#1D3A30]" />
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1.5">
              <span className="text-xs sm:text-base font-extrabold text-[#E8D5A8] block leading-tight">
                تحليل الذكاء الاصطناعي وإنستغرام
              </span>
              <span className="text-[9px] bg-[#FAF7F0]/15 text-[#E8D5A8] px-1.5 py-0.5 rounded-md font-bold">
                مباشر
              </span>
            </div>
            <span className="text-[10px] sm:text-xs text-[#FAF7F0]/85 block leading-tight mt-0.5">
              فحص فوري لأداء دار نَسْجَة ومخزون الأقمشة مع حساب @{instagramUsername}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 bg-[#FAF7F0]/15 hover:bg-[#FAF7F0]/25 px-3 sm:px-3.5 py-1.5 rounded-xl border border-white/10 text-[10px] sm:text-xs font-bold text-[#E8D5A8] flex-shrink-0">
          <span>فتح الاستشارة</span>
          <ChevronLeft className="w-3.5 h-3.5 text-[#C7B895]" />
        </div>
      </button>

      {/* ========================================================================= */}
      {/* 4. AI & INSTAGRAM ANALYSIS MODAL (ON DEMAND POPUP WINDOW)                  */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {isAIModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-3xl border border-[#C7B895]/40 shadow-2xl max-w-3xl w-full flex flex-col max-h-[90vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Top Header */}
              <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 bg-[#FAF7F0] border-b border-[#C7B895]/30">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#1D3A30] text-[#E8D5A8] flex items-center justify-center border border-[#C7B895]/40 shadow-2xs">
                    <Sparkles className="w-4 h-4 text-[#E8D5A8]" />
                  </div>
                  <div>
                    <h2 className="text-sm sm:text-base font-extrabold text-[#1D3A30] flex items-center gap-1.5">
                      المستشار التنفيذي الذكي وتحليل إنستغرام
                    </h2>
                    <p className="text-[10px] sm:text-[11px] text-[#1D3A30]/70">
                      قراءة تشغيلية ومالية شاملة تربط أرقام المتجر بحساب إنستغرام عبر Gemini AI
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold bg-white text-[#1D3A30] px-2 py-0.5 rounded-md border border-[#C7B895]/40 hidden sm:inline">
                    {analysis?.modelUsed || 'gemini-3.8-flash'}
                  </span>
                  <button
                    onClick={() => setIsAIModalOpen(false)}
                    className="p-1.5 rounded-xl bg-white hover:bg-rose-50 text-[#1D3A30] hover:text-rose-700 border border-[#C7B895]/30 transition cursor-pointer"
                    title="إغلاق النافذة"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Instagram Profile Link & Edit Bar */}
              <div className="px-4 sm:px-6 py-2.5 bg-gradient-to-r from-[#FAF7F0] to-[#F4EBD4]/40 border-b border-[#C7B895]/20 flex items-center justify-between flex-wrap gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 text-white flex items-center justify-center shadow-xs">
                    <Instagram className="w-3.5 h-3.5" />
                  </div>
                  <span className="font-bold text-[#1D3A30]">حساب إنستغرام:</span>

                  {isEditingInsta ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        value={tempInsta}
                        onChange={(e) => setTempInsta(e.target.value)}
                        className="px-2 py-0.5 rounded-md border border-[#C7B895] text-xs font-mono text-left dir-ltr bg-white"
                        placeholder="nasjah.bh"
                      />
                      <button
                        onClick={() => {
                          const clean = tempInsta.replace('@', '').trim() || 'nasjah.bh';
                          setInstagramUsername(clean);
                          setIsEditingInsta(false);
                          triggerAIAnalysis(clean);
                        }}
                        className="px-2 py-0.5 bg-[#1D3A30] text-[#E8D5A8] rounded-md text-[10px] font-bold"
                      >
                        حفظ وتحليل
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-extrabold text-[#1D3A30] bg-white px-2 py-0.5 rounded-md border border-[#C7B895]/30 dir-ltr">
                        @{instagramUsername}
                      </span>
                      <button
                        onClick={() => {
                          setTempInsta(instagramUsername);
                          setIsEditingInsta(true);
                        }}
                        className="text-[10px] text-[#A99872] hover:text-[#1D3A30] font-bold underline cursor-pointer"
                      >
                        تعديل
                      </button>
                      <a
                        href={`https://instagram.com/${instagramUsername}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#1D3A30]/60 hover:text-[#1D3A30]"
                        title="فتح الحساب في إنستغرام"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-md font-bold">
                    {analysis?.instagram_profile?.statusText || "متصل وتم تحليله بنجاح"}
                  </span>
                  {lastAnalyzedAt && (
                    <span className="text-[10px] font-mono text-[#1D3A30]/60 hidden md:inline">
                      آخر تحديث: {lastAnalyzedAt}
                    </span>
                  )}
                </div>
              </div>

              {/* Modal Body - Scrollable Content */}
              <div className="p-4 sm:p-6 overflow-y-auto max-h-[60vh] space-y-4 no-scrollbar">
                {isAnalyzing ? (
                  <div className="py-12 text-center space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-[#1D3A30] text-[#E8D5A8] flex items-center justify-center mx-auto animate-spin shadow-md">
                      <RefreshCw className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-sm font-extrabold text-[#1D3A30]">
                        جاري فحص وتحليل بيانات المتجر وحساب الإنستغرام...
                      </p>
                      <p className="text-xs text-[#1D3A30]/60 mt-1">
                        Gemini يقوم بمعالجة مبيعات دار نَسْجَة ومخزون الأقمشة ومحتوى @{instagramUsername}
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Section A: Instagram Account & Digital Marketing Analysis */}
                    <div className="space-y-2.5">
                      <div className="flex items-center gap-2 text-[#1D3A30]">
                        <div className="p-1.5 rounded-lg bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 text-white">
                          <Instagram className="w-4 h-4" />
                        </div>
                        <h3 className="text-sm font-extrabold">
                          تحليل حساب الإنستغرام (@{instagramUsername}) والتسويق الرقمي
                        </h3>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                        {/* Insta Card 1: Account Audit */}
                        <div className="p-3 bg-[#FAF7F0] rounded-2xl border border-[#C7B895]/30 flex flex-col justify-between">
                          <div>
                            <span className="text-[10px] font-bold text-[#A99872] uppercase block mb-1">
                              تشخيص الحساب والهوية
                            </span>
                            <p className="text-xs text-[#1D3A30] leading-relaxed font-medium">
                              {analysis?.instagram_summary || "يعد الحساب الواجهة البصرية الأساسية لعرض خامات الأقمشة الفاخرة وتصاميم العبايات للزبونات بالبحرين."}
                            </p>
                          </div>
                          <div className="mt-2.5 pt-2 border-t border-[#C7B895]/20 text-[10px] text-[#1D3A30]/60 font-bold flex justify-between">
                            <span>الهوية الرقمية</span>
                            <span className="text-emerald-700">✓ علامة تجارية موثوقة</span>
                          </div>
                        </div>

                        {/* Insta Card 2: Engagement Strategy */}
                        <div className="p-3 bg-[#FAF7F0] rounded-2xl border border-[#C7B895]/30 flex flex-col justify-between">
                          <div>
                            <span className="text-[10px] font-bold text-[#A99872] uppercase block mb-1">
                              استراتيجية التفاعل والريلز
                            </span>
                            <p className="text-xs text-[#1D3A30] leading-relaxed font-medium">
                              {analysis?.instagram_engagement_strategy || "التركيز على فيديوهات الريلز القصيرة لإبراز جودة الأقمشة ومرونتها وتفاصيل التطريز الدقيقة لجذب المهتمات."}
                            </p>
                          </div>
                          <div className="mt-2.5 pt-2 border-t border-[#C7B895]/20 text-[10px] text-[#1D3A30]/60 font-bold flex justify-between">
                            <span>الجمهور المستهدف</span>
                            <span className="text-[#1D3A30]">زبونات العبايات والمناسبات</span>
                          </div>
                        </div>

                        {/* Insta Card 3: Promotion & Fabric Synergy */}
                        <div className="p-3 bg-[#FAF7F0] rounded-2xl border border-[#C7B895]/30 flex flex-col justify-between">
                          <div>
                            <span className="text-[10px] font-bold text-[#A99872] uppercase block mb-1">
                              ربط المخزون بالمبيعات
                            </span>
                            <p className="text-xs text-[#1D3A30] leading-relaxed font-medium">
                              {analysis?.instagram_promotion_advice || "تصوير الأقمشة المتوفرة بالمخزن وتوجيه المتابعات مباشرة لزر الواتساب لتأكيد الحجز الفوري قبل نفاد الأمتار."}
                            </p>
                          </div>
                          <div className="mt-2.5 pt-2 border-t border-[#C7B895]/20 text-[10px] text-[#1D3A30]/60 font-bold flex justify-between">
                            <span>التحويل المباشر</span>
                            <span className="text-emerald-700">واتساب للطلب الفوري</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Section B: Financial & Operational Executive Assessment */}
                    <div className="space-y-2.5 pt-2">
                      <div className="flex items-center gap-2 text-[#1D3A30]">
                        <div className="p-1.5 rounded-lg bg-[#1D3A30] text-[#E8D5A8]">
                          <BarChart3 className="w-4 h-4" />
                        </div>
                        <h3 className="text-sm font-extrabold">
                          المؤشرات التنفيذية والتشغيلية للمتجر
                        </h3>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                        {/* Executive Summary */}
                        <div className="p-3 bg-white rounded-2xl border border-[#C7B895]/30 shadow-2xs flex flex-col justify-between">
                          <div>
                            <span className="text-[10px] font-bold text-[#1D3A30]/70 uppercase block mb-1">
                              الموجز التنفيذي
                            </span>
                            <p className="text-[11px] sm:text-xs text-[#1D3A30] leading-relaxed font-medium">
                              {analysis?.executive_summary}
                            </p>
                          </div>
                          <div className="mt-2 pt-1.5 border-t border-[#C7B895]/15 text-[10px] text-[#1D3A30]/60 flex justify-between font-mono font-bold">
                            <span>المبيعات</span>
                            <span>{sales.toFixed(2)} د.ب</span>
                          </div>
                        </div>

                        {/* Financial Health */}
                        <div className="p-3 bg-white rounded-2xl border border-[#C7B895]/30 shadow-2xs flex flex-col justify-between">
                          <div>
                            <span className="text-[10px] font-bold text-[#1D3A30]/70 uppercase block mb-1">
                              العائد والانضباط المالي
                            </span>
                            <p className="text-[11px] sm:text-xs text-[#1D3A30] leading-relaxed font-medium">
                              {analysis?.financial_indicator}
                            </p>
                          </div>
                          <div className="mt-2 pt-1.5 border-t border-[#C7B895]/15 text-[10px] text-[#1D3A30]/60 flex justify-between font-mono font-bold">
                            <span>صافي الربح</span>
                            <span className={netProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'}>
                              {netProfit.toFixed(2)} د.ب
                            </span>
                          </div>
                        </div>

                        {/* Operational Efficiency */}
                        <div className="p-3 bg-white rounded-2xl border border-[#C7B895]/30 shadow-2xs flex flex-col justify-between">
                          <div>
                            <span className="text-[10px] font-bold text-[#1D3A30]/70 uppercase block mb-1">
                              الكفاءة التشغيلية
                            </span>
                            <p className="text-[11px] sm:text-xs text-[#1D3A30] leading-relaxed font-medium">
                              {analysis?.operational_efficiency}
                            </p>
                          </div>
                          <div className="mt-2 pt-1.5 border-t border-[#C7B895]/15 text-[10px] text-[#1D3A30]/60 flex justify-between font-mono font-bold">
                            <span>نسبة الإنجاز</span>
                            <span>{orders.length > 0 ? Math.round(((orders.length - pendingOrders.length) / orders.length) * 100) : 0}%</span>
                          </div>
                        </div>

                        {/* Inventory Guidance */}
                        <div className="p-3 bg-white rounded-2xl border border-[#C7B895]/30 shadow-2xs flex flex-col justify-between">
                          <div>
                            <span className="text-[10px] font-bold text-[#1D3A30]/70 uppercase block mb-1">
                              مخزون الأقمشة
                            </span>
                            <p className="text-[11px] sm:text-xs text-[#1D3A30] leading-relaxed font-medium">
                              {analysis?.inventory_guidance}
                            </p>
                          </div>
                          <div className="mt-2 pt-1.5 border-t border-[#C7B895]/15 text-[10px] text-[#1D3A30]/60 flex justify-between font-mono font-bold">
                            <span>الطلبات النشطة</span>
                            <span>{pendingOrders.length} طلب</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Modal Footer Actions */}
              <div className="px-4 sm:px-6 py-3 bg-[#FAF7F0] border-t border-[#C7B895]/30 flex items-center justify-between">
                <button
                  onClick={() => triggerAIAnalysis()}
                  disabled={isAnalyzing}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1D3A30] hover:bg-[#25493D] text-[#E8D5A8] rounded-xl text-xs font-bold transition active:scale-95 disabled:opacity-60 cursor-pointer"
                >
                  <RefreshCw className={cn("w-3.5 h-3.5", isAnalyzing && "animate-spin")} />
                  <span>{isAnalyzing ? "جارِ التحليل الآن..." : "إعادة تشغيل الفحص والتحليل"}</span>
                </button>

                <button
                  onClick={() => setIsAIModalOpen(false)}
                  className="px-4 py-1.5 bg-white hover:bg-[#FAF7F0] text-[#1D3A30] border border-[#C7B895]/40 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  إغلاق
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

