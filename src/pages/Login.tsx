import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Lock, 
  Mail, 
  Eye, 
  EyeOff, 
  AlertCircle, 
  Clock 
} from 'lucide-react';
import NasjahLogo from '../components/NasjahLogo';
import { 
  getSecurityState, 
  recordFailedAttempt, 
  resetFailedAttempts, 
  isEmailAuthorized,
  MAX_ALLOWED_ATTEMPTS,
  SecurityState 
} from '../lib/security';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Security State
  const [security, setSecurity] = useState<SecurityState>(getSecurityState());

  // Real-time security countdown timer when locked
  useEffect(() => {
    const timer = setInterval(() => {
      const current = getSecurityState();
      setSecurity(current);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatLockoutTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (security.isLocked) {
      setError(`يرجى الانتظار (${formatLockoutTime(security.remainingSeconds)}) قبل المحاولة مجدداً.`);
      return;
    }

    const cleanEmail = email.trim().toLowerCase();

    // Whitelist check (silently enforced)
    if (!isEmailAuthorized(cleanEmail)) {
      setLoading(true);
      await new Promise((res) => setTimeout(res, 1200));
      setLoading(false);

      const sec = recordFailedAttempt();
      setSecurity(sec);
      setError('بيانات الدخول غير صحيحة.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (!supabase) throw new Error('حدث خطأ في الاتصال.');

      await new Promise((res) => setTimeout(res, 600));

      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (authError) {
        throw authError;
      }

      if (data.session) {
        resetFailedAttempts();
        navigate('/');
      }
    } catch (err: any) {
      const sec = recordFailedAttempt();
      setSecurity(sec);

      if (sec.isLocked) {
        setError(`تم تجميد المحاولات مؤقتاً (${formatLockoutTime(sec.remainingSeconds)}).`);
      } else {
        setError('بيانات الدخول غير صحيحة.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 h-[100dvh] w-full overflow-y-auto no-scrollbar bg-emerald-950 flex items-center justify-center p-4 font-sans" dir="rtl">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white p-6 sm:p-8 rounded-[32px] shadow-2xl max-w-sm w-full text-center space-y-6 border border-emerald-900/20"
      >
        {/* Brand Header */}
        <div>
          <NasjahLogo variant="emblem" size="lg" className="mx-auto mb-3" />
          <h1 className="text-xl font-black text-emerald-950 tracking-wider">دار نَسْجَة للأقمشة</h1>
        </div>

        {/* Lockout Notice (Only shown if actually locked) */}
        <AnimatePresence>
          {security.isLocked && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-red-50 border border-red-200 text-red-900 p-3 rounded-2xl text-xs text-right space-y-1"
            >
              <div className="flex items-center justify-between text-xs font-mono font-bold text-red-700">
                <span className="flex items-center gap-1.5 font-sans font-bold">
                  <Clock className="w-3.5 h-3.5 text-red-600" /> يرجى الانتظار:
                </span>
                <span className="bg-red-200/80 px-2 py-0.5 rounded-lg text-red-950 font-bold">
                  {formatLockoutTime(security.remainingSeconds)}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error notification */}
        {error && !security.isLocked && (
          <div className="bg-red-50 text-red-800 p-3 rounded-2xl text-xs border border-red-200 text-right flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
            <span className="text-xs font-medium">{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleAuth} className="space-y-4 text-right">
          <div>
            <label className="block text-xs font-bold text-emerald-950 mb-1.5">
              البريد الإلكتروني
            </label>
            <div className="relative">
              <input
                type="email"
                required
                disabled={security.isLocked || loading}
                placeholder="example@domain.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-emerald-50/40 border border-emerald-900/15 rounded-xl pr-9 pl-3.5 py-2.5 focus:outline-none focus:ring-1 focus:ring-emerald-700 text-xs text-emerald-950 disabled:bg-gray-100 disabled:cursor-not-allowed text-left dir-ltr"
              />
              <Mail className="w-4 h-4 text-emerald-800/50 absolute right-3 top-3 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-emerald-950 mb-1.5">
              كلمة المرور
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                disabled={security.isLocked || loading}
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-emerald-50/40 border border-emerald-900/15 rounded-xl pr-9 pl-9 py-2.5 focus:outline-none focus:ring-1 focus:ring-emerald-700 text-xs text-emerald-950 disabled:bg-gray-100 disabled:cursor-not-allowed font-mono"
              />
              <Lock className="w-4 h-4 text-emerald-800/50 absolute right-3 top-3 pointer-events-none" />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPassword(!showPassword)}
                className="absolute left-3 top-2.5 text-emerald-800/50 hover:text-emerald-950 p-0.5"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          
          <button
            type="submit"
            disabled={loading || security.isLocked}
            className="w-full bg-emerald-900 hover:bg-emerald-800 text-white py-3 rounded-xl font-bold text-xs transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-98 shadow-sm"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                جاري التحقق...
              </span>
            ) : security.isLocked ? (
              <span>مقفل مؤقتاً ({formatLockoutTime(security.remainingSeconds)})</span>
            ) : (
              <span>تسجيل الدخول</span>
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
