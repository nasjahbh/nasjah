import React, { useState, useEffect } from 'react';
import { 
  Plus, FileText, Phone, Trash2, CheckCircle2, Clock, Search, 
  MessageSquare, Eye, X, Printer, Download, Edit3, Calendar, 
  CreditCard, AlertTriangle, Filter, RotateCcw, ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { Fabric, Order, OrderStatus, PaymentMethod } from '../types';
import { formatDateTime, toDatetimeLocal, fromDatetimeLocal } from '../lib/dateUtils';
import NasjahLogo from '../components/NasjahLogo';
import WhatsAppIcon from '../components/WhatsAppIcon';
import { persistOrders, deleteOrderPermanently, getLocalData, syncWithServer, EVENT_DATA_UPDATED } from '../lib/dataService';

export default function Orders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [fabrics, setFabrics] = useState<Fabric[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  
  // Deletion modal state
  const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);

  // Search and filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [timeFilter, setTimeFilter] = useState<'all' | 'today' | 'month'>('all');

  // Selected Invoice for preview
  const [selectedInvoice, setSelectedInvoice] = useState<Order | null>(null);
  
  // Form state
  const [orderForm, setOrderForm] = useState({
    customerName: '',
    phone: '',
    details: '',
    price: '',
    status: 'قيد التجهيز' as OrderStatus,
    paymentMethod: 'بنفت بي' as PaymentMethod,
    datetimeStr: toDatetimeLocal(),
    notes: ''
  });

  useEffect(() => {
    const local = getLocalData();
    setOrders(local.orders);
    setFabrics(local.inventory);

    syncWithServer().then((latest) => {
      setOrders(latest.orders);
      setFabrics(latest.inventory);
    });

    const handleUpdate = () => {
      const current = getLocalData();
      setOrders(current.orders);
      setFabrics(current.inventory);
    };

    window.addEventListener(EVENT_DATA_UPDATED, handleUpdate);
    return () => window.removeEventListener(EVENT_DATA_UPDATED, handleUpdate);
  }, []);

  const saveOrders = (updated: Order[]) => {
    setOrders(updated);
    persistOrders(updated);
  };

  const openCreateModal = () => {
    setModalMode('create');
    setEditingOrderId(null);
    setOrderForm({
      customerName: '',
      phone: '',
      details: '',
      price: '',
      status: 'قيد التجهيز',
      paymentMethod: 'بنفت بي',
      datetimeStr: toDatetimeLocal(),
      notes: ''
    });
    setShowModal(true);
  };

  const openEditModal = (order: Order) => {
    setModalMode('edit');
    setEditingOrderId(order.id);
    setOrderForm({
      customerName: order.customerName,
      phone: order.phone,
      details: order.details,
      price: String(order.price),
      status: order.status || 'قيد التجهيز',
      paymentMethod: (order.paymentMethod as PaymentMethod) || 'بنفت بي',
      datetimeStr: toDatetimeLocal(order.createdAt),
      notes: order.notes || ''
    });
    setShowModal(true);
  };

  const handleSaveOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderForm.customerName || !orderForm.price || !orderForm.details) return;

    const priceNum = parseFloat(orderForm.price);
    const createdAtMs = fromDatetimeLocal(orderForm.datetimeStr);

    if (modalMode === 'edit' && editingOrderId) {
      // Update existing order
      const updatedOrders = orders.map(o => {
        if (o.id === editingOrderId) {
          return {
            ...o,
            customerName: orderForm.customerName.trim(),
            phone: orderForm.phone.trim(),
            details: orderForm.details.trim(),
            price: priceNum,
            total: priceNum,
            status: orderForm.status,
            paymentMethod: orderForm.paymentMethod,
            notes: orderForm.notes.trim(),
            createdAt: createdAtMs
          };
        }
        return o;
      });
      saveOrders(updatedOrders);
    } else {
      // Create new order
      const newOrderData: Order = {
        id: Math.random().toString(36).substring(2, 8).toUpperCase(),
        customerName: orderForm.customerName.trim(),
        phone: orderForm.phone.trim(),
        details: orderForm.details.trim(),
        price: priceNum,
        total: priceNum,
        status: orderForm.status,
        paymentMethod: orderForm.paymentMethod,
        notes: orderForm.notes.trim(),
        createdAt: createdAtMs
      };
      const updatedOrders = [newOrderData, ...orders];
      saveOrders(updatedOrders);
      setSelectedInvoice(newOrderData);
    }

    setShowModal(false);
  };

  const confirmDeleteOrder = async () => {
    if (!orderToDelete) return;
    const orderId = orderToDelete.id;
    setOrderToDelete(null);
    if (selectedInvoice?.id === orderId) {
      setSelectedInvoice(null);
    }
    const updated = await deleteOrderPermanently(orderId);
    setOrders(updated);
  };

  const handleToggleStatus = (id: string) => {
    const updated = orders.map(o => {
      if (o.id === id) {
        const nextStatus: OrderStatus = o.status === 'تم التسليم' ? 'قيد التجهيز' : 'تم التسليم';
        return { ...o, status: nextStatus };
      }
      return o;
    });
    saveOrders(updated);
  };

  const generatePDF = (order: Order) => {
    const doc = new jsPDF();
    const { dateStr, timeStr } = formatDateTime(order.createdAt);
    
    doc.setFontSize(20);
    doc.setTextColor(29, 58, 48); // #1D3A30
    doc.text("فاتورة مبيعات - دار نَسْجَة للأقمشة", 105, 20, { align: "center" });
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`التاريخ: ${dateStr} - ${timeStr}`, 20, 35);
    doc.text(`رقم الفاتورة: #${order.id}`, 20, 42);
    
    doc.setFontSize(12);
    doc.setTextColor(20);
    doc.text(`العميل: ${order.customerName}`, 20, 55);
    doc.text(`الهاتف: ${order.phone || '-'}`, 20, 62);
    doc.text(`الحالة: ${order.status || 'قيد التجهيز'}`, 20, 69);
    doc.text(`طريقة الدفع: ${order.paymentMethod || 'بنفت بي'}`, 20, 76);
    
    (doc as any).autoTable({
      startY: 84,
      headStyles: { fillColor: [29, 58, 48], textColor: [232, 213, 168] },
      head: [['بيان القماش / تفاصيل الطلب', 'المبلغ (د.ب)']],
      body: [
        [order.details, `${order.price.toFixed(2)} د.ب`]
      ],
    });
    
    const finalY = (doc as any).lastAutoTable?.finalY || 110;
    doc.setFontSize(13);
    doc.setTextColor(29, 58, 48);
    doc.text(`المجموع المطلوب: ${order.price.toFixed(2)} د.ب`, 190, finalY + 15, { align: 'right' });

    if (order.notes) {
      doc.setFontSize(10);
      doc.setTextColor(120);
      doc.text(`ملاحظات: ${order.notes}`, 20, finalY + 25);
    }

    doc.save(`فاتورة_${order.customerName}_${order.id}.pdf`);
  };

  // Filter logic
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

  const filteredOrders = orders.filter(o => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = (
      o.customerName?.toLowerCase().includes(q) ||
      o.phone?.includes(q) ||
      o.details?.toLowerCase().includes(q) ||
      o.id?.toLowerCase().includes(q) ||
      (o.notes && o.notes.toLowerCase().includes(q))
    );
    if (!matchesSearch) return false;

    if (statusFilter !== 'all' && o.status !== statusFilter) {
      return false;
    }

    if (timeFilter === 'today' && o.createdAt < startOfToday) {
      return false;
    }
    if (timeFilter === 'month' && o.createdAt < startOfMonth) {
      return false;
    }

    return true;
  });

  const totalRevenue = orders.reduce((sum, o) => sum + (Number(o.total || o.price) || 0), 0);
  const pendingCount = orders.filter(o => o.status === 'قيد التجهيز' || !o.status).length;

  return (
    <div className="space-y-3.5 pb-6">
      {/* Top Mobile Header & Add Button */}
      <div className="flex items-center justify-between bg-white px-4 py-3 rounded-2xl border border-[#C7B895]/30 shadow-xs">
        <div>
          <h1 className="text-base font-extrabold text-[#1D3A30]">سجل الطلبات والمبيعات</h1>
          <p className="text-[11px] text-[#1D3A30]/70 font-medium">
            {orders.length} طلب مسجل • {totalRevenue.toFixed(2)} د.ب
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="bg-[#1D3A30] text-[#E8D5A8] px-3.5 py-2 rounded-xl text-xs font-bold hover:bg-[#25493D] transition flex items-center gap-1.5 shadow-xs active:scale-95 border border-[#C7B895]/30"
        >
          <Plus className="w-4 h-4 text-[#C7B895]" />
          <span>طلب جديد</span>
        </button>
      </div>

      {/* Mobile Search & Filter Chips */}
      <div className="space-y-2">
        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-[#1D3A30]/40" />
          <input
            type="text"
            placeholder="بحث باسم العميل، رقم الهاتف، أو القماش..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white pr-9 pl-8 py-2.5 text-xs rounded-xl border border-[#C7B895]/30 text-[#1D3A30] placeholder-[#1D3A30]/40 focus:outline-none focus:ring-1 focus:ring-[#1D3A30]"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#1D3A30]/50 hover:text-[#1D3A30]"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Horizontal Scrollable Filter Chips (no scrollbar) */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap transition ${
              statusFilter === 'all'
                ? 'bg-[#1D3A30] text-[#E8D5A8] shadow-xs'
                : 'bg-white text-[#1D3A30]/80 border border-[#C7B895]/30 hover:bg-[#FAF7F0]'
            }`}
          >
            الكل ({orders.length})
          </button>
          <button
            onClick={() => setStatusFilter('قيد التجهيز')}
            className={`px-3 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap transition flex items-center gap-1 ${
              statusFilter === 'قيد التجهيز'
                ? 'bg-[#A99872] text-[#FAF7F0] shadow-xs'
                : 'bg-white text-[#A99872] border border-[#C7B895]/50 hover:bg-[#FAF7F0]'
            }`}
          >
            قيد التجهيز ({pendingCount})
          </button>
          <button
            onClick={() => setStatusFilter('تم التسليم')}
            className={`px-3 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap transition ${
              statusFilter === 'تم التسليم'
                ? 'bg-[#1D3A30] text-[#E8D5A8] shadow-xs'
                : 'bg-white text-[#1D3A30] border border-[#1D3A30]/30 hover:bg-[#FAF7F0]'
            }`}
          >
            تم التسليم ({orders.length - pendingCount})
          </button>
          <button
            onClick={() => setTimeFilter(timeFilter === 'today' ? 'all' : 'today')}
            className={`px-3 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap transition ${
              timeFilter === 'today'
                ? 'bg-stone-800 text-white shadow-xs'
                : 'bg-white text-stone-700 border border-stone-200 hover:bg-stone-50'
            }`}
          >
            طلبات اليوم
          </button>
          <button
            onClick={() => setTimeFilter(timeFilter === 'month' ? 'all' : 'month')}
            className={`px-3 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap transition ${
              timeFilter === 'month'
                ? 'bg-stone-800 text-white shadow-xs'
                : 'bg-white text-stone-700 border border-stone-200 hover:bg-stone-50'
            }`}
          >
            هذا الشهر
          </button>
        </div>
      </div>

      {/* Orders Mobile Feed List */}
      {filteredOrders.length === 0 ? (
        <div className="bg-white rounded-3xl p-8 text-center border border-[#C7B895]/30 shadow-xs">
          <FileText className="w-10 h-10 text-[#C7B895]/60 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-[#1D3A30]">لا توجد طلبات مطابقة</h3>
          <p className="text-xs text-[#1D3A30]/60 mt-1">جرب تغيير شروط البحث أو الفلاتر</p>
          <button
            onClick={openCreateModal}
            className="mt-4 bg-[#1D3A30] text-[#E8D5A8] text-xs font-bold px-4 py-2.5 rounded-xl border border-[#C7B895]/40"
          >
            + إضافة طلب جديد الآن
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
          {filteredOrders.map((order) => {
            const { full, isToday } = formatDateTime(order.createdAt);
            const cleanPhone = order.phone?.replace(/[^0-9]/g, '');

            return (
              <motion.div
                key={order.id}
                layout
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl p-3.5 border border-[#C7B895]/30 shadow-xs hover:border-[#C7B895] transition"
              >
                {/* Card Top: ID, Status Toggle, Price */}
                <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-[#C7B895]/20">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-mono bg-[#FAF7F0] text-[#1D3A30] font-bold px-2 py-0.5 rounded-md border border-[#C7B895]/25">
                      #{order.id}
                    </span>
                    
                    {/* Status button (1-tap to switch status) */}
                    <button
                      onClick={() => handleToggleStatus(order.id)}
                      className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1 transition active:scale-95 border ${
                        order.status === 'تم التسليم'
                          ? 'bg-[#1D3A30] text-[#E8D5A8] border-[#C7B895]/40'
                          : 'bg-[#FAF7F0] text-[#A99872] border-[#C7B895]'
                      }`}
                      title="اضغط لتغيير الحالة"
                    >
                      {order.status === 'تم التسليم' ? (
                        <CheckCircle2 className="w-3 h-3 text-[#E8D5A8]" />
                      ) : (
                        <Clock className="w-3 h-3 text-[#A99872]" />
                      )}
                      <span>{order.status || 'قيد التجهيز'}</span>
                    </button>
                  </div>

                  <div className="text-left">
                    <span className="text-sm font-black text-[#1D3A30] font-mono">
                      {Number(order.price || order.total).toFixed(2)}{' '}
                      <span className="text-[10px] font-bold text-[#A99872]">د.ب</span>
                    </span>
                  </div>
                </div>

                {/* Card Body: Customer & Fabric Details */}
                <div className="py-2.5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-[#1D3A30]">
                      {order.customerName}
                    </h3>
                    
                    {cleanPhone && (
                      <div className="flex items-center gap-1">
                        <a
                          href={`tel:${cleanPhone}`}
                          className="text-[10px] font-mono text-[#1D3A30]/80 hover:text-[#1D3A30]"
                        >
                          {order.phone}
                        </a>
                        <a
                          href={`https://wa.me/${cleanPhone}`}
                          target="_blank"
                          rel="noreferrer"
                          className="w-6 h-6 bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-lg flex items-center justify-center transition shadow-xs active:scale-90"
                          title="مراسلة الزبون عبر واتساب"
                        >
                          <WhatsAppIcon className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    )}
                  </div>

                  <p className="text-xs text-[#1D3A30]/80 font-medium mt-1 leading-relaxed">
                    {order.details}
                  </p>

                  {order.notes && (
                    <p className="text-[10px] bg-[#FAF7F0] text-[#1D3A30] p-1.5 rounded-lg mt-1.5 border border-[#C7B895]/30">
                      ملاحظة: {order.notes}
                    </p>
                  )}
                </div>

                {/* Card Meta & Action Buttons Footer */}
                <div className="pt-2 border-t border-[#C7B895]/20 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-[10px] text-[#1D3A30]/70 font-mono">
                    <span className="bg-[#FAF7F0] px-1.5 py-0.5 rounded text-[#1D3A30] font-medium border border-[#C7B895]/20">
                      {order.paymentMethod || 'بنفت بي'}
                    </span>
                    <span>•</span>
                    <span className={isToday ? "font-bold text-[#1D3A30]" : ""}>
                      {full}
                    </span>
                  </div>

                  {/* Actions Toolbar */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setSelectedInvoice(order)}
                      className="p-1.5 text-[#1D3A30] hover:bg-[#FAF7F0] rounded-lg transition"
                      title="معاينة الفاتورة"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => openEditModal(order)}
                      className="p-1.5 text-[#A99872] hover:bg-[#FAF7F0] rounded-lg transition"
                      title="تعديل تفاصيل الطلب"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => generatePDF(order)}
                      className="p-1.5 text-[#1D3A30] hover:bg-[#FAF7F0] rounded-lg transition"
                      title="تحميل PDF"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setOrderToDelete(order)}
                      className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition"
                      title="حذف الطلب الخاطئ"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Modal (Mobile Native Bottom Sheet / Card) */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-xs"
            />

            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 280 }}
              className="relative w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl z-10 max-h-[90dvh] flex flex-col overflow-hidden border border-[#C7B895]/30"
            >
              {/* Modal Header */}
              <div className="p-4 border-b border-[#C7B895]/30 flex justify-between items-center bg-[#1D3A30] text-[#FAF7F0]">
                <div>
                  <h3 className="text-sm font-bold text-[#FAF7F0]">
                    {modalMode === 'edit' ? 'تعديل بيانات الطلب' : 'تسجيل طلب مبيعات جديد'}
                  </h3>
                  <p className="text-[10px] text-[#E8D5A8]">
                    {modalMode === 'edit' ? 'تصحيح الأخطاء أو تعديل التوقيت' : 'أدخل بيانات العميل والمبلغ'}
                  </p>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-1.5 rounded-lg bg-white/10 text-[#E8D5A8] hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Form Interior */}
              <form onSubmit={handleSaveOrder} className="flex-1 overflow-y-auto p-4 space-y-3 text-xs no-scrollbar">
                <div>
                  <label className="block text-[11px] font-bold text-[#1D3A30] mb-1">
                    اسم العميل *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: أم عبدالله، سارة جاسم..."
                    value={orderForm.customerName}
                    onChange={(e) => setOrderForm({ ...orderForm, customerName: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-[#C7B895]/40 focus:ring-1 focus:ring-[#1D3A30] outline-none text-xs text-[#1D3A30]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-[#1D3A30] mb-1">
                      رقم الهاتف / واتساب
                    </label>
                    <input
                      type="tel"
                      placeholder="97333XXXXXX"
                      value={orderForm.phone}
                      onChange={(e) => setOrderForm({ ...orderForm, phone: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-[#C7B895]/40 focus:ring-1 focus:ring-[#1D3A30] outline-none text-xs font-mono text-[#1D3A30]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#1D3A30] mb-1">
                      المبلغ الإجمالي (د.ب) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="0.00"
                      value={orderForm.price}
                      onChange={(e) => setOrderForm({ ...orderForm, price: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-[#C7B895]/40 focus:ring-1 focus:ring-[#1D3A30] outline-none text-xs font-bold font-mono text-[#1D3A30]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#1D3A30] mb-1">
                    تفاصيل الطلب / الأقمشة *
                  </label>
                  <textarea
                    required
                    rows={2}
                    placeholder="مثال: 5 متر قماش حرير طبيعي أسود مع تطريز خفيف..."
                    value={orderForm.details}
                    onChange={(e) => setOrderForm({ ...orderForm, details: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-[#C7B895]/40 focus:ring-1 focus:ring-[#1D3A30] outline-none text-xs text-[#1D3A30]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-[#1D3A30] mb-1">
                      حالة الطلب
                    </label>
                    <select
                      value={orderForm.status}
                      onChange={(e) => setOrderForm({ ...orderForm, status: e.target.value as OrderStatus })}
                      className="w-full p-2.5 rounded-xl border border-[#C7B895]/40 focus:ring-1 focus:ring-[#1D3A30] outline-none text-xs bg-white text-[#1D3A30]"
                    >
                      <option value="قيد التجهيز">قيد التجهيز</option>
                      <option value="تم التسليم">تم التسليم</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#1D3A30] mb-1">
                      طريقة الدفع
                    </label>
                    <select
                      value={orderForm.paymentMethod}
                      onChange={(e) => setOrderForm({ ...orderForm, paymentMethod: e.target.value as PaymentMethod })}
                      className="w-full p-2.5 rounded-xl border border-[#C7B895]/40 focus:ring-1 focus:ring-[#1D3A30] outline-none text-xs bg-white text-[#1D3A30]"
                    >
                      <option value="بنفت بي">بنفت بي (BenefitPay)</option>
                      <option value="نقداً">نقداً (Cash)</option>
                      <option value="بطاقة ائتمانية">بطاقة ائتمانية</option>
                      <option value="تحويل بنكي">تحويل بنكي</option>
                      <option value="أخرى">أخرى</option>
                    </select>
                  </div>
                </div>

                {/* Date & Time Picker */}
                <div>
                  <label className="block text-[11px] font-bold text-[#1D3A30] mb-1">
                    تاريخ ووقت الطلب (بالدقيقة والساعة)
                  </label>
                  <input
                    type="datetime-local"
                    value={orderForm.datetimeStr}
                    onChange={(e) => setOrderForm({ ...orderForm, datetimeStr: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-[#C7B895]/40 focus:ring-1 focus:ring-[#1D3A30] outline-none text-xs font-mono text-[#1D3A30]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#1D3A30] mb-1">
                    ملاحظات إضافية
                  </label>
                  <input
                    type="text"
                    placeholder="أي تعليمات أو مقاسات خاصة..."
                    value={orderForm.notes}
                    onChange={(e) => setOrderForm({ ...orderForm, notes: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-[#C7B895]/40 focus:ring-1 focus:ring-[#1D3A30] outline-none text-xs text-[#1D3A30]"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full py-3 bg-[#1D3A30] text-[#E8D5A8] font-bold rounded-xl text-xs hover:bg-[#25493D] transition active:scale-98 shadow-sm border border-[#C7B895]/30"
                  >
                    {modalMode === 'edit' ? 'حفظ التعديلات' : 'حفظ الطلب وإصدار الفاتورة'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Invoice Preview Modal */}
      <AnimatePresence>
        {selectedInvoice && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedInvoice(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-xs"
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl z-10 overflow-hidden flex flex-col p-5 border border-[#C7B895]/40"
            >
              <div className="flex justify-between items-center pb-3 border-b border-[#C7B895]/20">
                <div className="flex items-center gap-2">
                  <NasjahLogo variant="emblem" size="xs" />
                  <span className="font-extrabold text-xs text-[#1D3A30] tracking-wider">
                    فاتورة دار نَسْجَة
                  </span>
                </div>
                <button
                  onClick={() => setSelectedInvoice(null)}
                  className="text-[#1D3A30]/60 hover:text-[#1D3A30] p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="py-4 space-y-3 text-xs">
                <div className="flex justify-between text-[11px] text-[#1D3A30]/70 font-mono">
                  <span>رقم الفاتورة: #{selectedInvoice.id}</span>
                  <span>{formatDateTime(selectedInvoice.createdAt).full}</span>
                </div>

                <div className="bg-[#FAF7F0] p-3 rounded-xl border border-[#C7B895]/20 space-y-1">
                  <p className="font-bold text-[#1D3A30] text-xs">{selectedInvoice.customerName}</p>
                  {selectedInvoice.phone && (
                    <p className="text-[11px] font-mono text-[#A99872]">{selectedInvoice.phone}</p>
                  )}
                  <p className="text-[11px] text-[#1D3A30]/80 mt-1">{selectedInvoice.details}</p>
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-[#C7B895]/20">
                  <span className="font-bold text-xs text-[#1D3A30]">المجموع المطلوب:</span>
                  <span className="text-base font-black text-[#1D3A30] font-mono">
                    {Number(selectedInvoice.price || selectedInvoice.total).toFixed(2)} د.ب
                  </span>
                </div>

                <div className="flex items-center justify-between text-[10px] text-[#1D3A30]/70">
                  <span>طريقة الدفع: {selectedInvoice.paymentMethod || 'بنفت بي'}</span>
                  <span>الحالة: {selectedInvoice.status || 'قيد التجهيز'}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#C7B895]/20">
                <button
                  onClick={() => generatePDF(selectedInvoice)}
                  className="py-2.5 bg-[#1D3A30] text-[#E8D5A8] rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-[#25493D] transition border border-[#C7B895]/30"
                >
                  <Download className="w-3.5 h-3.5 text-[#C7B895]" />
                  <span>تحميل PDF</span>
                </button>
                <button
                  onClick={() => window.print()}
                  className="py-2.5 bg-[#FAF7F0] text-[#1D3A30] rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-[#F4EBD4] transition border border-[#C7B895]/30"
                >
                  <Printer className="w-3.5 h-3.5 text-[#1D3A30]" />
                  <span>طباعة</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {orderToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              onClick={() => setOrderToDelete(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-xs"
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl z-10 text-center space-y-3 border border-[#C7B895]/30"
            >
              <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto border border-rose-200">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-[#1D3A30]">تأكيد حذف الطلب</h3>
              <p className="text-xs text-[#1D3A30]/70">
                هل أنت متأكد من رغبتك في حذف طلب "{orderToDelete.customerName}" بمبلغ {orderToDelete.price} د.ب نهائياً من السجل؟
              </p>
              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  onClick={confirmDeleteOrder}
                  className="py-2.5 bg-rose-600 text-white font-bold rounded-xl text-xs hover:bg-rose-700 transition shadow-xs"
                >
                  نعم، احذف الطلب
                </button>
                <button
                  onClick={() => setOrderToDelete(null)}
                  className="py-2.5 bg-stone-100 text-stone-700 font-bold rounded-xl text-xs hover:bg-stone-200 transition"
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
