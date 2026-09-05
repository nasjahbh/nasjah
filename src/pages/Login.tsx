import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Lock, Mail, ArrowRight, Sparkles } from 'lucide-react';
import NasjahLogo from '../components/NasjahLogo';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (!supabase) throw new Error('Supabase is not configured');
      
      let result;
      if (isSignUp) {
        result = await supabase.auth.signUp({ email, password });
        if (result.error) throw result.error;
      } else {
        result = await supabase.auth.signInWithPassword({ email, password });
        if (result.error) throw result.error;
        navigate('/');
      }
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء المصادقة.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 h-[100dvh] w-full overflow-hidden bg-slate-950 sm:bg-emerald-950/95 flex items-center justify-center p-3" dir="rtl">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white p-6 sm:p-8 rounded-[36px] shadow-2xl max-w-sm w-full text-center space-y-6 border border-emerald-900/15"
      >
        <div>
          <NasjahLogo variant="emblem" size="lg" className="mx-auto mb-3" />
          <h1 className="text-xl font-black text-emerald-950 tracking-wider uppercase">نَسْجَة • NASJAH</h1>
          <p className="text-xs text-emerald-800/70 mt-0.5">لوحة إدارة الأتيليه والمبيعات</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 p-3 rounded-xl text-xs border border-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-3">
          <div>
            <input
              type="email"
              required
              placeholder="البريد الإلكتروني"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-emerald-50/50 border border-emerald-900/15 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-1 focus:ring-emerald-700 text-right text-xs"
            />
          </div>
          <div>
            <input
              type="password"
              required
              placeholder="كلمة المرور"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-emerald-50/50 border border-emerald-900/15 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-1 focus:ring-emerald-700 text-right text-xs"
            />
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-900 hover:bg-emerald-800 text-white py-3 rounded-xl font-bold text-xs transition flex items-center justify-center gap-2 disabled:opacity-50 active:scale-98 shadow-sm"
          >
            {loading ? 'جاري التحميل...' : (isSignUp ? 'إنشاء حساب جديد' : 'تسجيل الدخول')}
          </button>
        </form>

        <button 
          onClick={() => setIsSignUp(!isSignUp)}
          className="text-xs text-emerald-800/70 hover:text-emerald-950 transition font-medium"
        >
          {isSignUp ? 'لديك حساب بالفعل؟ تسجيل الدخول' : 'ليس لديك حساب؟ إنشاء حساب'}
        </button>
      </motion.div>
    </div>
  );
}
