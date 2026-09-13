import React, { useState, useEffect, useRef } from 'react';
import { Fabric } from '../types';
import { Plus, AlertCircle, Image as ImageIcon, Upload, Trash2, Minus, Search, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { persistInventory, deleteFabricPermanently, getLocalData, syncWithServer, EVENT_DATA_UPDATED } from '../lib/dataService';

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
    const fabricId = fabricToDelete.id;
    setFabricToDelete(null);
    const updated = await deleteFabricPermanently(fabricId);
    setInventory(updated);
  };

  const handleDeleteAllFabrics = () => {
    if (inventory.length === 0) return;
    saveInventory([]);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          // Compress high-res mobile photos to max 600px
          const canvas = document.createElement('canvas');
          const maxDim = 600;
          let width = img.width;
          let height = img.height;
          if (width > height) {
            if (width > maxDim) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            }
          } else {
            if (height > maxDim) {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.78);
            setNewFabric(prev => ({ ...prev, imageUrl: compressedDataUrl }));
          } else {
            setNewFabric(prev => ({ ...prev, imageUrl: event.target?.result as string }));
          }
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddFabric = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFabric.name) return;
    
    const qtyNum = parseFloat(String(newFabric.quantity));
    const priceNum = parseFloat(String(newFabric.price));

    const fabricItem: Fabric = {
      id: Date.now().toString(),
      name: newFabric.name.trim(),
      quantity: !isNaN(qtyNum) ? Math.round(qtyNum * 10) / 10 : 0,
      price: !isNaN(priceNum) ? Math.round(priceNum * 100) / 100 : 0,
      imageUrl: newFabric.imageUrl || undefined
    };

    const newInventory = [fabricItem, ...inventory];
    saveInventory(newInventory);

    setShowModal(false);
    setNewFabric({ name: '', quantity: 1, price: 0, imageUrl: '' });
  };

  const [editingFabricId, setEditingFabricId] = useState<string | null>(null);
  const [editingQtyValue, setEditingQtyValue] = useState<string>('');

  const handleStartEditingQty = (fabric: Fabric) => {
    setEditingFabricId(fabric.id);
    setEditingQtyValue(String(fabric.quantity));
  };

  const handleFinishEditingQty = (id: string) => {
    if (editingFabricId !== id) return;
    const parsed = parseFloat(editingQtyValue.trim());
    if (!isNaN(parsed) && parsed >= 0) {
      const clean = Math.round(parsed * 10) / 10;
      const updated = inventory.map(it => it.id === id ? { ...it, quantity: clean } : it);
      saveInventory(updated);
    }
    setEditingFabricId(null);
    setEditingQtyValue('');
  };

  const handleKeyDownEditingQty = (e: React.KeyboardEvent<HTMLInputElement>, id: string) => {
    if (e.key === 'Enter') {
      handleFinishEditingQty(id);
    } else if (e.key === 'Escape') {
      setEditingFabricId(null);
      setEditingQtyValue('');
    }
  };

  const filteredInventory = inventory.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalMeters = Math.round(inventory.reduce((acc, f) => acc + (Number(f.quantity) || 0), 0) * 10) / 10;
  const lowStockCount = inventory.filter(f => (Number(f.quantity) || 0) <= 2).length;

  return (
    <div className="space-y-3.5 pb-6">
      {/* Top Mobile Header & Add Button */}
      <div className="flex items-center justify-between bg-white px-4 py-3 rounded-2xl border border-[#C7B895]/30 shadow-xs">
        <div>
          <h1 className="text-base font-extrabold text-[#1D3A30]">مخزون الأقمشة</h1>
          <p className="text-[11px] text-[#1D3A30]/70 font-medium">
            {inventory.length} نوع • {totalMeters} متر متوفر
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-[#1D3A30] text-[#E8D5A8] px-3.5 py-2 rounded-xl text-xs font-bold hover:bg-[#25493D] transition flex items-center gap-1.5 shadow-xs active:scale-95 border border-[#C7B895]/30"
        >
          <Plus className="w-4 h-4 text-[#C7B895]" />
          <span>قماش جديد</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-[#1D3A30]/40" />
        <input
          type="text"
          placeholder="بحث في أسماء الأقمشة المتوفرة..."
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

      {/* Low stock notice banner if needed */}
      {lowStockCount > 0 && (
        <div className="bg-[#FAF7F0] border border-[#C7B895] p-3 rounded-2xl flex items-center gap-2.5 text-xs text-[#1D3A30]">
          <AlertCircle className="w-4.5 h-4.5 text-amber-700 flex-shrink-0" />
          <span className="text-[11px] font-bold text-[#1D3A30]">
            هناك {lowStockCount} نوع قماش اقتربت كميته على النفاد (أقل من مترين).
          </span>
        </div>
      )}

      {/* Fabrics Grid / Feed */}
      {filteredInventory.length === 0 ? (
        <div className="bg-white rounded-3xl p-8 text-center border border-[#C7B895]/30 shadow-xs">
          <div className="w-12 h-12 bg-[#FAF7F0] text-[#1D3A30] rounded-full flex items-center justify-center mx-auto mb-2 border border-[#C7B895]/30">
            <ImageIcon className="w-6 h-6 opacity-60 text-[#A99872]" />
          </div>
          <h3 className="text-sm font-bold text-[#1D3A30]">لا توجد أقمشة مسجلة</h3>
          <p className="text-xs text-[#1D3A30]/60 mt-1">
            {searchQuery ? 'لا توجد نتائج تطابق بحثك' : 'ابدأ بإضافة أول نوع قماش لإدارة كمياته وتحديد أسعاره'}
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="mt-4 bg-[#1D3A30] text-[#E8D5A8] text-xs font-bold px-4 py-2.5 rounded-xl border border-[#C7B895]/40"
          >
            + إضافة قماش جديد
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {filteredInventory.map(item => {
            const isLow = (Number(item.quantity) || 0) <= 2;
            const isEditing = editingFabricId === item.id;

            return (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className={`px-3.5 py-2.5 rounded-2xl border transition shadow-xs flex items-center justify-between gap-2.5 sm:gap-4 flex-nowrap whitespace-nowrap overflow-x-auto no-scrollbar ${
                  isLow ? 'bg-[#FAF7F0] border-amber-300' : 'bg-white border-[#C7B895]/30 hover:border-[#C7B895]'
                }`}
              >
                {/* 1. Thumbnail + Fabric Name (Left/Right side in RTL) */}
                <div className="flex items-center gap-2.5 min-w-0 flex-shrink-0">
                  <div className="w-11 h-11 rounded-xl bg-[#FAF7F0] flex-shrink-0 overflow-hidden border border-[#C7B895]/30 flex items-center justify-center">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon className="w-5 h-5 text-[#A99872]" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-xs sm:text-sm text-[#1D3A30] truncate max-w-[120px] sm:max-w-[200px]">
                      {item.name}
                    </h3>
                    <p className="text-[10px] font-bold text-[#A99872] font-mono">
                      {item.price} د.ب <span className="text-[9px] font-normal text-[#1D3A30]/60">/متر</span>
                    </p>
                  </div>
                </div>

                {/* 2. Direct Click-to-Edit Quantity In-Place (Single Horizontal Line) */}
                <div className="flex items-center gap-1.5 flex-shrink-0 bg-[#FAF7F0] px-2.5 py-1.5 rounded-xl border border-[#C7B895]/30">
                  <span className="text-[10px] text-[#1D3A30]/70 font-semibold hidden xs:inline">
                    المتوفر:
                  </span>
                  {isEditing ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        autoFocus
                        value={editingQtyValue}
                        onChange={(e) => setEditingQtyValue(e.target.value)}
                        onBlur={() => handleFinishEditingQty(item.id)}
                        onKeyDown={(e) => handleKeyDownEditingQty(e, item.id)}
                        className="w-16 bg-white border border-[#1D3A30] rounded-lg px-1.5 py-0.5 text-xs font-bold font-mono text-center text-[#1D3A30] focus:outline-none"
                      />
                      <span className="text-xs font-bold text-[#1D3A30]">متر</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleStartEditingQty(item)}
                      className={`flex items-center gap-1 px-2 py-0.5 rounded-lg border border-dashed border-[#C7B895]/60 hover:bg-[#E8D5A8]/30 hover:border-[#1D3A30] transition cursor-pointer ${
                        isLow ? 'text-amber-800 bg-amber-50/50' : 'text-[#1D3A30] bg-white'
                      }`}
                      title="اضغط لتعديل عدد الأمتار كتابةً مباشرة"
                    >
                      <span className="text-xs sm:text-sm font-black font-mono">
                        {item.quantity}
                      </span>
                      <span className="text-[10px] font-bold text-[#1D3A30]/70">متر</span>
                    </button>
                  )}
                </div>

                {/* 3. Delete Action Button */}
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setFabricToDelete(item);
                  }}
                  className="p-1.5 text-[#1D3A30]/40 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition flex-shrink-0 cursor-pointer"
                  title="حذف القماش"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
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
              className="relative w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl z-10 max-h-[90dvh] flex flex-col overflow-hidden border border-[#C7B895]/30"
            >
              <div className="p-4 border-b border-[#C7B895]/30 flex justify-between items-center bg-[#1D3A30] text-[#FAF7F0]">
                <div>
                  <h3 className="text-sm font-bold text-[#FAF7F0]">إضافة نوع قماش جديد</h3>
                  <p className="text-[10px] text-[#E8D5A8]">تحديد السعر والكمية والصورة</p>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-1.5 rounded-lg bg-white/10 text-[#E8D5A8] hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleAddFabric} className="flex-1 overflow-y-auto p-4 space-y-3 text-xs no-scrollbar">
                <div>
                  <label className="block text-[11px] font-bold text-[#1D3A30] mb-1">
                    اسم القماش *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: حرير ياباني، كتان فرنسي، كريب صالونا..."
                    value={newFabric.name}
                    onChange={(e) => setNewFabric({ ...newFabric, name: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-[#C7B895]/40 focus:ring-1 focus:ring-[#1D3A30] outline-none text-xs text-[#1D3A30]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-[#1D3A30] mb-1">
                      الكمية بالمتر (يقبل كسور النصف مثل 22.5) *
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      required
                      min="0"
                      placeholder="مثال: 22.5"
                      value={newFabric.quantity}
                      onChange={(e) => setNewFabric({ ...newFabric, quantity: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-[#C7B895]/40 focus:ring-1 focus:ring-[#1D3A30] outline-none text-xs font-bold font-mono text-[#1D3A30]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#1D3A30] mb-1">
                      السعر للمتر (د.ب) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="0.00"
                      value={newFabric.price}
                      onChange={(e) => setNewFabric({ ...newFabric, price: Number(e.target.value) })}
                      className="w-full p-2.5 rounded-xl border border-[#C7B895]/40 focus:ring-1 focus:ring-[#1D3A30] outline-none text-xs font-bold font-mono text-[#1D3A30]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#1D3A30] mb-1">
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
                    <div className="relative w-full h-32 rounded-xl overflow-hidden border border-[#C7B895]/40">
                      <img src={newFabric.imageUrl} alt="معاينة" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setNewFabric({ ...newFabric, imageUrl: '' })}
                        className="absolute top-2 left-2 bg-rose-600 text-white p-1 rounded-lg"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full py-4 border-2 border-dashed border-[#C7B895]/40 rounded-xl flex flex-col items-center justify-center gap-1 hover:bg-[#FAF7F0] transition text-[#1D3A30]"
                    >
                      <Upload className="w-5 h-5 opacity-60 text-[#A99872]" />
                      <span className="text-[11px] font-medium">التقاط أو اختيار صورة من الهاتف</span>
                    </button>
                  )}
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full py-3 bg-[#1D3A30] text-[#E8D5A8] font-bold rounded-xl text-xs hover:bg-[#25493D] transition active:scale-98 shadow-sm border border-[#C7B895]/30"
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
              className="relative w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl z-10 text-center space-y-4 border border-[#C7B895]/30"
            >
              <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-200">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-black text-[#1D3A30]">تأكيد حذف القماش</h3>
                <p className="text-xs text-[#1D3A30]/70 mt-1">
                  هل أنت متأكد من حذف قماش <strong className="text-[#1D3A30] font-bold">"{fabricToDelete.name}"</strong> نهائياً من المخزون؟
                </p>
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setFabricToDelete(null)}
                  className="flex-1 py-2.5 rounded-xl border border-stone-200 text-stone-700 font-bold text-xs hover:bg-stone-50 transition"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={confirmDeleteFabric}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition shadow-sm"
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
