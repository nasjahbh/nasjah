import React, { useState, useEffect } from 'react';
import { 
  Plus, FileText, Phone, Trash2, CheckCircle2, Clock, Search, 
  MessageSquare, Eye, X, Printer, Download, Edit3, Calendar, 
  CreditCard, AlertTriangle, Filter, RotateCcw, ChevronDown,
  Ruler, Layers, Minus, Sparkles, Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { Fabric, Order, OrderStatus, PaymentMethod } from '../types';
import { formatDateTime, toDatetimeLocal, fromDatetimeLocal } from '../lib/dateUtils';
import NasjahLogo from '../components/NasjahLogo';
import WhatsAppIcon from '../components/WhatsAppIcon';
import { 
  persistOrders, 
  deleteOrderPermanently, 
  persistInventory,
  getLocalData, 
  syncWithServer, 
  EVENT_DATA_UPDATED 
} from '../lib/dataService';
import { cn } from '../lib/utils';

export default function Orders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [fabrics, setFabrics] = useState<Fabric[]>([]);
  const availableFabrics = fabrics.filter(f => !f.category || f.category === 'أقمشة');
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  
  // Fabric selection in modal
  const [selectedFabricId, setSelectedFabricId] = useState<string | null>(null);
  const [selectedMeters, setSelectedMeters] = useState<number>(1);
  const [metersInputStr, setMetersInputStr] = useState<string>('1');
  const [customFabricMode, setCustomFabricMode] = useState<boolean>(false);
  const [stockError, setStockError] = useState<string | null>(null);

  // Deletion modal state
  const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);

  // Search and filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [showDateFilter, setShowDateFilter] = useState<boolean>(false);

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
    setSelectedFabricId(null);
    setSelectedMeters(1);
    setMetersInputStr('1');
    setCustomFabricMode(false);
    setStockError(null);
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
    setStockError(null);

    if (order.fabricId) {
      setSelectedFabricId(order.fabricId);
      const m = order.fabricMeters || 1;
      setSelectedMeters(m);
      setMetersInputStr(String(m));
      setCustomFabricMode(false);
    } else {
      setSelectedFabricId(null);
      setSelectedMeters(1);
      setMetersInputStr('1');
      setCustomFabricMode(true);
    }

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

  // Handle fabric selection in the horizontal card list
  const handleSelectFabric = (fabric: Fabric) => {
    const isAlreadySelected = selectedFabricId === fabric.id;
    if (isAlreadySelected) {
      setSelectedFabricId(fabric.id);
    } else {
      setSelectedFabricId(fabric.id);
    }
    setCustomFabricMode(false);
    setStockError(null);

    const parsedM = parseFloat(metersInputStr);
    const meters = !isNaN(parsedM) && parsedM > 0 ? parsedM : (selectedMeters > 0 ? selectedMeters : 1);
    const detailsText = `قماش ${fabric.name} (${meters} متر)`;
    
    // Auto-calculate suggested price if fabric has price
    const suggestedPrice = fabric.price > 0 ? (fabric.price * meters).toFixed(2) : orderForm.price;

    setOrderForm(prev => ({
      ...prev,
      details: detailsText,
      price: suggestedPrice || prev.price
    }));

    // Check stock immediately
    if ((Number(fabric.quantity) || 0) <= 0) {
      setStockError(`تنبيه: قماش "${fabric.name}" نفد من المخزون تماماً (0 متر متوفر). لا يمكن إتمام الطلب.`);
    } else if (meters > fabric.quantity) {
      setStockError(`تنبيه: الأمتار المطلوبة (${meters} م) تتجاوز الكمية المتوفرة بالمخزون (${fabric.quantity} م فقط).`);
    }
  };

  // Handle changing meters via stepper (+0.5 / -0.5) or quick chips
  const handleChangeMeters = (newMeters: number) => {
    const cleanMeters = Math.round(Math.max(0.1, newMeters) * 10) / 10;
    setSelectedMeters(cleanMeters);
    setMetersInputStr(String(cleanMeters));

    const fabric = fabrics.find(f => f.id === selectedFabricId);
    if (fabric) {
      const detailsText = `قماش ${fabric.name} (${cleanMeters} متر)`;
      const suggestedPrice = fabric.price > 0 ? (fabric.price * cleanMeters).toFixed(2) : orderForm.price;

      setOrderForm(prev => ({
        ...prev,
        details: detailsText,
        price: suggestedPrice || prev.price
      }));

      // Stock validation
      if ((Number(fabric.quantity) || 0) <= 0) {
        setStockError(`تنبيه: قماش "${fabric.name}" نفد من المخزون تماماً.`);
      } else if (cleanMeters > fabric.quantity) {
        setStockError(`عذراً، الأمتار المطلوبة (${cleanMeters} م) غير متوفرة. المتوفر حالياً بالمخزون هو ${fabric.quantity} متر فقط.`);
      } else {
        setStockError(null);
      }
    }
  };

  // Handle free-form typing of meters (e.g. "22.5", "3.5", "0.5")
  const handleMetersInputChange = (rawVal: string) => {
    setMetersInputStr(rawVal);
    const parsed = parseFloat(rawVal);
    if (!isNaN(parsed) && parsed > 0) {
      setSelectedMeters(parsed);

      const fabric = fabrics.find(f => f.id === selectedFabricId);
      if (fabric) {
        const detailsText = `قماش ${fabric.name} (${parsed} متر)`;
        const suggestedPrice = fabric.price > 0 ? (fabric.price * parsed).toFixed(2) : orderForm.price;

        setOrderForm(prev => ({
          ...prev,
          details: detailsText,
          price: suggestedPrice || prev.price
        }));

        // Stock validation
        if ((Number(fabric.quantity) || 0) <= 0) {
          setStockError(`تنبيه: قماش "${fabric.name}" نفد من المخزون تماماً.`);
        } else if (parsed > fabric.quantity) {
          setStockError(`عذراً، الأمتار المطلوبة (${parsed} م) غير متوفرة. المتوفر حالياً بالمخزون هو ${fabric.quantity} متر فقط.`);
        } else {
          setStockError(null);
        }
      }
    } else if (rawVal === '' || rawVal === '.') {
      setStockError('يرجى كتابة عدد أمتار صحيح.');
    }
  };

  const handleSaveOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setStockError(null);

    if (!orderForm.customerName.trim()) {
      setStockError('يرجى كتابة اسم العميل.');
      return;
    }

    const priceNum = parseFloat(orderForm.price);
    if (isNaN(priceNum) || priceNum < 0) {
      setStockError('يرجى إدخال مبلغ إجمالي صحيح.');
      return;
    }

    const chosenFabric = fabrics.find(f => f.id === selectedFabricId);
    const parsedFromInput = parseFloat(metersInputStr);
    const effectiveMeters = !isNaN(parsedFromInput) && parsedFromInput > 0
      ? Math.round(parsedFromInput * 10) / 10
      : selectedMeters;

    // CRITICAL: Strict stock verification if choosing a fabric from inventory
    if (!customFabricMode && selectedFabricId && chosenFabric) {
      const availableQty = Number(chosenFabric.quantity) || 0;

      if (modalMode === 'create') {
        if (availableQty <= 0) {
          setStockError(`عذراً، لا يمكن إتمام الطلب: قماش "${chosenFabric.name}" نفد من المخزون (0 متر متوفر).`);
          return;
        }
        if (effectiveMeters > availableQty) {
          setStockError(`عذراً، لا يمكن إتمام الطلب: الأمتار المطلوبة (${effectiveMeters} م) أكبر من المتوفر بالمخزون (${availableQty} م فقط).`);
          return;
        }
        if (effectiveMeters <= 0) {
          setStockError('يرجى إدخال عدد أمتار صحيح أكبر من الصفر.');
          return;
        }
      } else if (modalMode === 'edit') {
        // In edit mode, take into account already reserved meters
        const prevOrder = orders.find(o => o.id === editingOrderId);
        const prevMeters = (prevOrder?.fabricId === selectedFabricId) ? (prevOrder.fabricMeters || 0) : 0;
        const totalEffective = availableQty + prevMeters;

        if (effectiveMeters > totalEffective) {
          setStockError(`عذراً، لا يمكن إتمام التعديل: الأمتار المطلوبة (${effectiveMeters} م) تتجاوز الكمية المتوفرة (${totalEffective} م).`);
          return;
        }
      }
    } else if (!customFabricMode && availableFabrics.length > 0 && !selectedFabricId) {
      setStockError('يرجى الضغط على أحد الأقمشة من القائمة الأفقية لاختياره.');
      return;
    }

    if (!orderForm.details.trim()) {
      setStockError('يرجى تحديد القماش أو كتابة تفاصيل الطلب.');
      return;
    }

    const createdAtMs = fromDatetimeLocal(orderForm.datetimeStr);

    // STEP 1: Deduct meters from inventory
    if (!customFabricMode && selectedFabricId && chosenFabric) {
      let updatedFabrics = [...fabrics];

      if (modalMode === 'create') {
        updatedFabrics = updatedFabrics.map(f => {
          if (f.id === selectedFabricId) {
            const newQty = Math.max(0, (Number(f.quantity) || 0) - effectiveMeters);
            return { ...f, quantity: Math.round(newQty * 10) / 10 };
          }
          return f;
        });
      } else if (modalMode === 'edit') {
        const prevOrder = orders.find(o => o.id === editingOrderId);
        // If order had a previous fabric, restore its meters first
        if (prevOrder?.fabricId) {
          updatedFabrics = updatedFabrics.map(f => {
            if (f.id === prevOrder.fabricId) {
              const restored = (Number(f.quantity) || 0) + (prevOrder.fabricMeters || 0);
              return { ...f, quantity: Math.round(restored * 10) / 10 };
            }
            return f;
          });
        }
        // Deduct new meters
        updatedFabrics = updatedFabrics.map(f => {
          if (f.id === selectedFabricId) {
            const newQty = Math.max(0, (Number(f.quantity) || 0) - effectiveMeters);
            return { ...f, quantity: Math.round(newQty * 10) / 10 };
          }
          return f;
        });
      }

      setFabrics(updatedFabrics);
      persistInventory(updatedFabrics).catch(() => {});
    }

    // STEP 2: Save order
    const finalDetails = orderForm.details.trim();
    const finalFabricId = !customFabricMode && selectedFabricId ? selectedFabricId : undefined;
    const finalFabricMeters = !customFabricMode && selectedFabricId ? effectiveMeters : undefined;
    const finalFabricName = !customFabricMode && chosenFabric ? chosenFabric.name : undefined;

    if (modalMode === 'edit' && editingOrderId) {
      const updatedOrders = orders.map(o => {
        if (o.id === editingOrderId) {
          return {
            ...o,
            customerName: orderForm.customerName.trim(),
            phone: orderForm.phone.trim(),
            details: finalDetails,
            price: priceNum,
            total: priceNum,
            status: orderForm.status,
            paymentMethod: orderForm.paymentMethod,
            notes: orderForm.notes.trim(),
            createdAt: createdAtMs,
            fabricId: finalFabricId,
            fabricMeters: finalFabricMeters,
            fabricName: finalFabricName
          };
        }
        return o;
      });
      saveOrders(updatedOrders);
    } else {
      const newOrderData: Order = {
        id: Math.random().toString(36).substring(2, 8).toUpperCase(),
        customerName: orderForm.customerName.trim(),
        phone: orderForm.phone.trim(),
        details: finalDetails,
        price: priceNum,
        total: priceNum,
        status: orderForm.status,
        paymentMethod: orderForm.paymentMethod,
        notes: orderForm.notes.trim(),
        createdAt: createdAtMs,
        fabricId: finalFabricId,
        fabricMeters: finalFabricMeters,
        fabricName: finalFabricName
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

    // Restore fabric inventory meters if this order had deducted meters
    if (orderToDelete.fabricId && orderToDelete.fabricMeters) {
      const restoredFabrics = fabrics.map(f => {
        if (f.id === orderToDelete.fabricId) {
          const restored = (Number(f.quantity) || 0) + (orderToDelete.fabricMeters || 0);
          return { ...f, quantity: Math.round(restored * 10) / 10 };
        }
        return f;
      });
      setFabrics(restoredFabrics);
      persistInventory(restoredFabrics).catch(() => {});
    }

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
    doc.text("فاتورة مبيعات - نَسْجَة للأقمشة", 105, 20, { align: "center" });
    
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

  // Filter logic with custom date range
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

    if (startDate) {
      const startTimestamp = new Date(startDate).setHours(0, 0, 0, 0);
      if (o.createdAt < startTimestamp) return false;
    }

    if (endDate) {
      const endTimestamp = new Date(endDate).setHours(23, 59, 59, 999);
      if (o.createdAt > endTimestamp) return false;
    }

    return true;
  });

  const totalRevenue = orders.reduce((sum, o) => sum + (Number(o.total || o.price) || 0), 0);
  const pendingCount = orders.filter(o => o.status === 'قيد التجهيز' || !o.status).length;
  const isDateFiltered = Boolean(startDate || endDate);

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
            className={`px-3 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap transition cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-[#1D3A30] text-[#E8D5A8] shadow-xs'
                : 'bg-white text-[#1D3A30]/80 border border-[#C7B895]/30 hover:bg-[#FAF7F0]'
            }`}
          >
            الكل ({orders.length})
          </button>
          <button
            onClick={() => setStatusFilter('قيد التجهيز')}
            className={`px-3 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap transition flex items-center gap-1 cursor-pointer ${
              statusFilter === 'قيد التجهيز'
                ? 'bg-[#A99872] text-[#FAF7F0] shadow-xs'
                : 'bg-white text-[#A99872] border border-[#C7B895]/50 hover:bg-[#FAF7F0]'
            }`}
          >
            قيد التجهيز ({pendingCount})
          </button>
          <button
            onClick={() => setStatusFilter('تم التسليم')}
            className={`px-3 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap transition cursor-pointer ${
              statusFilter === 'تم التسليم'
                ? 'bg-[#1D3A30] text-[#E8D5A8] shadow-xs'
                : 'bg-white text-[#1D3A30] border border-[#1D3A30]/30 hover:bg-[#FAF7F0]'
            }`}
          >
            تم التسليم ({orders.length - pendingCount})
          </button>

          {/* Date Range Toggle Button */}
          <button
            onClick={() => setShowDateFilter(!showDateFilter)}
            className={`px-3 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap transition flex items-center gap-1.5 cursor-pointer ${
              isDateFiltered || showDateFilter
                ? 'bg-[#1D3A30] text-[#E8D5A8] border border-[#C7B895]/60 shadow-xs'
                : 'bg-white text-[#1D3A30]/80 border border-[#C7B895]/30 hover:bg-[#FAF7F0]'
            }`}
            title="فرز وتحديد الطلبات حسب فترة تواريخ مخصصة"
          >
            <Calendar className="w-3.5 h-3.5 text-[#C7B895]" />
            <span>فرز بالتاريخ</span>
            {isDateFiltered && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            )}
          </button>

          {isDateFiltered && (
            <button
              onClick={() => {
                setStartDate('');
                setEndDate('');
              }}
              className="px-2.5 py-1.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition whitespace-nowrap cursor-pointer"
              title="إلغاء فرز التواريخ"
            >
              إلغاء التاريخ ✕
            </button>
          )}
        </div>

        {/* Expandable Custom Date Range Filter Panel */}
        <AnimatePresence>
          {showDateFilter && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden bg-white p-3 rounded-2xl border border-[#C7B895]/40 shadow-xs space-y-2.5"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#1D3A30] flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5 text-[#C7B895]" />
                  تحديد الطلبات في فترة تواريخ مخصصة:
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      const todayStr = new Date().toISOString().split('T')[0];
                      setStartDate(todayStr);
                      setEndDate(todayStr);
                    }}
                    className="text-[10px] font-bold text-[#1D3A30] bg-[#FAF7F0] px-2 py-0.5 rounded border border-[#C7B895]/30 hover:bg-[#E8D5A8]/50"
                  >
                    اليوم
                  </button>
                  <button
                    onClick={() => {
                      const d = new Date();
                      const firstDay = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
                      const todayStr = d.toISOString().split('T')[0];
                      setStartDate(firstDay);
                      setEndDate(todayStr);
                    }}
                    className="text-[10px] font-bold text-[#1D3A30] bg-[#FAF7F0] px-2 py-0.5 rounded border border-[#C7B895]/30 hover:bg-[#E8D5A8]/50"
                  >
                    هذا الشهر
                  </button>
                  <button
                    onClick={() => setShowDateFilter(false)}
                    className="text-[#1D3A30]/50 hover:text-[#1D3A30] p-1"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="block text-[10px] font-bold text-[#1D3A30]/70 mb-1">
                    تاريخ البداية (من):
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-[#FAF7F0] border border-[#C7B895]/40 rounded-xl px-2.5 py-1.5 text-xs text-[#1D3A30] focus:outline-none focus:ring-1 focus:ring-[#1D3A30]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[#1D3A30]/70 mb-1">
                    تاريخ النهاية (إلى):
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-[#FAF7F0] border border-[#C7B895]/40 rounded-xl px-2.5 py-1.5 text-xs text-[#1D3A30] focus:outline-none focus:ring-1 focus:ring-[#1D3A30]"
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
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

                {/* Fabric Selection or Manual Entry */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-[11px] font-bold text-[#1D3A30]">
                      تفاصيل الطلب / الأقمشة *
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setCustomFabricMode(!customFabricMode);
                        setStockError(null);
                      }}
                      className="text-[10px] text-[#A99872] hover:text-[#1D3A30] font-bold underline transition"
                    >
                      {customFabricMode ? 'العودة لاختيار أقمشة المخزون' : 'كتابة تفاصيل يدوية'}
                    </button>
                  </div>

                  {customFabricMode ? (
                    <textarea
                      required
                      rows={2}
                      placeholder="مثال: 5 متر قماش حرير طبيعي أسود مع تطريز خفيف..."
                      value={orderForm.details}
                      onChange={(e) => setOrderForm({ ...orderForm, details: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-[#C7B895]/40 focus:ring-1 focus:ring-[#1D3A30] outline-none text-xs text-[#1D3A30]"
                    />
                  ) : (
                    <div className="space-y-2.5">
                      {/* Horizontal scrollable box containing fabrics with images ("المستطيل") */}
                      <div className="relative bg-[#FAF7F0] p-2.5 rounded-2xl border border-[#C7B895]/40">
                        {availableFabrics.length === 0 ? (
                          <div className="text-center py-5 px-3">
                            <Layers className="w-8 h-8 text-[#C7B895] mx-auto mb-1.5 opacity-70" />
                            <p className="text-xs font-bold text-[#1D3A30]">لا توجد أقمشة مسجلة في المخزون حالياً</p>
                            <p className="text-[10px] text-[#A99872] mt-0.5">يمكنك إضافة أقمشة من قسم المخزون أو كتابة التفاصيل يدوياً</p>
                            <button
                              type="button"
                              onClick={() => setCustomFabricMode(true)}
                              className="mt-2 text-[11px] font-bold text-[#1D3A30] bg-white border border-[#C7B895]/40 px-3 py-1.5 rounded-xl hover:bg-[#FAF7F0] transition"
                            >
                              كتابة تفاصيل القماش يدوياً
                            </button>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center justify-between px-1 mb-2 text-[10px] text-[#A99872]">
                              <span className="font-medium">اضغط على أحد الأقمشة لاختياره (اسحب أفقياً):</span>
                              <span className="font-bold font-mono">{availableFabrics.length} قماش مسجل</span>
                            </div>

                            {/* Horizontal scroll carousel */}
                            <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-none snap-x">
                              {availableFabrics.map((f) => {
                                const isSelected = selectedFabricId === f.id;
                                const qty = Number(f.quantity) || 0;
                                const isOutOfStock = qty <= 0;
                                const img = f.imageUrl || f.image;

                                return (
                                  <button
                                    key={f.id}
                                    type="button"
                                    onClick={() => handleSelectFabric(f)}
                                    className={cn(
                                      "flex-shrink-0 w-28 p-2 rounded-xl text-right transition-all duration-200 relative snap-start flex flex-col items-center group",
                                      isSelected
                                        ? "bg-[#1D3A30] text-[#FAF7F0] ring-2 ring-[#C7B895] shadow-md border border-[#C7B895]"
                                        : isOutOfStock
                                        ? "bg-white/70 border border-red-200 opacity-60 hover:opacity-90"
                                        : "bg-white border border-[#C7B895]/30 hover:border-[#1D3A30]/50 hover:shadow-xs"
                                    )}
                                  >
                                    {/* Image Container */}
                                    <div className="relative w-full h-20 rounded-lg overflow-hidden bg-stone-100 mb-1.5 flex items-center justify-center">
                                      {img ? (
                                        <img
                                          src={img}
                                          alt={f.name}
                                          referrerPolicy="no-referrer"
                                          className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                                        />
                                      ) : (
                                        <div className="w-full h-full flex flex-col items-center justify-center text-[#A99872] bg-[#FAF7F0]">
                                          <Layers className="w-6 h-6 opacity-60" />
                                          <span className="text-[9px] mt-0.5 text-[#A99872]/80 font-bold">نَسْجَة</span>
                                        </div>
                                      )}

                                      {/* Selection Indicator Badge */}
                                      {isSelected && (
                                        <div className="absolute top-1 right-1 bg-emerald-500 text-white rounded-full p-0.5 shadow-sm">
                                          <Check className="w-3 h-3 stroke-[3]" />
                                        </div>
                                      )}

                                      {/* Stock pill badge */}
                                      <div className="absolute bottom-1 right-1 left-1">
                                        <span className={cn(
                                          "block text-center text-[9px] font-bold py-0.5 px-1 rounded backdrop-blur-xs font-mono",
                                          isOutOfStock
                                            ? "bg-red-500/90 text-white"
                                            : isSelected
                                            ? "bg-[#FAF7F0]/95 text-[#1D3A30]"
                                            : "bg-[#1D3A30]/85 text-[#FAF7F0]"
                                        )}>
                                          {isOutOfStock ? 'نفد المخزون' : `${qty} م متوفر`}
                                        </span>
                                      </div>
                                    </div>

                                    {/* Fabric Name */}
                                    <p className={cn(
                                      "font-bold text-[11px] leading-tight line-clamp-2 w-full text-center h-7 flex items-center justify-center",
                                      isSelected ? "text-[#FAF7F0]" : "text-[#1D3A30]"
                                    )}>
                                      {f.name}
                                    </p>

                                    {/* Price per meter */}
                                    <p className={cn(
                                      "text-[10px] font-mono mt-1 font-bold",
                                      isSelected ? "text-[#E8D5A8]" : "text-[#A99872]"
                                    )}>
                                      {f.price} د.ب / م
                                    </p>
                                  </button>
                                );
                              })}
                            </div>
                          </>
                        )}
                      </div>

                      {/* Meter Selection & Stock Availability Controls */}
                      {selectedFabricId && (() => {
                        const selectedFabric = fabrics.find(f => f.id === selectedFabricId);
                        if (!selectedFabric) return null;
                        const availableQty = Number(selectedFabric.quantity) || 0;
                        const isInsufficient = selectedMeters > availableQty;
                        const isOut = availableQty <= 0;

                        return (
                          <motion.div
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="p-3 bg-white rounded-2xl border border-[#C7B895]/40 space-y-2.5 shadow-xs"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5">
                                <Ruler className="w-4 h-4 text-[#1D3A30]" />
                                <span className="text-[11px] font-bold text-[#1D3A30]">
                                  عدد الأمتار المطلوبة من قماش ({selectedFabric.name}):
                                </span>
                              </div>
                              <span className="text-[11px] font-mono font-bold text-[#A99872]">
                                المتوفر: {availableQty} م
                              </span>
                            </div>

                            {/* Meter Stepper & Quick Pills (Supports half fractions like 22.5) */}
                            <div className="flex flex-wrap items-center gap-2">
                              <div className="flex items-center border border-[#C7B895]/40 rounded-xl overflow-hidden bg-[#FAF7F0] shadow-xs">
                                <button
                                  type="button"
                                  onClick={() => handleChangeMeters(Math.max(0.5, selectedMeters - 0.5))}
                                  className="px-2.5 py-2 hover:bg-[#C7B895]/20 text-[#1D3A30] transition active:scale-95"
                                  title="إنقاص نصف متر (-0.5)"
                                >
                                  <Minus className="w-3.5 h-3.5" />
                                </button>
                                <div className="flex items-center px-1">
                                  <input
                                    type="text"
                                    inputMode="decimal"
                                    placeholder="22.5"
                                    value={metersInputStr}
                                    onChange={(e) => handleMetersInputChange(e.target.value)}
                                    onBlur={() => {
                                      const p = parseFloat(metersInputStr);
                                      if (!isNaN(p) && p > 0) {
                                        const clean = Math.round(p * 10) / 10;
                                        setSelectedMeters(clean);
                                        setMetersInputStr(String(clean));
                                      } else {
                                        setSelectedMeters(1);
                                        setMetersInputStr('1');
                                        handleChangeMeters(1);
                                      }
                                    }}
                                    className="w-16 text-center text-xs font-extrabold font-mono bg-transparent outline-none text-[#1D3A30] py-1.5"
                                  />
                                  <span className="text-[10px] text-[#A99872] font-bold px-1">متر</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleChangeMeters(selectedMeters + 0.5)}
                                  className="px-2.5 py-2 hover:bg-[#C7B895]/20 text-[#1D3A30] transition active:scale-95"
                                  title="زيادة نصف متر (+0.5)"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              {/* Quick Meter Chips with fractions like 3.5 & 22.5 */}
                              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
                                {[1, 2, 3, 3.5, 4, 5, 10, 22.5].map((m) => (
                                  <button
                                    key={m}
                                    type="button"
                                    onClick={() => handleChangeMeters(m)}
                                    className={cn(
                                      "px-2 py-1 rounded-lg text-[10px] font-mono font-bold transition shrink-0",
                                      selectedMeters === m
                                        ? "bg-[#1D3A30] text-[#FAF7F0] shadow-xs"
                                        : "bg-[#FAF7F0] text-[#1D3A30] border border-[#C7B895]/30 hover:bg-[#C7B895]/20"
                                    )}
                                  >
                                    {m}م
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Suggested Price Calculation Breakdown */}
                            {selectedFabric.price > 0 && (
                              <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-[#C7B895]/20 text-[#1D3A30]">
                                <span>حساب المبلغ المقترح ({selectedFabric.price} د.ب × {selectedMeters} م):</span>
                                <span className="font-mono font-bold text-[#1D3A30]">
                                  {(selectedFabric.price * selectedMeters).toFixed(2)} د.ب
                                </span>
                              </div>
                            )}

                            {/* Real-time Stock Verification Feedback */}
                            {isOut ? (
                              <div className="flex items-center gap-1.5 p-2 rounded-xl bg-red-50 border border-red-200 text-red-700 text-[11px] font-bold">
                                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                                <span>عذراً، هذا القماش غير متوفر في المخزون (0 متر)! لا يمكن إتمام الطلب.</span>
                              </div>
                            ) : isInsufficient ? (
                              <div className="flex items-center gap-1.5 p-2 rounded-xl bg-red-50 border border-red-200 text-red-700 text-[11px] font-bold">
                                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                                <span>
                                  الأمتار المطلوبة ({selectedMeters} م) أكبر من المتوفر ({availableQty} م فقط)! لا يمكن إتمام الطلب.
                                </span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-medium">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                                <span>
                                  الأمتار متوفرة — سيتم خصم {selectedMeters} متر ويتبقى في المخزون {Math.round((availableQty - selectedMeters) * 10) / 10} متر.
                                </span>
                              </div>
                            )}
                          </motion.div>
                        );
                      })()}
                    </div>
                  )}

                  {/* Prominent Stock Error Alert */}
                  {stockError && (
                    <div className="flex items-center gap-2 p-2.5 rounded-xl bg-red-50 border border-red-300 text-red-800 text-[11px] font-bold animate-pulse">
                      <AlertTriangle className="w-4 h-4 flex-shrink-0 text-red-600" />
                      <span>{stockError}</span>
                    </div>
                  )}
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
                  {(() => {
                    const chosen = fabrics.find(f => f.id === selectedFabricId);
                    const isStockBlocking = Boolean(
                      !customFabricMode && chosen && (
                        (Number(chosen.quantity) || 0) <= 0 ||
                        selectedMeters > (Number(chosen.quantity) || 0)
                      )
                    );

                    return (
                      <button
                        type="submit"
                        disabled={isStockBlocking}
                        className={cn(
                          "w-full py-3 font-bold rounded-xl text-xs transition active:scale-98 shadow-sm border",
                          isStockBlocking
                            ? "bg-red-100 text-red-700 border-red-300 cursor-not-allowed opacity-80"
                            : "bg-[#1D3A30] text-[#E8D5A8] hover:bg-[#25493D] border-[#C7B895]/30"
                        )}
                      >
                        {isStockBlocking 
                          ? '⚠️ الأمتار غير متوفرة بالمخزون (لا يمكن إتمام الطلب)' 
                          : (modalMode === 'edit' ? 'حفظ التعديلات' : 'حفظ الطلب وإصدار الفاتورة')}
                      </button>
                    );
                  })()}
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
                    فاتورة نَسْجَة
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
