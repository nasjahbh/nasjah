import { motion } from 'motion/react';
import { AlertTriangle, Database, ExternalLink, Key } from 'lucide-react';

export default function Setup() {
  return (
    <div className="fixed inset-0 h-[100dvh] w-full overflow-y-auto no-scrollbar bg-slate-950 sm:bg-emerald-950/95 flex items-center justify-center p-3 font-sans" dir="rtl">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white p-5 sm:p-6 rounded-[32px] shadow-2xl max-w-sm w-full space-y-4 border border-emerald-900/15 text-xs text-emerald-950"
      >
        <div className="flex items-center gap-2.5 text-amber-600">
          <div className="p-2 bg-amber-100 rounded-xl">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-black text-emerald-950">إعدادات قاعدة البيانات السحابية</h1>
            <p className="text-[10px] text-emerald-800/60 font-medium">مزامنة Supabase الاختيارية</p>
          </div>
        </div>
        
        <div className="bg-emerald-50/70 text-emerald-900 p-3 rounded-2xl border border-emerald-900/10 space-y-2 text-[11px] leading-relaxed">
          <p>
            يعمل التطبيق بنظام التخزين السحابي الكامل 100% دون أي اعتماد على التخزين المحلي، حيث تُحفظ وتُزامن الطلبات والمصاريف والمخزون سحابياً ومباشرة عبر خوادم Supabase:
          </p>
          <ol className="list-decimal list-inside space-y-1.5 text-emerald-800/80">
            <li>أنشئ مشروعاً مجانياً على <a href="https://supabase.com" target="_blank" rel="noreferrer" className="text-emerald-700 underline font-bold">Supabase.com</a></li>
            <li>انسخ رابط المشروع ومفتاح الـ Anon Key من Project Settings &gt; API</li>
            <li>أضف المتغيرات في الإعدادات:
              <span className="block mt-1 font-mono text-[9px] bg-white p-1 rounded border border-emerald-200">
                VITE_SUPABASE_URL<br />
                VITE_SUPABASE_ANON_KEY
              </span>
            </li>
          </ol>
        </div>

        <button
          onClick={() => window.location.href = '/'}
          className="w-full py-2.5 bg-emerald-900 text-white font-bold rounded-xl text-xs hover:bg-emerald-800 transition"
        >
          متابعة استخدام التطبيق
        </button>
      </motion.div>
    </div>
  );
}
