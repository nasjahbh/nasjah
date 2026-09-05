import React, { useState, useEffect } from 'react';
import { 
  Plus, Trash2, Receipt, DollarSign, Tag, Edit3, Clock, Calendar, 
  Search, Filter, AlertTriangle, X, CreditCard, UserCheck 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Expense, PaymentMethod } from '../types';
import { formatDateTime, toDatetimeLocal, fromDatetimeLocal } from '../lib/dateUtils';

const EXPENSE_CATEGORIES = [
  'أقمشة ومواد خام',
  'شحن وتوصيل',
  'تغليف ومطبوعات',
  'تسويق وإعلانات',
  'إيجار وكهرباء',
  'صيانة وأدوات',
  'رواتب وتشغيل',
  'عام ومصاريف أخرى'
];

export default function Expenses() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);

  // Deletion modal state
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);

  // Filter & search states
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [timeFilter, setTimeFilter] = useState<'all' | 'today' | 'month'>('all');

  // Form state
  const [expenseForm, setExpenseForm] = useState({
    description: '',
    amount: '',
    category: 'أقمشة ومواد خام',
    paymentMethod: 'بنفت بي' as PaymentMethod,
    paidTo: '',
    datetimeStr: toDatetimeLocal(),
    notes: ''
  });

  useEffect(() => {
    const saved: Expense[] = JSON.parse(localStorage.getItem('expensesData') || '[]');
    setExpenses(saved);
  }, []);

  const saveExpenses = (updated: Expense[]) => {
    setExpenses(updated);
    localStorage.setItem('expensesData', JSON.stringify(updated));
    localStorage.removeItem('insights_timestamp');
  };

  const openCreateModal = () => {
    setModalMode('create');
    setEditingExpenseId(null);
    setExpenseForm({
      description: '',
      amount: '',
      category: 'أقمشة ومواد خام',
      paymentMethod: 'بنفت بي',
      paidTo: '',
      datetimeStr: toDatetimeLocal(),
      notes: ''
    });
    setShowModal(true);
  };

  const openEditModal = (expense: Expense) => {
    setModalMode('edit');
    setEditingExpenseId(expense.id);
    setExpenseForm({
      description: expense.description,
      amount: String(expense.amount),
      category: expense.category || 'عام ومصاريف أخرى',
      paymentMethod: (expense.paymentMethod as PaymentMethod) || 'بنفت بي',
      paidTo: expense.paidTo || '',
      datetimeStr: toDatetimeLocal(expense.createdAt),
      notes: expense.notes || ''
    });
    setShowModal(true);
  };

  const handleSaveExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseForm.description || !expenseForm.amount) return;

    const amountNum = parseFloat(expenseForm.amount);
    const createdAtMs = fromDatetimeLocal(expenseForm.datetimeStr);

    if (modalMode === 'edit' && editingExpenseId) {
      // Edit existing expense
      const updated = expenses.map(exp => {
        if (exp.id === editingExpenseId) {
          return {
            ...exp,
            description: expenseForm.description.trim(),
            amount: amountNum,
            category: expenseForm.category,
            paymentMethod: expenseForm.paymentMethod,
            paidTo: expenseForm.paidTo.trim(),
            notes: expenseForm.notes.trim(),
            createdAt: createdAtMs
          };
        }
        return exp;
      });
      saveExpenses(updated);
    } else {
      // Create new expense
      const newExp: Expense = {
        id: Math.random().toString(36).substring(2, 8).toUpperCase(),
        description: expenseForm.description.trim(),
        amount: amountNum,
        category: expenseForm.category,
        paymentMethod: expenseForm.paymentMethod,
        paidTo: expenseForm.paidTo.trim(),
        notes: expenseForm.notes.trim(),
        createdAt: createdAtMs
      };
      saveExpenses([newExp, ...expenses]);
    }

    setShowModal(false);
  };

  const confirmDeleteExpense = () => {
    if (!expenseToDelete) return;
    const updated = expenses.filter(exp => exp.id !== expenseToDelete.id);
    saveExpenses(updated);
    setExpenseToDelete(null);
  };

  // Filter logic
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

  const filteredExpenses = expenses.filter(exp => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = (
      exp.description?.toLowerCase().includes(q) ||
      exp.category?.toLowerCase().includes(q) ||
      exp.paidTo?.toLowerCase().includes(q) ||
      exp.id?.toLowerCase().includes(q) ||
      (exp.notes && exp.notes.toLowerCase().includes(q))
    );
    if (!matchesSearch) return false;

    if (categoryFilter !== 'all' && exp.category !== categoryFilter) {
      return false;
    }

    if (timeFilter === 'today' && exp.createdAt < startOfToday) {
      return false;
    }
    if (timeFilter === 'month' && exp.createdAt < startOfMonth) {
      return false;
    }

    return true;
  });

  const totalAmount = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  return (
    <div className="space-y-3.5 pb-6">
      {/* Top Mobile Header & Add Button */}
      <div className="flex items-center justify-between bg-white px-3.5 py-3 rounded-2xl border border-emerald-900/10 shadow-xs">
        <div>
          <h1 className="text-base font-extrabold text-emerald-950">سجل المصروفات والنفقات</h1>
          <p className="text-[11px] text-red-700/80 font-medium">
            {expenses.length} بند • إجمالي: {totalAmount.toFixed(2)} د.ب
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="bg-red-700 text-white px-3 py-2 rounded-xl text-xs font-bold hover:bg-red-800 transition flex items-center gap-1 shadow-xs active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>مصروف جديد</span>
        </button>
      </div>

      {/* Mobile Search & Filter Chips */}
      <div className="space-y-2">
        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-emerald-800/40" />
          <input
            type="text"
            placeholder="بحث بوصف المصروف، التصنيف، أو المدفوع له..."
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

        {/* Categories Horizontal Scroll Chips (no scrollbar) */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          <button
            onClick={() => setCategoryFilter('all')}
            className={`px-3 py-1 rounded-full text-[11px] font-bold whitespace-nowrap transition ${
              categoryFilter === 'all'
                ? 'bg-emerald-900 text-white shadow-xs'
                : 'bg-white text-emerald-900/70 border border-emerald-900/10'
            }`}
          >
            الكل ({expenses.length})
          </button>
          
          {EXPENSE_CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(categoryFilter === cat ? 'all' : cat)}
              className={`px-3 py-1 rounded-full text-[11px] font-bold whitespace-nowrap transition ${
                categoryFilter === cat
                  ? 'bg-red-800 text-white shadow-xs'
                  : 'bg-white text-emerald-900/70 border border-emerald-900/10'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Expenses Mobile Cards Feed */}
      {filteredExpenses.length === 0 ? (
        <div className="bg-white rounded-3xl p-8 text-center border border-emerald-900/10 shadow-xs">
          <Receipt className="w-10 h-10 text-emerald-800/30 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-emerald-950">لا توجد مصروفات مسجلة</h3>
          <p className="text-xs text-emerald-800/60 mt-1">سجل نفقات المتجر لحساب الأرباح بدقة</p>
          <button
            onClick={openCreateModal}
            className="mt-4 bg-red-700 text-white text-xs font-bold px-4 py-2 rounded-xl"
          >
            + تسجيل مصروف جديد الآن
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {filteredExpenses.map((exp) => {
            const { full, isToday } = formatDateTime(exp.createdAt);

            return (
              <motion.div
                key={exp.id}
                layout
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl p-3.5 border border-emerald-900/10 shadow-xs hover:border-emerald-300 transition"
              >
                {/* Header: Category Badge + Amount */}
                <div className="flex items-center justify-between gap-2 pb-2 border-b border-emerald-900/5">
                  <span className="text-[10px] font-bold bg-emerald-100/70 text-emerald-900 px-2 py-0.5 rounded-full">
                    {exp.category || 'عام ومصاريف أخرى'}
                  </span>
                  
                  <span className="text-sm font-black text-red-700 font-mono">
                    -{Number(exp.amount).toFixed(2)}{' '}
                    <span className="text-[10px] font-bold">د.ب</span>
                  </span>
                </div>

                {/* Body: Description, Paid To & Notes */}
                <div className="py-2">
                  <h3 className="text-xs font-bold text-emerald-950 leading-snug">
                    {exp.description}
                  </h3>

                  {exp.paidTo && (
                    <div className="flex items-center gap-1 text-[11px] text-emerald-800/80 mt-1">
                      <UserCheck className="w-3 h-3 text-emerald-700" />
                      <span>المدفوع له: <strong>{exp.paidTo}</strong></span>
                    </div>
                  )}

                  {exp.notes && (
                    <p className="text-[10px] bg-slate-50 text-slate-700 p-1.5 rounded-lg mt-1.5 border border-slate-200/60">
                      ملاحظة: {exp.notes}
                    </p>
                  )}
                </div>

                {/* Footer: Date & Time, Payment Method, Actions */}
                <div className="pt-2 border-t border-emerald-900/5 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-[10px] text-emerald-800/60 font-mono">
                    <span className="bg-emerald-50 px-1.5 py-0.5 rounded text-emerald-800 font-medium">
                      {exp.paymentMethod || 'بنفت بي'}
                    </span>
                    <span>•</span>
                    <span className={isToday ? "font-bold text-emerald-900" : ""}>
                      {full}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(exp)}
                      className="p-1.5 text-blue-700 hover:bg-blue-50 rounded-lg transition"
                      title="تعديل تفاصيل المصروف"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setExpenseToDelete(exp)}
                      className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition"
                      title="حذف المصروف الخاطئ"
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

      {/* Create / Edit Modal (Mobile Bottom Sheet) */}
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
              <div className="p-4 border-b border-emerald-900/10 flex justify-between items-center bg-red-950 text-red-50">
                <div>
                  <h3 className="text-sm font-bold">
                    {modalMode === 'edit' ? 'تعديل بيانات المصروف' : 'تسجيل مصروف جديد'}
                  </h3>
                  <p className="text-[10px] text-red-300">
                    {modalMode === 'edit' ? 'تصحيح الأخطاء أو تعديل التوقيت' : 'سجل نفقات وتشغيل المتجر'}
                  </p>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-1.5 rounded-lg bg-red-900 text-red-200 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveExpense} className="flex-1 overflow-y-auto p-4 space-y-3 text-xs no-scrollbar">
                <div>
                  <label className="block text-[11px] font-bold text-emerald-950 mb-1">
                    بيان / وصف المصروف *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: شراء لفافات أقمشة قطن، فاتورة كهرباء المتجر..."
                    value={expenseForm.description}
                    onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-emerald-900/15 focus:ring-1 focus:ring-red-700 outline-none text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-emerald-950 mb-1">
                      المبلغ (د.ب) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="0.00"
                      value={expenseForm.amount}
                      onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-emerald-900/15 focus:ring-1 focus:ring-red-700 outline-none text-xs font-bold font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-emerald-950 mb-1">
                      المدفوع له (المورد / الجهة)
                    </label>
                    <input
                      type="text"
                      placeholder="اسم المحل أو الشخص"
                      value={expenseForm.paidTo}
                      onChange={(e) => setExpenseForm({ ...expenseForm, paidTo: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-emerald-900/15 focus:ring-1 focus:ring-red-700 outline-none text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-emerald-950 mb-1">
                      التصنيف
                    </label>
                    <select
                      value={expenseForm.category}
                      onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-emerald-900/15 focus:ring-1 focus:ring-red-700 outline-none text-xs bg-white"
                    >
                      {EXPENSE_CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-emerald-950 mb-1">
                      طريقة الدفع
                    </label>
                    <select
                      value={expenseForm.paymentMethod}
                      onChange={(e) => setExpenseForm({ ...expenseForm, paymentMethod: e.target.value as PaymentMethod })}
                      className="w-full p-2.5 rounded-xl border border-emerald-900/15 focus:ring-1 focus:ring-red-700 outline-none text-xs bg-white"
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
                    تاريخ ووقت الصرف (بالدقيقة والساعة)
                  </label>
                  <input
                    type="datetime-local"
                    value={expenseForm.datetimeStr}
                    onChange={(e) => setExpenseForm({ ...expenseForm, datetimeStr: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-emerald-900/15 focus:ring-1 focus:ring-red-700 outline-none text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-emerald-950 mb-1">
                    ملاحظات أو رقم السند
                  </label>
                  <input
                    type="text"
                    placeholder="رقم الفاتورة الورقية أو السند..."
                    value={expenseForm.notes}
                    onChange={(e) => setExpenseForm({ ...expenseForm, notes: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-emerald-900/15 focus:ring-1 focus:ring-red-700 outline-none text-xs"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full py-3 bg-red-700 text-white font-bold rounded-xl text-xs hover:bg-red-800 transition active:scale-98 shadow-sm"
                  >
                    {modalMode === 'edit' ? 'حفظ التعديلات' : 'تسجيل المصروف'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {expenseToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              onClick={() => setExpenseToDelete(null)}
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
              <h3 className="text-sm font-bold text-emerald-950">تأكيد حذف المصروف</h3>
              <p className="text-xs text-emerald-800/70">
                هل أنت متأكد من حذف مصروف "{expenseToDelete.description}" بقيمة {expenseToDelete.amount} د.ب من السجلات؟
              </p>
              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  onClick={confirmDeleteExpense}
                  className="py-2.5 bg-red-600 text-white font-bold rounded-xl text-xs hover:bg-red-700 transition"
                >
                  نعم، احذف المصروف
                </button>
                <button
                  onClick={() => setExpenseToDelete(null)}
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
