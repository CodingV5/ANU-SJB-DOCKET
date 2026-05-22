import React, { useState, useEffect } from 'react';
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
        window.location.reload(); // Hard reload to trigger App.tsx state update
      }
    } catch (error) {
      console.error('Error checking verification:', error);
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-6 relative overflow-hidden transition-colors duration-300">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-1/4 -left-1/4 w-1/2 h-1/2 bg-indigo-500/10 rounded-full blur-[120px]" />
        <div className="absolute -bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-slate-500/5 rounded-full blur-[120px]" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white dark:bg-white/5 backdrop-blur-xl p-10 rounded-[2.5rem] border border-slate-200 dark:border-white/10 text-center relative z-10 shadow-2xl"
      >
        <div className="w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-indigo-500/20">
          <Mail className="text-white w-10 h-10" />
        </div>

        <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-2 tracking-tight uppercase">Identity Verification</h1>
        <p className="text-slate-600 dark:text-slate-400 mb-8 leading-relaxed">
          The ANU SJB DOCKET protocol requires a verified connection. We've dispatched a security link to <span className="text-indigo-600 dark:text-indigo-400 font-bold">{user.email}</span>.
        </p>

        <div className="space-y-4">
          <button
            onClick={checkVerification}
            disabled={checking}
            className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold flex items-center justify-center gap-3 transition-all shadow-lg shadow-indigo-900/20 disabled:opacity-50"
          >
            {checking ? <Loader2 className="animate-spin" /> : <ShieldCheck size={20} />}
            {checking ? 'Authenticating...' : 'I Have Verified My Email'}
          </button>

          <button
            onClick={handleResend}
            disabled={loading || resent}
            className={`w-full h-14 border rounded-2xl font-bold flex items-center justify-center gap-3 transition-all ${
              resent 
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-white/10'
            } disabled:opacity-50`}
          >
            {loading ? <Loader2 className="animate-spin" /> : resent ? <CheckCircle2 size={20} /> : <RefreshCw size={18} />}
            {resent ? 'Protocol Resent' : 'Resend Verification Link'}
          </button>
        </div>

        <div className="mt-10 pt-8 border-t border-slate-100 dark:border-white/5 flex flex-col items-center">
          <p className="text-slate-500 dark:text-slate-500 text-sm mb-6 flex items-center gap-2">
            Wrong email address? 
            <button onClick={onLogout} className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline">Exit Session</button>
          </p>
          
          <button
            onClick={onLogout}
            className="flex items-center gap-2 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors text-xs font-mono uppercase tracking-widest"
          >
            <LogOut size={14} /> Terminate Connection
          </button>
        </div>
      </motion.div>
    </div>
  );
}
