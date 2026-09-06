import React, { useState, useEffect, useRef } from 'react';
import { Fabric } from '../types';
import { Plus, AlertCircle, Image as ImageIcon, Upload, Trash2, Minus, Search, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { persistInventory, getLocalData, syncWithServer, EVENT_DATA_UPDATED } from '../lib/dataService';

export default function Inventory() {
  const [inventory, setInventory] = useState<Fabric[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [fabricToDelete, setFabricToDelete] = useState<Fabric | null>(null);
  const [newFabric, setNewFabric] = useState({ name: '', quantity: 1, price: 0, imageUrl: '' });
  const [searchQuery, setSearchQuery] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const local = getLocalData();
    setInventory(local.inventory);

    syncWithServer().then((latest) => {
      setInventory(latest.inventory);
    });

    const handleUpdate = () => {
      const current = getLocalData();
      setInventory(current.inventory);
    };

    window.addEventListener(EVENT_DATA_UPDATED, handleUpdate);
    return () => window.removeEventListener(EVENT_DATA_UPDATED, handleUpdate);
  }, []);

  const saveInventory = (updated: Fabric[]) => {
    setInventory(updated);
    persistInventory(updated);
  };

  const confirmDeleteFabric = async () => {
    if (!fabricToDelete) return;
    const updated = inventory.filter(item => item.id !== fabricToDelete.id);
    saveInventory(updated);
    try {
      await fetch(`/api/inventory/${encodeURIComponent(fabricToDelete.id)}`, { method: 'DELETE' });
    } catch {}
    setFabricToDelete(null);
  };

  const handleDeleteAllFabrics = () => {
    if (inventory.length === 0) return;
    saveInventory([]);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewFabric({ ...newFabric, imageUrl: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddFabric = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFabric.name) return;
    
    const fabricItem: Fabric = {
      id: Date.now().toString(),
      name: newFabric.name.trim(),
      quantity: Number(newFabric.quantity) || 0,
      price: Number(newFabric.price) || 0,
      imageUrl: newFabric.imageUrl || undefined
    };

    const newInventory = [fabricItem, ...inventory];
    saveInventory(newInventory);

    setShowModal(false);
    setNewFabric({ name: '', quantity: 1, price: 0, imageUrl: '' });
  };

  const handleUpdateQuantity = (id: string, delta: number) => {
    const updated = inventory.map(item => {
      if (item.id === id) {
        const newQty = Math.max(0, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    });
    saveInventory(updated);
  };

  const filteredInventory = inventory.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalMeters = inventory.reduce((acc, f) => acc + (Number(f.quantity) || 0), 0);
  const lowStockCount = inventory.filter(f => (Number(f.quantity) || 0) <= 2).length;

  return (
    <div className="space-y-3.5 pb-6">
      {/* Top Mobile Header & Add Button */}
      <div className="flex items-center justify-between bg-white px-3.5 py-3 rounded-2xl border border-emerald-900/10 shadow-xs">
        <div>
          <h1 className="text-base font-extrabold text-emerald-950">مخزون الأقمشة</h1>
          <p className="text-[11px] text-emerald-800/60 font-medium">
            {inventory.length} نوع • {totalMeters} متر متوفر
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-emerald-900 text-white px-3 py-2 rounded-xl text-xs font-bold hover:bg-emerald-800 transition flex items-center gap-1 shadow-xs active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>قماش جديد</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-emerald-800/40" />
        <input
          type="text"
          placeholder="بحث في أسماء الأقمشة المتوفرة..."
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

      {/* Low stock notice banner if needed */}
      {lowStockCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 p-2.5 rounded-2xl flex items-center gap-2 text-xs text-amber-950">
          <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <span className="text-[11px] font-bold">
            هناك {lowStockCount} نوع قماش اقتربت كميته على النفاد (أقل من مترين).
          </span>
        </div>
      )}

      {/* Fabrics Grid / Feed */}
      {filteredInventory.length === 0 ? (
        <div className="bg-white rounded-3xl p-8 text-center border border-emerald-900/10 shadow-xs">
          <div className="w-12 h-12 bg-emerald-100 text-emerald-800 rounded-full flex items-center justify-center mx-auto mb-2">
            <ImageIcon className="w-6 h-6 opacity-60" />
          </div>
          <h3 className="text-sm font-bold text-emerald-950">لا توجد أقمشة مسجلة</h3>
          <p className="text-xs text-emerald-800/60 mt-1">
            {searchQuery ? 'لا توجد نتائج تطابق بحثك' : 'ابدأ بإضافة أول نوع قماش لإدارة كمياته وتحديد أسعاره'}
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="mt-4 bg-emerald-900 text-white text-xs font-bold px-4 py-2 rounded-xl"
          >
            + إضافة قماش جديد
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-3">
          {filteredInventory.map(item => {
            const isLow = (Number(item.quantity) || 0) <= 2;

            return (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-3 rounded-2xl border transition shadow-xs flex items-center gap-3 ${
                  isLow ? 'bg-amber-50/60 border-amber-200' : 'bg-white border-emerald-900/10'
                }`}
              >
                {/* Thumbnail */}
                <div className="w-16 h-16 rounded-xl bg-emerald-100/50 flex-shrink-0 overflow-hidden border border-emerald-900/10 flex items-center justify-center">
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon className="w-6 h-6 text-emerald-400" />
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-xs text-emerald-950 truncate">{item.name}</h3>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setFabricToDelete(item);
                      }}
                      className="p-1.5 text-emerald-700/50 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                      title="حذف القماش"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <p className="text-[11px] font-bold text-emerald-800/80 font-mono mt-0.5">
                    {item.price} د.ب <span className="text-[9px] font-normal text-emerald-800/60">/ للمتر</span>
                  </p>

                  {/* Quantity Stepper */}
                  <div className="flex items-center justify-between mt-2 pt-1 border-t border-emerald-900/5">
                    <span className="text-[10px] text-emerald-800/70 font-medium">الكمية المتوفرة:</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleUpdateQuantity(item.id, -1)}
                        disabled={item.quantity <= 0}
                        className="w-6 h-6 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 rounded-lg flex items-center justify-center font-bold disabled:opacity-30 transition active:scale-95"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className={`text-xs font-bold font-mono min-w-[28px] text-center ${isLow ? 'text-red-600' : 'text-emerald-950'}`}>
                        {item.quantity} م
                      </span>
                      <button
                        onClick={() => handleUpdateQuantity(item.id, 1)}
                        className="w-6 h-6 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 rounded-lg flex items-center justify-center font-bold transition active:scale-95"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Add Fabric Modal */}
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
              <div className="p-4 border-b border-emerald-900/10 flex justify-between items-center bg-emerald-950 text-emerald-50">
                <div>
                  <h3 className="text-sm font-bold">إضافة نوع قماش جديد</h3>
                  <p className="text-[10px] text-emerald-400">تحديد السعر والكمية والصورة</p>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-1.5 rounded-lg bg-emerald-900 text-emerald-300 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleAddFabric} className="flex-1 overflow-y-auto p-4 space-y-3 text-xs no-scrollbar">
                <div>
                  <label className="block text-[11px] font-bold text-emerald-950 mb-1">
                    اسم القماش *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: حرير ياباني، كتان فرنسي، كريب صالونا..."
                    value={newFabric.name}
                    onChange={(e) => setNewFabric({ ...newFabric, name: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-emerald-900/15 focus:ring-1 focus:ring-emerald-700 outline-none text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-emerald-950 mb-1">
                      الكمية بالمتر *
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={newFabric.quantity}
                      onChange={(e) => setNewFabric({ ...newFabric, quantity: Number(e.target.value) })}
                      className="w-full p-2.5 rounded-xl border border-emerald-900/15 focus:ring-1 focus:ring-emerald-700 outline-none text-xs font-bold font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-emerald-950 mb-1">
                      السعر للمتر (د.ب) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="0.00"
                      value={newFabric.price}
                      onChange={(e) => setNewFabric({ ...newFabric, price: Number(e.target.value) })}
                      className="w-full p-2.5 rounded-xl border border-emerald-900/15 focus:ring-1 focus:ring-emerald-700 outline-none text-xs font-bold font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-emerald-950 mb-1">
                    صورة القماش (اختياري)
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    ref={fileInputRef}
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  
                  {newFabric.imageUrl ? (
                    <div className="relative w-full h-32 rounded-xl overflow-hidden border border-emerald-900/15">
                      <img src={newFabric.imageUrl} alt="معاينة" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setNewFabric({ ...newFabric, imageUrl: '' })}
                        className="absolute top-2 left-2 bg-red-600 text-white p-1 rounded-lg"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full py-4 border-2 border-dashed border-emerald-900/20 rounded-xl flex flex-col items-center justify-center gap-1 hover:bg-emerald-50 transition text-emerald-800"
                    >
                      <Upload className="w-5 h-5 opacity-60" />
                      <span className="text-[11px] font-medium">التقاط أو اختيار صورة من الهاتف</span>
                    </button>
                  )}
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full py-3 bg-emerald-900 text-white font-bold rounded-xl text-xs hover:bg-emerald-800 transition active:scale-98 shadow-sm"
                  >
                    حفظ القماش في المخزون
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Fabric Confirmation Modal */}
      <AnimatePresence>
        {fabricToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              onClick={() => setFabricToDelete(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-xs"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl z-10 text-center space-y-4 border border-emerald-900/15"
            >
              <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-black text-emerald-950">تأكيد حذف القماش</h3>
                <p className="text-xs text-emerald-800/70 mt-1">
                  هل أنت متأكد من حذف قماش <strong className="text-emerald-950 font-bold">"{fabricToDelete.name}"</strong> نهائياً من المخزون؟
                </p>
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setFabricToDelete(null)}
                  className="flex-1 py-2.5 rounded-xl border border-emerald-900/20 text-emerald-900 font-bold text-xs hover:bg-emerald-50 transition"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={confirmDeleteFabric}
                  className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs transition shadow-sm"
                >
                  نعم، احذف القماش
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
