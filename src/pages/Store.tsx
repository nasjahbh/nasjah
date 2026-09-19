import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  X, 
  Scissors,
  Instagram, 
  MoreVertical,
  ChevronDown,
  ChevronUp,
  Snowflake,
  Sun,
  Leaf,
  Layers,
  Sparkles
} from 'lucide-react';
import NasjahLogo from '../components/NasjahLogo';
import WhatsAppIcon from '../components/WhatsAppIcon';
import { CRITICAL_FABRIC_THRESHOLD, StoreSettings, DEFAULT_STORE_SETTINGS } from '../types';

export interface PublicFabric {
  id: string;
  name: string;
  price: number;
  quantity: number;
  isAvailable: boolean;
  isLowStock: boolean;
  isOutOfStock: boolean;
  category: string;
  imageUrl: string;
  season?: string;
}

export type SeasonKey = 'winter' | 'summer' | 'spring';
export type SeasonFilter = 'all' | SeasonKey;

// Tailoring options for Men's Thobes
const TAILORING_OPTIONS = [
  { id: 'thobe_classic', label: 'تفصيل ثوب رجالي قياسي', meters: 3.50, note: 'المقاس المعتاد للثوب الرجالي' },
  { id: 'thobe_wide', label: 'تفصيل ثوب رجالي وسيع', meters: 4.00, note: 'قصة فضفاضة أو مقاسات خاصة' },
  { id: 'thobe_youth', label: 'تفصيل ثوب أولاد / شباب', meters: 2.50, note: 'مقاسات الفتيان والأولاد' },
  { id: 'fabric_roll', label: 'طاقة قماش كاملة (توب)', meters: 25.0, note: 'طاقة قماش كاملة تكفي عدة ثياب' },
  { id: 'custom', label: 'تحديد عدد أمتار خاص', meters: 1.0, note: 'طلب أمتار محددة بدقة' },
];

const SEASON_META: Record<SeasonKey, { title: string; icon: any }> = {
  winter: { title: 'الأقمشة الشتوية', icon: Snowflake },
  summer: { title: 'الأقمشة الصيفية', icon: Sun },
  spring: { title: 'الأقمشة الربيعية', icon: Leaf },
};

export default function Store() {
  const [catalog, setCatalog] = useState<PublicFabric[]>([]);
  const [storeSettings, setStoreSettings] = useState<StoreSettings>(DEFAULT_STORE_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSeason, setSelectedSeason] = useState<SeasonFilter>('all');
  const [selectedFabric, setSelectedFabric] = useState<PublicFabric | null>(null);
  
  // 3-dots Menu State
  const [menuOpen, setMenuOpen] = useState(false);
  
  // Accordion / Collapsible state for sub-categories under "جميع الأقمشة"
  // Default is expanded (ظاهرين في الحالة الطبيعية)
  const [isAllFabricsExpanded, setIsAllFabricsExpanded] = useState(true);

  // Modal tailoring calculation
  const [tailorChoice, setTailorChoice] = useState<string>('thobe_classic');
  const [customMeters, setCustomMeters] = useState<number>(3.5);

  // Contact WhatsApp Number (Default 38244795)
  const rawNumber = storeSettings.whatsappNumber || '38244795';
  const cleanDigits = rawNumber.replace(/[^0-9]/g, '');
  const whatsAppPhone = cleanDigits.startsWith('973') 
    ? cleanDigits 
    : (cleanDigits.length === 8 ? `973${cleanDigits}` : cleanDigits || '97338244795');

  // Load catalog & store settings
  useEffect(() => {
    async function fetchCatalogAndSettings() {
      try {
        const res = await fetch('/api/public-catalog');
        if (res.ok) {
          const data = await res.json();
          if (data.catalog && Array.isArray(data.catalog)) {
            setCatalog(data.catalog);
          }
          if (data.settings) {
            setStoreSettings({
              ...DEFAULT_STORE_SETTINGS,
              ...data.settings,
              seasonsOrder: data.settings.seasonsOrder && data.settings.seasonsOrder.length > 0
                ? data.settings.seasonsOrder
                : ['winter', 'summer', 'spring']
            });
            if (data.settings.defaultSeason && ['all', 'winter', 'summer', 'spring'].includes(data.settings.defaultSeason)) {
              setSelectedSeason(data.settings.defaultSeason as SeasonFilter);
            }
          }
        } else {
          // Fallback to local store data
          const fallbackRes = await fetch('/api/store-data');
          if (fallbackRes.ok) {
            const data = await fallbackRes.json();
            if (data.inventory && Array.isArray(data.inventory)) {
              const mapped: PublicFabric[] = data.inventory.map((item: any) => ({
                id: String(item.id),
                name: item.name || '',
                price: Number(item.price || 0),
                quantity: Number(item.quantity || 0),
                isAvailable: Number(item.quantity || 0) >= CRITICAL_FABRIC_THRESHOLD,
                isLowStock: Number(item.quantity || 0) < CRITICAL_FABRIC_THRESHOLD && Number(item.quantity || 0) > 0,
                isOutOfStock: Number(item.quantity || 0) <= 0,
                category: item.category || 'أقمشة رجالية فاخرة',
                imageUrl: item.imageUrl || item.image_url || item.image || '',
                season: item.season || ''
              }));
              setCatalog(mapped);
            }
          }
        }
      } catch (err) {
        console.error('Failed to load store data', err);
      } finally {
        setLoading(false);
      }
    }

    fetchCatalogAndSettings();
  }, []);

  // Determine which season a fabric belongs to
  const getFabricSeason = (fabric: PublicFabric): SeasonKey => {
    const rawSeason = (fabric.season || '').trim().toLowerCase();
    if (rawSeason.includes('شتو') || rawSeason === 'winter') return 'winter';
    if (rawSeason.includes('صيف') || rawSeason === 'summer') return 'summer';
    if (rawSeason.includes('ربيع') || rawSeason === 'spring') return 'spring';

    const text = `${fabric.name || ''} ${fabric.category || ''}`.toLowerCase();
    if (/شتو|صوف|شكسبير|كشمير|جوخ|ثقيل|دافئ/i.test(text)) return 'winter';
    if (/صيف|بارد|قطن|تويوبو|سلك|ياباني|كتان|خفيف/i.test(text)) return 'summer';
    if (/ربيع|مخلوط|كريب|معتدل|وسط|ناعم/i.test(text)) return 'spring';

    // Default fallback to first season in the store's configured order
    return (storeSettings.seasonsOrder && storeSettings.seasonsOrder[0]) || 'winter';
  };

  // Group fabrics by season
  const groupedFabrics = useMemo(() => {
    const groups: Record<SeasonKey, PublicFabric[]> = {
      winter: [],
      summer: [],
      spring: [],
    };

    catalog.forEach(fabric => {
      // Hide out of stock if enabled in store settings
      if (storeSettings.hideOutOfStock && fabric.isOutOfStock) {
        return;
      }

      // Filter by search query if present
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matches = fabric.name.toLowerCase().includes(query) ||
          fabric.category.toLowerCase().includes(query);
        if (!matches) return;
      }

      const season = getFabricSeason(fabric);
      if (groups[season]) {
        groups[season].push(fabric);
      } else {
        groups.winter.push(fabric);
      }
    });

    return groups;
  }, [catalog, searchQuery, storeSettings.hideOutOfStock]);

  // Active meters calculation in modal
  const activeMeters = useMemo(() => {
    if (tailorChoice === 'custom') return customMeters > 0 ? customMeters : 3.5;
    const opt = TAILORING_OPTIONS.find(o => o.id === tailorChoice);
    return opt ? opt.meters : (storeSettings.defaultThobeMeters || 3.5);
  }, [tailorChoice, customMeters, storeSettings.defaultThobeMeters]);

  // Estimated fabric price in modal
  const estimatedTotal = useMemo(() => {
    if (!selectedFabric) return '0.000';
    return (selectedFabric.price * activeMeters).toFixed(3);
  }, [selectedFabric, activeMeters]);

  // Direct WhatsApp Link
  const getWhatsAppLink = (fabric?: PublicFabric, meters?: number, note?: string) => {
    const defaultMeters = meters || activeMeters;
    const defaultNote = note || (tailorChoice === 'custom' ? `مخصص (${defaultMeters} متر)` : TAILORING_OPTIONS.find(o => o.id === tailorChoice)?.label || 'ثوب رجالي قياسي');
    
    let msg = `السلام عليكم ورحمة الله، متجر نَسْجَة للأقمشة الرجالية\n`;
    if (fabric) {
      msg += `أود الاستفسار والطلب للقماش التالي:\n`;
      msg += `• اسم القماش: ${fabric.name}\n`;
      msg += `• سعر المتر: ${fabric.price.toFixed(3)} د.ب\n`;
      msg += `• الطول المطلوب: ${defaultMeters} متر (${defaultNote})\n`;
      msg += `• الإجمالي التقديري: ${(fabric.price * defaultMeters).toFixed(3)} د.ب\n`;
    } else {
      msg += `أود الاستفسار عن تفصيل الأقمشة الرجالية المتاحة لديكم.\n`;
    }

    return `https://wa.me/${whatsAppPhone}?text=${encodeURIComponent(msg)}`;
  };

  // Determine the sequence of seasons to render
  const effectiveSeasonsOrder: SeasonKey[] = useMemo(() => {
    const configured = storeSettings.seasonsOrder && storeSettings.seasonsOrder.length > 0
      ? storeSettings.seasonsOrder
      : (['winter', 'summer', 'spring'] as SeasonKey[]);

    if (selectedSeason !== 'all') {
      return [selectedSeason];
    }
    return configured;
  }, [storeSettings.seasonsOrder, selectedSeason]);

  const totalVisibleFabrics = useMemo(() => {
    return effectiveSeasonsOrder.reduce((acc, seasonKey) => {
      return acc + (groupedFabrics[seasonKey]?.length || 0);
    }, 0);
  }, [effectiveSeasonsOrder, groupedFabrics]);

  return (
    <div className="min-h-screen bg-[#FAF7F0] text-[#1D3A30] font-sans antialiased selection:bg-[#C7B895]/30 selection:text-[#1D3A30] text-right" dir="rtl">
      
      {/* 1. COMPACT ANNOUNCEMENT BAR */}
      {storeSettings.headerVisible && storeSettings.announcementText && (
        <div className="bg-[#1D3A30] text-[#E8D5A8] text-[11px] py-2 px-4 border-b border-[#C7B895]/20 text-center font-medium">
          <span>{storeSettings.announcementText}</span>
        </div>
      )}

      {/* 2. HEADER WITH 3-DOTS CORNER MENU */}
      <header className="sticky top-0 z-40 bg-[#FAF7F0]/95 backdrop-blur-md border-b border-[#C7B895]/30 px-4 sm:px-6 py-3.5 transition-all">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          
          {/* Brand Identity */}
          <div className="flex items-center gap-3">
            <NasjahLogo variant="emblem" size="md" className="shadow-2xs" />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black tracking-tight text-[#1D3A30]">
                  {storeSettings.storeName || 'نَسْجَة'}
                </h1>
                <span className="text-[10px] font-bold text-[#A99872] bg-[#FAF7F0] px-1.5 py-0.5 rounded-md border border-[#C7B895]/40 hidden xs:inline-block">
                  أقمشة رجالية
                </span>
              </div>
              <p className="text-[11px] text-[#1D3A30]/65 hidden sm:block">
                {storeSettings.storeTagline || 'للأقمشة الرجالية وتفصيل الثياب'}
              </p>
            </div>
          </div>

          {/* WhatsApp Contact & 3-Dots Corner Menu */}
          <div className="flex items-center gap-2.5">
            
            {/* Direct WhatsApp Call to Action (38244795) */}
            <a
              href={getWhatsAppLink()}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl bg-[#1D3A30] hover:bg-[#25493D] text-[#E8D5A8] text-xs font-bold transition shadow-xs active:scale-95 cursor-pointer"
              title={`تحدث مع المتجر عبر واتساب: ${rawNumber}`}
            >
              <WhatsAppIcon className="w-4 h-4 text-[#C7B895]" />
              <span className="hidden sm:inline">واتساب:</span>
              <span className="font-mono font-bold text-[#FAF7F0]">{rawNumber}</span>
            </a>

            {/* THREE-DOTS CORNER MENU BUTTON */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen(!menuOpen)}
                aria-label="قائمة الأقمشة"
                className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center transition border active:scale-95 cursor-pointer ${
                  menuOpen 
                    ? 'bg-[#1D3A30] text-[#E8D5A8] border-[#1D3A30]' 
                    : 'bg-white hover:bg-[#FAF7F0] text-[#1D3A30] border-[#C7B895]/50'
                }`}
              >
                <MoreVertical className="w-5 h-5" />
              </button>

              {/* THREE-DOTS POPUP DROPDOWN MENU */}
              <AnimatePresence>
                {menuOpen && (
                  <>
                    {/* Backdrop to close menu */}
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setMenuOpen(false)} 
                    />

                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: -4 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -4 }}
                      transition={{ duration: 0.15 }}
                      className="absolute left-0 mt-2 w-72 rounded-2xl bg-white border border-[#C7B895]/40 shadow-xl p-2.5 z-50 text-right"
                    >
                      {/* Menu Header */}
                      <div className="px-3 py-2 border-b border-[#C7B895]/20 flex items-center justify-between">
                        <span className="text-xs font-black text-[#1D3A30]">أقسام الأقمشة</span>
                        <span className="text-[10px] text-[#A99872] font-bold">نَسْجَة</span>
                      </div>

                      {/* COLLAPSIBLE STRUCTURE: "جميع الأقمشة" at top with collapse/expand arrow on the left */}
                      <div className="py-1">
                        
                        {/* 1. Main Row: "جميع الأقمشة" with collapse arrow on left */}
                        <div
                          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition text-right cursor-pointer ${
                            selectedSeason === 'all'
                              ? 'bg-[#1D3A30] text-[#E8D5A8]'
                              : 'text-[#1D3A30] hover:bg-[#FAF7F0]'
                          }`}
                        >
                          <div 
                            className="flex items-center gap-2 flex-1 cursor-pointer"
                            onClick={() => {
                              setSelectedSeason('all');
                              setMenuOpen(false);
                            }}
                          >
                            <Sparkles className="w-4 h-4 text-[#C7B895]" />
                            <span className="font-black text-xs">جميع الأقمشة</span>
                          </div>

                          {/* Collapse / Expand Arrow on the Left */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setIsAllFabricsExpanded(!isAllFabricsExpanded);
                            }}
                            className={`p-1 rounded-lg transition hover:bg-black/10 cursor-pointer ${
                              selectedSeason === 'all' ? 'text-[#E8D5A8]' : 'text-[#1D3A30]/60'
                            }`}
                            title={isAllFabricsExpanded ? 'إخفاء الفروع' : 'إظهار الفروع'}
                          >
                            {isAllFabricsExpanded ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </button>
                        </div>

                        {/* 2. Sub-branches branching under "جميع الأقمشة" (Winter, Summer, Spring) */}
                        <AnimatePresence>
                          {isAllFabricsExpanded && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.15 }}
                              className="overflow-hidden mr-3 pr-2.5 border-r-2 border-[#C7B895]/30 space-y-1 my-1"
                            >
                              {/* Winter Fabrics */}
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedSeason('winter');
                                  setMenuOpen(false);
                                }}
                                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-bold transition text-right cursor-pointer ${
                                  selectedSeason === 'winter'
                                    ? 'bg-[#FAF7F0] text-[#1D3A30] font-black border border-[#C7B895]/50'
                                    : 'text-[#1D3A30]/80 hover:bg-[#FAF7F0] hover:text-[#1D3A30]'
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <Snowflake className="w-3.5 h-3.5 text-sky-600" />
                                  <span>أقمشة شتوية</span>
                                </div>
                              </button>

                              {/* Summer Fabrics */}
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedSeason('summer');
                                  setMenuOpen(false);
                                }}
                                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-bold transition text-right cursor-pointer ${
                                  selectedSeason === 'summer'
                                    ? 'bg-[#FAF7F0] text-[#1D3A30] font-black border border-[#C7B895]/50'
                                    : 'text-[#1D3A30]/80 hover:bg-[#FAF7F0] hover:text-[#1D3A30]'
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <Sun className="w-3.5 h-3.5 text-amber-500" />
                                  <span>أقمشة صيفية</span>
                                </div>
                              </button>

                              {/* Spring Fabrics */}
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedSeason('spring');
                                  setMenuOpen(false);
                                }}
                                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-bold transition text-right cursor-pointer ${
                                  selectedSeason === 'spring'
                                    ? 'bg-[#FAF7F0] text-[#1D3A30] font-black border border-[#C7B895]/50'
                                    : 'text-[#1D3A30]/80 hover:bg-[#FAF7F0] hover:text-[#1D3A30]'
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <Leaf className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>أقمشة ربيعية</span>
                                </div>
                              </button>

                            </motion.div>
                          )}
                        </AnimatePresence>

                      </div>

                      {/* Direct WhatsApp & Instagram (ZERO admin or login links) */}
                      <div className="pt-2 mt-1 border-t border-[#C7B895]/20 space-y-1">
                        <a
                          href={`https://wa.me/${whatsAppPhone}`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-emerald-800 hover:bg-emerald-50 transition"
                        >
                          <WhatsAppIcon className="w-4 h-4 text-emerald-600" />
                          <span>محادثة واتساب ({rawNumber})</span>
                        </a>

                        <a
                          href={`https://instagram.com/${storeSettings.instagramHandle || 'nasjah.bh'}`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-[#1D3A30] hover:bg-[#FAF7F0] transition"
                        >
                          <Instagram className="w-4 h-4 text-[#C7B895]" />
                          <span>إنستغرام (@{storeSettings.instagramHandle || 'nasjah.bh'})</span>
                        </a>
                      </div>

                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

          </div>

        </div>
      </header>

      {/* 3. SEARCH BAR (Without cluttered tabs or wordy phrases) */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-5 pb-2">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          
          {/* Clean search bar */}
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث عن اسم القماش..."
              className="w-full pl-8 pr-10 py-2.5 rounded-2xl bg-white border border-[#C7B895]/40 text-xs font-medium focus:ring-2 focus:ring-[#1D3A30] outline-none shadow-2xs text-[#1D3A30] placeholder:text-[#1D3A30]/40"
            />
            <Search className="w-4 h-4 text-[#C7B895] absolute right-3.5 top-3" />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute left-3 top-3 text-[#1D3A30]/40 hover:text-[#1D3A30] cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Active section filter badge (if filtered via 3-dots menu) */}
          {selectedSeason !== 'all' && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#1D3A30]">القسم المحدد:</span>
              <span className="inline-flex items-center gap-1.5 text-xs font-black bg-[#1D3A30] text-[#E8D5A8] px-3 py-1.5 rounded-xl">
                <span>{SEASON_META[selectedSeason].title}</span>
                <button
                  type="button"
                  onClick={() => setSelectedSeason('all')}
                  className="hover:text-white cursor-pointer mr-1"
                  title="عرض جميع الأقسام"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
              <button
                type="button"
                onClick={() => setSelectedSeason('all')}
                className="text-xs text-[#A99872] hover:text-[#1D3A30] font-bold underline cursor-pointer"
              >
                عرض كافة الأقسام
              </button>
            </div>
          )}

        </div>
      </div>

      {/* 4. MAIN CONTENT: SEQUENTIAL SECTIONS (In order specified by admin) */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-4 pb-20 space-y-10">
        {loading ? (
          <div className="py-20 text-center space-y-3">
            <div className="w-8 h-8 border-2 border-[#1D3A30] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-bold text-[#1D3A30]/60">جارِ تحميل الأقمشة...</p>
          </div>
        ) : (
          /* SECTIONS DISPLAYED IN THE SEQUENCE CONFIGURED BY ADMIN */
          effectiveSeasonsOrder.map((seasonKey) => {
            const fabrics = groupedFabrics[seasonKey] || [];
            if (fabrics.length === 0) {
              return null; // Do not show empty section or placeholders
            }

            const meta = SEASON_META[seasonKey];
            const Icon = meta.icon;

            return (
              <section key={seasonKey} className="space-y-4">
                
                {/* Section Header */}
                <div className="flex items-center justify-between border-b border-[#C7B895]/30 pb-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-[#FAF7F0] border border-[#C7B895]/40 flex items-center justify-center text-[#1D3A30]">
                      <Icon className="w-4 h-4 text-[#A99872]" />
                    </div>
                    <h2 className="text-base sm:text-lg font-black text-[#1D3A30] tracking-tight">
                      {meta.title}
                    </h2>
                    <span className="text-xs font-mono font-bold text-[#A99872] bg-white px-2 py-0.5 rounded-lg border border-[#C7B895]/30">
                      ({fabrics.length})
                    </span>
                  </div>
                </div>

                {/* Section Fabric Cards Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {fabrics.map((fabric) => (
                      <div
                        key={fabric.id}
                        className="bg-white rounded-3xl overflow-hidden border border-[#C7B895]/30 shadow-xs hover:shadow-md transition duration-200 flex flex-col group"
                      >
                        {/* Fabric Photo */}
                        <div className="relative aspect-4/3 bg-[#FAF7F0] overflow-hidden">
                          {fabric.imageUrl ? (
                            <img
                              src={fabric.imageUrl}
                              alt={fabric.name}
                              className="w-full h-full object-cover group-hover:scale-103 transition duration-300"
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-[#1D3A30]/40 p-4">
                              <Layers className="w-8 h-8 text-[#C7B895] mb-2 opacity-60" />
                              <span className="text-[11px] font-bold text-[#1D3A30]/60">قماش رجالي</span>
                            </div>
                          )}

                          {/* Stock Status Badge */}
                          <div className="absolute top-3 right-3 flex flex-col gap-1 items-start">
                            {fabric.isOutOfStock ? (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-rose-900/90 text-white backdrop-blur-xs">
                                نافذ من المخزون
                              </span>
                            ) : fabric.isLowStock ? (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-600/90 text-white backdrop-blur-xs">
                                كمية محدودة ({fabric.quantity} م)
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#1D3A30]/85 text-[#E8D5A8] backdrop-blur-xs border border-[#C7B895]/30">
                                متوفر للتفصيل ({fabric.quantity} م)
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Content & Actions */}
                        <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-4">
                          <div>
                            <div className="flex items-baseline justify-between gap-2 mb-1">
                              <h3 className="text-sm font-black text-[#1D3A30] line-clamp-1">
                                {fabric.name}
                              </h3>
                              <div className="flex items-baseline gap-1 flex-shrink-0">
                                <span className="text-base font-black font-mono text-[#1D3A30]">
                                  {fabric.price.toFixed(3)}
                                </span>
                                <span className="text-[10px] font-bold text-[#A99872]">د.ب / م</span>
                              </div>
                            </div>

                            {fabric.category && (
                              <p className="text-[11px] text-[#1D3A30]/60 line-clamp-1">
                                {fabric.category}
                              </p>
                            )}
                          </div>

                          {/* Action Buttons */}
                          <div className="space-y-2 pt-1">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedFabric(fabric);
                                setTailorChoice('thobe_classic');
                                setCustomMeters(storeSettings.defaultThobeMeters || 3.5);
                              }}
                              className="w-full py-2.5 px-3 rounded-xl bg-[#FAF7F0] hover:bg-[#F2ECE0] text-[#1D3A30] text-xs font-bold border border-[#C7B895]/50 transition flex items-center justify-center gap-1.5 active:scale-98 cursor-pointer"
                            >
                              <Scissors className="w-3.5 h-3.5 text-[#A99872]" />
                              <span>تفاصيل وحاسبة أمتار الثوب</span>
                            </button>

                            <a
                              href={getWhatsAppLink(fabric, storeSettings.defaultThobeMeters || 3.5, 'ثوب رجالي قياسي')}
                              target="_blank"
                              rel="noreferrer"
                              className="w-full py-2.5 px-3 rounded-xl bg-[#1D3A30] hover:bg-[#25493D] text-[#E8D5A8] text-xs font-bold transition flex items-center justify-center gap-2 active:scale-98 shadow-2xs cursor-pointer"
                            >
                              <WhatsAppIcon className="w-3.5 h-3.5 text-[#C7B895]" />
                              <span>طلب عبر واتساب ({rawNumber})</span>
                            </a>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

              </section>
            );
          })
        )}
      </main>

      {/* 5. TAILORING CALCULATOR MODAL */}
      <AnimatePresence>
        {selectedFabric && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto border border-[#C7B895]/40 shadow-2xl p-6 text-right relative"
            >
              {/* Close Button */}
              <button
                onClick={() => setSelectedFabric(null)}
                className="absolute left-4 top-4 p-2 text-[#1D3A30]/50 hover:text-[#1D3A30] bg-[#FAF7F0] rounded-xl transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Modal Header */}
              <div className="flex items-center gap-3 pb-4 border-b border-[#C7B895]/20 pr-1">
                <div className="w-12 h-12 rounded-2xl bg-[#FAF7F0] border border-[#C7B895]/30 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {selectedFabric.imageUrl ? (
                    <img src={selectedFabric.imageUrl} alt={selectedFabric.name} className="w-full h-full object-cover" />
                  ) : (
                    <Scissors className="w-5 h-5 text-[#A99872]" />
                  )}
                </div>
                <div>
                  <h3 className="text-base font-black text-[#1D3A30]">{selectedFabric.name}</h3>
                  <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#A99872] mt-0.5">
                    <span>{selectedFabric.price.toFixed(3)} د.ب / متر</span>
                    {selectedFabric.category && <span>• {selectedFabric.category}</span>}
                  </div>
                </div>
              </div>

              {/* Tailoring Options Selector */}
              <div className="space-y-3 my-5">
                <label className="block text-xs font-black text-[#1D3A30]">
                  اختر نوع التفصيل أو طول القماش المطلوب:
                </label>

                <div className="space-y-2">
                  {TAILORING_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setTailorChoice(opt.id)}
                      className={`w-full p-3 rounded-2xl text-right border transition-all flex items-center justify-between cursor-pointer ${
                        tailorChoice === opt.id
                          ? 'bg-[#FAF7F0] border-[#1D3A30] ring-1 ring-[#1D3A30] shadow-xs'
                          : 'bg-white border-neutral-200 hover:border-[#C7B895]/50'
                      }`}
                    >
                      <div>
                        <p className="text-xs font-bold text-[#1D3A30]">{opt.label}</p>
                        <p className="text-[11px] text-[#1D3A30]/60 mt-0.5">{opt.note}</p>
                      </div>
                      <div className="text-left flex-shrink-0 pl-2">
                        {opt.id !== 'custom' ? (
                          <span className="text-xs font-mono font-bold text-[#1D3A30]">
                            {opt.meters} م
                          </span>
                        ) : (
                          <span className="text-xs font-bold text-[#A99872]">مخصص</span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>

                {/* Custom Meters Slider */}
                {tailorChoice === 'custom' && (
                  <div className="p-3.5 rounded-2xl bg-[#FAF7F0] border border-[#C7B895]/30 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-[#1D3A30]">عدد الأمتار المطلوبة:</span>
                      <span className="font-mono text-[#1D3A30] bg-white px-2 py-0.5 rounded-lg border border-[#C7B895]/40">
                        {customMeters} م
                      </span>
                    </div>
                    <input
                      type="range"
                      min={1.0}
                      max={30}
                      step={0.25}
                      value={customMeters}
                      onChange={(e) => setCustomMeters(parseFloat(e.target.value))}
                      className="w-full accent-[#1D3A30]"
                    />
                  </div>
                )}
              </div>

              {/* Price Calculation Summary */}
              <div className="p-4 rounded-2xl bg-[#1D3A30] text-[#FAF7F0] space-y-2 shadow-sm border border-[#C7B895]/30">
                <div className="flex items-center justify-between text-xs text-[#FAF7F0]/80">
                  <span>سعر المتر × {activeMeters} متر:</span>
                  <span className="font-mono">{selectedFabric.price.toFixed(3)} × {activeMeters}</span>
                </div>
                <div className="flex items-baseline justify-between pt-1 border-t border-[#C7B895]/20">
                  <span className="text-xs font-extrabold text-[#E8D5A8]">الإجمالي التقديري للقماش:</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-xl font-black text-white font-mono">{estimatedTotal}</span>
                    <span className="text-xs font-bold text-[#E8D5A8]">د.ب</span>
                  </div>
                </div>
              </div>

              {/* Final WhatsApp Order Button */}
              <div className="mt-5 space-y-2">
                <a
                  href={getWhatsAppLink(selectedFabric)}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-3.5 px-4 rounded-2xl bg-[#25D366] hover:bg-[#20bd5a] text-white text-xs font-black transition flex items-center justify-center gap-2 shadow-md active:scale-98 cursor-pointer"
                >
                  <WhatsAppIcon className="w-4 h-4 text-white" />
                  <span>إرسال تفاصيل القماش عبر واتساب ({rawNumber})</span>
                </a>

                <button
                  type="button"
                  onClick={() => setSelectedFabric(null)}
                  className="w-full py-2 text-center text-xs text-[#1D3A30]/60 hover:text-[#1D3A30] cursor-pointer"
                >
                  إغلاق ومتابعة التصفح
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 6. CLEAN FOOTER (ZERO admin or login links) */}
      <footer className="bg-[#1D3A30] text-[#FAF7F0] py-8 px-4 sm:px-6 border-t border-[#C7B895]/20">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-2.5">
            <NasjahLogo variant="emblem" size="sm" />
            <div>
              <p className="font-bold text-[#FAF7F0]">{storeSettings.storeName || 'نَسْجَة للأقمشة الرجالية'}</p>
              <p className="text-[10px] text-[#C7B895]">مملكة البحرين • واتساب: {rawNumber}</p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-[11px] text-[#FAF7F0]/70">
            <a
              href={`https://wa.me/${whatsAppPhone}`}
              target="_blank"
              rel="noreferrer"
              className="hover:text-[#E8D5A8] transition flex items-center gap-1"
            >
              <WhatsAppIcon className="w-3.5 h-3.5" />
              <span>محادثة واتساب ({rawNumber})</span>
            </a>
            <span>•</span>
            <a
              href={`https://instagram.com/${storeSettings.instagramHandle || 'nasjah.bh'}`}
              target="_blank"
              rel="noreferrer"
              className="hover:text-[#E8D5A8] transition"
            >
              إنستغرام (@{storeSettings.instagramHandle || 'nasjah.bh'})
            </a>
          </div>
        </div>
      </footer>

    </div>
  );
}
