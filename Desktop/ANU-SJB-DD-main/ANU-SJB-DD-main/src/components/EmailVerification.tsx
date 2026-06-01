import React, { useState } from 'react';
import { auth } from '../lib/firebase';
import { sendEmailVerification, reload } from 'firebase/auth';
import { motion } from 'motion/react';
import { Mail, ShieldCheck, Loader2, RefreshCw, LogOut, CheckCircle2 } from 'lucide-react';

interface EmailVerificationProps {
  user: any;
  onLogout: () => void;
}

export default function EmailVerification({ user, onLogout }: EmailVerificationProps) {
  const [loading, setLoading] = useState(false);
  const [resent, setResent] = useState(false);
  const [checking, setChecking] = useState(false);

  const handleResend = async () => {
    if (!auth.currentUser) return;
    setLoading(true);
    try {
      await sendEmailVerification(auth.currentUser);
      setResent(true);
      setTimeout(() => setResent(false), 5000);
    } catch (error) {
      console.error('Error sending verification email:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkVerification = async () => {
    setChecking(true);
    try {
      await reload(auth.currentUser!);
      if (auth.currentUser?.emailVerified) {
        window.location.reload();
      }
    } catch (error) {
      console.error('Error checking verification:', error);
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-6 relative overflow-hidden transition-colors duration-300">
      <div className="absolute inset-0 pointer-events-none opacity-50 dark:opacity-20">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_20%_20%,#10b98115_0%,transparent_40%)]" />
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-md w-full bg-white dark:bg-slate-900 p-10 rounded-[3rem] border border-slate-200 dark:border-slate-800 text-center relative z-10 shadow-2xl transition-colors">
        <div className="w-20 h-20 bg-emerald-600 rounded-[2rem] flex items-center justify-center mx-auto mb-10 shadow-2xl shadow-emerald-500/20">
          <Mail className="text-white w-10 h-10" />
        </div>

        <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-3 tracking-tight uppercase">Security Protocol</h1>
        <p className="text-slate-500 dark:text-slate-400 mb-10 leading-relaxed font-medium">
          A verification dispatch has been sent to <span className="text-emerald-600 dark:text-emerald-400 font-bold">{user.email}</span>. Please authorize via the link provided.
        </p>

        <div className="space-y-4">
          <button
            onClick={checkVerification}
            disabled={checking}
            className="w-full h-16 bg-slate-900 dark:bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 transition-all shadow-xl active:scale-95 disabled:opacity-50"
          >
            {checking ? <Loader2 className="animate-spin" size={20} /> : <ShieldCheck size={20} />}
            {checking ? 'Authenticating...' : 'Identity Verified'}
          </button>

          <button
            onClick={handleResend}
            disabled={loading || resent}
            className={`w-full h-16 border-2 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 transition-all ${
              resent 
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600'
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400'
            } disabled:opacity-50 active:scale-95`}
          >
            {loading ? <Loader2 className="animate-spin" size={18} /> : resent ? <CheckCircle2 size={18} /> : <RefreshCw size={18} />}
            {resent ? 'Link Re-dispatched' : 'Request New Link'}
          </button>
        </div>

        <div className="mt-12 pt-8 border-t border-slate-100 dark:border-slate-800">
          <button onClick={onLogout} className="flex items-center gap-2 mx-auto text-slate-400 hover:text-red-500 transition-colors text-[10px] font-black uppercase tracking-widest">
            <LogOut size={16} /> Terminate Connection
          </button>
        </div>
      </motion.div>
    </div>
  );
}
