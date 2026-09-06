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
import { persistOrders, getLocalData, syncWithServer, EVENT_DATA_UPDATED } from '../lib/dataService';

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

  const confirmDeleteOrder = () => {
    if (!orderToDelete) return;
    const updated = orders.filter(o => o.id !== orderToDelete.id);
    saveOrders(updated);
    if (selectedInvoice?.id === orderToDelete.id) {
      setSelectedInvoice(null);
    }
    setOrderToDelete(null);
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
    doc.setTextColor(6, 78, 59);
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
      headStyles: { fillColor: [6, 78, 59] },
      head: [['بيان القماش / تفاصيل الطلب', 'المبلغ (د.ب)']],
      body: [
        [order.details, `${order.price.toFixed(2)} د.ب`]
      ],
    });
    
    const finalY = (doc as any).lastAutoTable?.finalY || 110;
    doc.setFontSize(13);
    doc.setTextColor(6, 78, 59);
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
      <div className="flex items-center justify-between bg-white px-3.5 py-3 rounded-2xl border border-emerald-900/10 shadow-xs">
        <div>
          <h1 className="text-base font-extrabold text-emerald-950">سجل الطلبات والمبيعات</h1>
          <p className="text-[11px] text-emerald-800/60 font-medium">
            {orders.length} طلب مسجل • {totalRevenue.toFixed(2)} د.ب
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="bg-emerald-900 text-white px-3 py-2 rounded-xl text-xs font-bold hover:bg-emerald-800 transition flex items-center gap-1 shadow-xs active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>طلب جديد</span>
        </button>
      </div>

      {/* Mobile Search & Filter Chips */}
      <div className="space-y-2">
        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-emerald-800/40" />
          <input
            type="text"
            placeholder="بحث باسم العميل، رقم الهاتف، أو القماش..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white pr-9 pl-8 py-2 text-xs rounded-xl border border-emerald-900/10 text-emerald-950 placeholder-emerald-800/40 focus:outline-none focus:ring-1 focus:ring-emerald-700"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-emerald-800/40 hover:text-emerald-950"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Horizontal Scrollable Filter Chips (no scrollbar) */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1 rounded-full text-[11px] font-bold whitespace-nowrap transition ${
              statusFilter === 'all'
                ? 'bg-emerald-900 text-white shadow-xs'
                : 'bg-white text-emerald-900/70 border border-emerald-900/10'
            }`}
          >
            الكل ({orders.length})
          </button>
          <button
            onClick={() => setStatusFilter('قيد التجهيز')}
            className={`px-3 py-1 rounded-full text-[11px] font-bold whitespace-nowrap transition flex items-center gap-1 ${
              statusFilter === 'قيد التجهيز'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'bg-white text-amber-800 border border-amber-200'
            }`}
          >
            قيد التجهيز ({pendingCount})
          </button>
          <button
            onClick={() => setStatusFilter('تم التسليم')}
            className={`px-3 py-1 rounded-full text-[11px] font-bold whitespace-nowrap transition ${
              statusFilter === 'تم التسليم'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white text-emerald-800 border border-emerald-200'
            }`}
          >
            تم التسليم ({orders.length - pendingCount})
          </button>
          <button
            onClick={() => setTimeFilter(timeFilter === 'today' ? 'all' : 'today')}
            className={`px-3 py-1 rounded-full text-[11px] font-bold whitespace-nowrap transition ${
              timeFilter === 'today'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white text-blue-800 border border-blue-200'
            }`}
          >
            طلبات اليوم
          </button>
          <button
            onClick={() => setTimeFilter(timeFilter === 'month' ? 'all' : 'month')}
            className={`px-3 py-1 rounded-full text-[11px] font-bold whitespace-nowrap transition ${
              timeFilter === 'month'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-white text-purple-800 border border-purple-200'
            }`}
          >
            هذا الشهر
          </button>
        </div>
      </div>

      {/* Orders Mobile Feed List */}
      {filteredOrders.length === 0 ? (
        <div className="bg-white rounded-3xl p-8 text-center border border-emerald-900/10 shadow-xs">
          <FileText className="w-10 h-10 text-emerald-800/30 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-emerald-950">لا توجد طلبات مطابقة</h3>
          <p className="text-xs text-emerald-800/60 mt-1">جرب تغيير شروط البحث أو الفلاتر</p>
          <button
            onClick={openCreateModal}
            className="mt-4 bg-emerald-900 text-white text-xs font-bold px-4 py-2 rounded-xl"
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
                className="bg-white rounded-2xl p-3.5 border border-emerald-900/10 shadow-xs hover:border-emerald-300 transition"
              >
                {/* Card Top: ID, Status Toggle, Price */}
                <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-emerald-900/5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-mono bg-emerald-100/70 text-emerald-900 font-bold px-1.5 py-0.5 rounded">
                      #{order.id}
                    </span>
                    
                    {/* Status button (1-tap to switch status) */}
                    <button
                      onClick={() => handleToggleStatus(order.id)}
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1 transition active:scale-95 ${
                        order.status === 'تم التسليم'
                          ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                          : 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                      }`}
                      title="اضغط لتغيير الحالة"
                    >
                      {order.status === 'تم التسليم' ? (
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      ) : (
                        <Clock className="w-3 h-3 text-amber-600" />
                      )}
                      <span>{order.status || 'قيد التجهيز'}</span>
                    </button>
                  </div>

                  <div className="text-left">
                    <span className="text-sm font-black text-emerald-950 font-mono">
                      {Number(order.price || order.total).toFixed(2)}{' '}
                      <span className="text-[10px] font-bold text-emerald-800">د.ب</span>
                    </span>
                  </div>
                </div>

                {/* Card Body: Customer & Fabric Details */}
                <div className="py-2.5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-emerald-950">
                      {order.customerName}
                    </h3>
                    
                    {cleanPhone && (
                      <div className="flex items-center gap-1">
                        <a
                          href={`tel:${cleanPhone}`}
                          className="text-[10px] font-mono text-emerald-800/80 hover:text-emerald-950"
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

                  <p className="text-xs text-emerald-900/80 font-medium mt-1 leading-relaxed">
                    {order.details}
                  </p>

                  {order.notes && (
                    <p className="text-[10px] bg-amber-50 text-amber-900 p-1.5 rounded-lg mt-1.5 border border-amber-200/60">
                      ملاحظة: {order.notes}
                    </p>
                  )}
                </div>

                {/* Card Meta & Action Buttons Footer */}
                <div className="pt-2 border-t border-emerald-900/5 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-[10px] text-emerald-800/60 font-mono">
                    <span className="bg-emerald-50 px-1.5 py-0.5 rounded text-emerald-800 font-medium">
                      {order.paymentMethod || 'بنفت بي'}
                    </span>
                    <span>•</span>
                    <span className={isToday ? "font-bold text-emerald-900" : ""}>
                      {full}
                    </span>
                  </div>

                  {/* Actions Toolbar */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setSelectedInvoice(order)}
                      className="p-1.5 text-emerald-800 hover:bg-emerald-50 rounded-lg transition"
                      title="معاينة الفاتورة"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => openEditModal(order)}
                      className="p-1.5 text-blue-700 hover:bg-blue-50 rounded-lg transition"
                      title="تعديل تفاصيل الطلب"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => generatePDF(order)}
                      className="p-1.5 text-emerald-700 hover:bg-emerald-50 rounded-lg transition"
                      title="تحميل PDF"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setOrderToDelete(order)}
                      className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition"
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
              className="relative w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl z-10 max-h-[90dvh] flex flex-col overflow-hidden"
            >
              {/* Modal Header */}
              <div className="p-4 border-b border-emerald-900/10 flex justify-between items-center bg-emerald-950 text-emerald-50">
                <div>
                  <h3 className="text-sm font-bold">
                    {modalMode === 'edit' ? 'تعديل بيانات الطلب' : 'تسجيل طلب مبيعات جديد'}
                  </h3>
                  <p className="text-[10px] text-emerald-400">
                    {modalMode === 'edit' ? 'تصحيح الأخطاء أو تعديل التوقيت' : 'أدخل بيانات العميل والمبلغ'}
                  </p>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-1.5 rounded-lg bg-emerald-900 text-emerald-300 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Form Interior */}
              <form onSubmit={handleSaveOrder} className="flex-1 overflow-y-auto p-4 space-y-3 text-xs no-scrollbar">
                <div>
                  <label className="block text-[11px] font-bold text-emerald-950 mb-1">
                    اسم العميل *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: أم عبدالله، سارة جاسم..."
                    value={orderForm.customerName}
                    onChange={(e) => setOrderForm({ ...orderForm, customerName: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-emerald-900/15 focus:ring-1 focus:ring-emerald-700 outline-none text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-emerald-950 mb-1">
                      رقم الهاتف / واتساب
                    </label>
                    <input
                      type="tel"
                      placeholder="97333XXXXXX"
                      value={orderForm.phone}
                      onChange={(e) => setOrderForm({ ...orderForm, phone: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-emerald-900/15 focus:ring-1 focus:ring-emerald-700 outline-none text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-emerald-950 mb-1">
                      المبلغ الإجمالي (د.ب) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="0.00"
                      value={orderForm.price}
                      onChange={(e) => setOrderForm({ ...orderForm, price: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-emerald-900/15 focus:ring-1 focus:ring-emerald-700 outline-none text-xs font-bold font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-emerald-950 mb-1">
                    تفاصيل الطلب / الأقمشة *
                  </label>
                  <textarea
                    required
                    rows={2}
                    placeholder="مثال: 5 متر قماش حرير طبيعي أسود مع تطريز خفيف..."
                    value={orderForm.details}
                    onChange={(e) => setOrderForm({ ...orderForm, details: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-emerald-900/15 focus:ring-1 focus:ring-emerald-700 outline-none text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-emerald-950 mb-1">
                      حالة الطلب
                    </label>
                    <select
                      value={orderForm.status}
                      onChange={(e) => setOrderForm({ ...orderForm, status: e.target.value as OrderStatus })}
                      className="w-full p-2.5 rounded-xl border border-emerald-900/15 focus:ring-1 focus:ring-emerald-700 outline-none text-xs bg-white"
                    >
                      <option value="قيد التجهيز">قيد التجهيز</option>
                      <option value="تم التسليم">تم التسليم</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-emerald-950 mb-1">
                      طريقة الدفع
                    </label>
                    <select
                      value={orderForm.paymentMethod}
                      onChange={(e) => setOrderForm({ ...orderForm, paymentMethod: e.target.value as PaymentMethod })}
                      className="w-full p-2.5 rounded-xl border border-emerald-900/15 focus:ring-1 focus:ring-emerald-700 outline-none text-xs bg-white"
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
                  <label className="block text-[11px] font-bold text-emerald-950 mb-1">
                    تاريخ ووقت الطلب (بالدقيقة والساعة)
                  </label>
                  <input
                    type="datetime-local"
                    value={orderForm.datetimeStr}
                    onChange={(e) => setOrderForm({ ...orderForm, datetimeStr: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-emerald-900/15 focus:ring-1 focus:ring-emerald-700 outline-none text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-emerald-950 mb-1">
                    ملاحظات إضافية
                  </label>
                  <input
                    type="text"
                    placeholder="أي تعليمات أو مقاسات خاصة..."
                    value={orderForm.notes}
                    onChange={(e) => setOrderForm({ ...orderForm, notes: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-emerald-900/15 focus:ring-1 focus:ring-emerald-700 outline-none text-xs"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full py-3 bg-emerald-900 text-white font-bold rounded-xl text-xs hover:bg-emerald-800 transition active:scale-98 shadow-sm"
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
              className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl z-10 overflow-hidden flex flex-col p-5 border border-emerald-900/20"
            >
              <div className="flex justify-between items-center pb-3 border-b border-emerald-900/10">
                <div className="flex items-center gap-2">
                  <NasjahLogo variant="emblem" size="xs" />
                  <span className="font-extrabold text-xs text-emerald-950 tracking-wider uppercase">
                    فاتورة نَسْجَة
                  </span>
                </div>
                <button
                  onClick={() => setSelectedInvoice(null)}
                  className="text-emerald-800/60 hover:text-emerald-950 p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="py-4 space-y-3 text-xs">
                <div className="flex justify-between text-[11px] text-emerald-800/70 font-mono">
                  <span>رقم الفاتورة: #{selectedInvoice.id}</span>
                  <span>{formatDateTime(selectedInvoice.createdAt).full}</span>
                </div>

                <div className="bg-emerald-50/60 p-3 rounded-xl border border-emerald-900/5 space-y-1">
                  <p className="font-bold text-emerald-950 text-xs">{selectedInvoice.customerName}</p>
                  {selectedInvoice.phone && (
                    <p className="text-[11px] font-mono text-emerald-800">{selectedInvoice.phone}</p>
                  )}
                  <p className="text-[11px] text-emerald-900/80 mt-1">{selectedInvoice.details}</p>
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-emerald-900/10">
                  <span className="font-bold text-xs text-emerald-950">المجموع المطلوب:</span>
                  <span className="text-base font-black text-emerald-900 font-mono">
                    {Number(selectedInvoice.price || selectedInvoice.total).toFixed(2)} د.ب
                  </span>
                </div>

                <div className="flex items-center justify-between text-[10px] text-emerald-800/60">
                  <span>طريقة الدفع: {selectedInvoice.paymentMethod || 'بنفت بي'}</span>
                  <span>الحالة: {selectedInvoice.status || 'قيد التجهيز'}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-emerald-900/10">
                <button
                  onClick={() => generatePDF(selectedInvoice)}
                  className="py-2.5 bg-emerald-900 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-emerald-800 transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>تحميل PDF</span>
                </button>
                <button
                  onClick={() => window.print()}
                  className="py-2.5 bg-emerald-100 text-emerald-900 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-emerald-200 transition"
                >
                  <Printer className="w-3.5 h-3.5" />
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
              className="relative w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl z-10 text-center space-y-3"
            >
              <div className="w-12 h-12 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-emerald-950">تأكيد حذف الطلب</h3>
              <p className="text-xs text-emerald-800/70">
                هل أنت متأكد من رغبتك في حذف طلب "{orderToDelete.customerName}" بمبلغ {orderToDelete.price} د.ب نهائياً من السجل؟
              </p>
              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  onClick={confirmDeleteOrder}
                  className="py-2.5 bg-red-600 text-white font-bold rounded-xl text-xs hover:bg-red-700 transition"
                >
                  نعم، احذف الطلب
                </button>
                <button
                  onClick={() => setOrderToDelete(null)}
                  className="py-2.5 bg-slate-100 text-slate-700 font-bold rounded-xl text-xs hover:bg-slate-200 transition"
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
