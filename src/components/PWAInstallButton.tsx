import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, Smartphone, Share2, PlusSquare, X, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const PWAInstallButton: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already running as an installed standalone PWA, hide
  if (isInstalled) {
    return null;
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    return (
      <button
        onClick={install}
        className={`flex items-center gap-2 bg-gradient-to-r from-emerald-800 to-emerald-900 hover:from-emerald-700 hover:to-emerald-800 text-amber-300 px-3.5 py-2 rounded-xl text-xs font-bold shadow-sm transition border border-emerald-700/50 active:scale-95 ${className}`}
        title="تثبيت التطبيق على جهازك مباشرة"
      >
        <Download className="w-3.5 h-3.5 animate-bounce text-amber-300" />
        <span>تثبيت كتطبيق</span>
      </button>
    );
  }

  // iOS Safari flow (or fallback guidance)
  return (
    <>
      <button
        onClick={() => setShowIOSGuide(true)}
        className={`flex items-center gap-1.5 bg-emerald-900/60 hover:bg-emerald-800 text-emerald-200 hover:text-white px-3 py-1.5 rounded-xl text-xs font-semibold transition border border-emerald-800/40 active:scale-95 ${className}`}
        title="تثبيت التطبيق على الشاشة الرئيسية"
      >
        <Smartphone className="w-3.5 h-3.5 text-amber-300" />
        <span>تثبيت التطبيق</span>
      </button>

      <AnimatePresence>
        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs" dir="rtl">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm rounded-3xl bg-white p-5 sm:p-6 shadow-2xl border border-emerald-900/20 text-right"
            >
              <div className="flex items-center justify-between pb-3 border-b border-emerald-900/10 mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-900 text-amber-300 flex items-center justify-center">
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <h3 className="font-extrabold text-sm text-emerald-950">تثبيت تطبيق نَسْجَة على هاتفك</h3>
                </div>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1 rounded-lg text-emerald-800/60 hover:text-emerald-950 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-emerald-900/80 mb-4 leading-relaxed">
                يمكنك تشغيل «دار نَسْجَة» كتطبيق هاتف أصيل بدون متصفح ليعمل بسرعة فائقة وكامل الشاشة:
              </p>

              <div className="space-y-3 bg-emerald-50/70 p-3.5 rounded-2xl border border-emerald-900/10 text-xs text-emerald-950">
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-900 text-white font-mono text-[11px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                    1
                  </span>
                  <div>
                    <span className="font-bold block">اضغط على زر المشاركة (Share)</span>
                    <span className="text-[11px] text-emerald-800/70">
                      في شريط متصفح سفاري بالأسفل <Share2 className="w-3.5 h-3.5 inline mx-1 text-emerald-700" /> أو قائمة خيارات كروم.
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-900 text-white font-mono text-[11px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                    2
                  </span>
                  <div>
                    <span className="font-bold block">اختر "إضافة إلى الشاشة الرئيسية"</span>
                    <span className="text-[11px] text-emerald-800/70 flex items-center gap-1 mt-0.5">
                      <PlusSquare className="w-3.5 h-3.5 text-emerald-700" /> (Add to Home Screen)
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-900 text-white font-mono text-[11px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                    3
                  </span>
                  <div>
                    <span className="font-bold block">اضغط "إضافة" (Add)</span>
                    <span className="text-[11px] text-emerald-800/70">
                      سيظهر أيقونة وشعار نَسْجَة على شاشة هاتفك مثل التطبيقات الرسمية تماماً.
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full rounded-xl bg-emerald-900 py-2.5 text-xs font-bold text-white hover:bg-emerald-800 transition"
              >
                فهمت ذلك
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
