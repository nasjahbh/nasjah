import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShoppingBag, ChevronLeft, Check, Clock, CheckCircle2
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatDateTime } from '../lib/dateUtils';
import WhatsAppIcon from '../components/WhatsAppIcon';
import { getLocalData, persistOrders, syncWithServer, EVENT_DATA_UPDATED } from '../lib/dataService';

export default function Dashboard() {
  const [sales, setSales] = useState(0);
  const [expenses, setExpenses] = useState(0);
  const [orders, setOrders] = useState<any[]>([]);

  const reloadDashboardData = () => {
    const local = getLocalData();
    setOrders(local.orders);
    const totalSales = local.orders.reduce((sum: number, order: any) => sum + (order.total || order.price || 0), 0) || 0;
    setSales(totalSales);

    const totalExp = local.expenses.reduce((sum: number, exp: any) => sum + (Number(exp.amount) || 0), 0) || 0;
    setExpenses(totalExp);

    return { totalSales, totalExp };
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
  }, []);

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
      {/* Top Financial & Total Orders Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 sm:gap-4">
        
        {/* Net Profit Hero Card (2 cols on tablet/desktop) */}
        <motion.div 
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className={`md:col-span-2 p-5 sm:p-6 rounded-3xl text-center shadow-md relative overflow-hidden transition-all flex flex-col justify-between border ${
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

        {/* Total Orders Card (Transferred to the top alongside Net Profit) */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-white p-5 sm:p-6 rounded-3xl border border-[#C7B895]/30 shadow-xs flex flex-col justify-between"
        >
          <div>
            <div className="flex justify-between items-start mb-2">
              <div>
                <span className="text-xs font-bold text-[#1D3A30]">إجمالي الطلبات</span>
                <p className="text-[10px] text-[#1D3A30]/60">سجل طلبات ومبيعات المتجر</p>
              </div>
              <div className="p-2 bg-[#FAF7F0] text-[#1D3A30] rounded-2xl border border-[#C7B895]/30">
                <ShoppingBag className="w-5 h-5 text-[#1D3A30]" />
              </div>
            </div>

            <div className="my-2">
              <p className="text-3xl sm:text-4xl font-black text-[#1D3A30] font-mono">{orders.length}</p>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="text-xs font-bold text-[#A99872] bg-[#FAF7F0] px-2.5 py-0.5 rounded-lg border border-[#C7B895]/30">
                  {pendingOrders.length} قيد التجهيز
                </span>
                <span className="text-xs text-[#1D3A30]/60">
                  • {orders.length - pendingOrders.length} مسلّمة
                </span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-[#C7B895]/20">
            <Link
              to="/orders"
              className="w-full bg-[#1D3A30] hover:bg-[#25493D] text-[#E8D5A8] py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs border border-[#C7B895]/30 active:scale-95"
            >
              <span>الانتقال لجدول الطلبات</span>
              <ChevronLeft className="w-3.5 h-3.5 text-[#C7B895]" />
            </Link>
          </div>
        </motion.div>
      </div>

      {/* Recent Orders Section */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-[#C7B895]/30 shadow-xs">
        <div className="flex justify-between items-center mb-3.5">
          <h3 className="font-bold text-sm text-[#1D3A30] flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-[#A99872]" />
            آخر الطلبات المسجلة (قيد التجهيز)
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
              {pendingOrders.slice(0, 7).map((o) => {
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
                        className="w-8 h-8 bg-[#1D3A30] hover:bg-[#25493D] active:scale-90 text-[#E8D5A8] rounded-xl flex items-center justify-center transition shadow-xs border border-[#C7B895]/40"
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
                          className="w-8 h-8 bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-xl flex items-center justify-center transition shadow-xs active:scale-90"
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

    </div>
  );
}
