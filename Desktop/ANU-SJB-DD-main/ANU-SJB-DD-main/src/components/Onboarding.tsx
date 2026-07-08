import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, Briefcase, Bell, CheckCircle2, ChevronRight, ChevronLeft, Scale, Loader2, ShieldAlert } from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import LegalDocuments from './LegalDocuments';

interface OnboardingProps {
  user: any;
  onComplete: (studentId: string) => void;
}

export default function Onboarding({ user, onComplete }: OnboardingProps) {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [studentId, setStudentId] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [showLegal, setShowLegal] = useState<'terms' | 'privacy' | null>(null);

  const steps = [
    {
      title: "ANU SJB Protocol",
      description: "Identity verified. You have been granted secure access to the ANU student judicial board terminal. Please enter your official student identification to proceed.",
      icon: <Scale className="text-white w-12 h-12" />,
      color: "bg-slate-900 dark:bg-emerald-600",
      content: (
        <div className="mt-8 w-full max-w-xs mx-auto">
          <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 text-left">Official Student ID</label>
          <input
            required
            autoFocus
            type="text"
            maxLength={20}
            disabled={loading}
            placeholder="e.g. ANU-2024-XXXX"
            className="w-full px-6 py-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 font-bold text-slate-900 dark:text-white placeholder:text-slate-300 dark:placeholder:text-slate-600 outline-none transition-all text-center disabled:opacity-50"
            value={studentId}
            onChange={(e) => setStudentId(e.target.value.toUpperCase())}
          />
        </div>
      )
    },
    {
      title: "Legal Acknowledgement",
      description: "As an authenticated participant of the ANU Student Judicial Board, you must agree to the board's operational protocols and privacy standards.",
      icon: <ShieldAlert className="text-white w-12 h-12" />,
      color: "bg-slate-900 dark:bg-emerald-600",
      content: (
        <div className="mt-8 space-y-4 w-full max-w-sm mx-auto">
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => setShowLegal('terms')}
              className="flex items-center justify-between px-6 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl group hover:border-emerald-500/50 transition-all"
            >
              <div className="flex items-center gap-3">
                <Scale size={18} className="text-slate-400 group-hover:text-emerald-500" />
                <span className="text-[11px] font-black uppercase text-slate-700 dark:text-slate-200">Terms of Conduct</span>
              </div>
              <ChevronRight size={16} className="text-slate-300" />
            </button>
            <button
              type="button"
              onClick={() => setShowLegal('privacy')}
              className="flex items-center justify-between px-6 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl group hover:border-emerald-500/50 transition-all"
            >
              <div className="flex items-center gap-3">
                <ShieldAlert size={18} className="text-slate-400 group-hover:text-emerald-500" />
                <span className="text-[11px] font-black uppercase text-slate-700 dark:text-slate-200">Privacy Standards</span>
              </div>
              <ChevronRight size={16} className="text-slate-300" />
            </button>
          </div>

          <label className="flex items-center gap-4 p-5 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl border-2 border-emerald-200 dark:border-emerald-800 cursor-pointer group shadow-sm transition-all hover:bg-emerald-100 dark:hover:bg-emerald-900/30">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="w-6 h-6 rounded-lg border-2 border-emerald-600 accent-emerald-600 cursor-pointer"
            />
            <span className="text-xs sm:text-sm font-black text-emerald-950 dark:text-emerald-300 leading-tight">
              I have read and agree to all judicial protocols and data privacy standards.
            </span>
          </label>
        </div>
      )
    },
    {
      title: user.role === 'petitioner' ? "Judicial Filings" : "Board Management",
      description: user.role === 'petitioner' 
        ? "Submit encrypted legal petitions directly to the board ledger. Monitor resolution progress and receive official directives in real-time."
        : "Manage the centralized judicial docket, deliberate on active petitions, and issue board directives with biometric authorization.",
      icon: user.role === 'petitioner' ? <ShieldCheck className="text-white w-12 h-12" /> : <Briefcase className="text-white w-12 h-12" />,
      color: "bg-emerald-600"
    },
    {
      title: "Summons Engine",
      description: "The integrated Summons Engine provides certified digital delivery of board notices to all relevant parties via the automated notification relay.",
      icon: <Bell className="text-white w-12 h-12" />,
      color: "bg-emerald-500"
    },
    {
      title: "Final Authorization",
      description: "Protocol configuration complete. By initializing, you acknowledge that your digital signature is now linked to this authenticated identity. Proceed with integrity.",
      icon: <CheckCircle2 className="text-white w-12 h-12" />,
      color: "bg-slate-900"
    }
  ];

  const handleNext = () => {
    if (step === 0 && !studentId.trim()) {
      alert("Please enter your Student ID to proceed with the protocol.");
      return;
    }
    if (step === 1 && !agreed) {
      alert("You must acknowledge the legal protocols to proceed.");
      return;
    }
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      completeOnboarding();
    }
  };

  const handlePrev = () => {
    if (step > 0 && !loading) setStep(step - 1);
  };

  const completeOnboarding = async () => {
    if (!studentId.trim() || !agreed) {
      setStep(0);
      return;
    }

    setLoading(true);
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        hasCompletedOnboarding: true,
        studentId: studentId.trim(),
        agreedToLegal: true,
        legalAgreedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      onComplete(studentId.trim());
    } catch (error) {
      console.error("Onboarding Error:", error);
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-slate-950/90"
      />

      <AnimatePresence>
        {showLegal && (
          <LegalDocuments type={showLegal} onClose={() => setShowLegal(null)} />
        )}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative bg-white dark:bg-slate-900 w-full max-w-lg rounded-[2.5rem] sm:rounded-[3rem] overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 transition-colors flex flex-col max-h-[90vh]"
      >
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ type: "spring", damping: 25 }}
              className="p-8 sm:p-12 text-center flex flex-col items-center"
            >
              <div className={`${steps[step].color} w-24 h-24 sm:w-28 sm:h-28 rounded-[2rem] sm:rounded-[2.5rem] flex items-center justify-center mb-8 sm:mb-10 shadow-2xl relative transition-colors`}>
                <div className="absolute inset-0 bg-white/20 blur-2xl rounded-full translate-y-4" />
                <div className="relative z-10">{steps[step].icon}</div>
              </div>

              <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white uppercase tracking-tighter mb-6 leading-tight">
                {steps[step].title}
              </h2>
              <p className="text-slate-800 dark:text-slate-100 font-bold leading-relaxed text-base sm:text-lg max-w-sm mx-auto">
                {steps[step].description}
              </p>
              {(steps[step] as any).content}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="p-6 sm:p-10 bg-slate-50 dark:bg-slate-950/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex gap-2">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all duration-500 ${
                  i === step ? 'w-8 bg-emerald-600 shadow-lg shadow-emerald-500/20' : 'w-1.5 bg-slate-200 dark:bg-slate-800'
                }`}
              />
            ))}
          </div>

          <div className="flex gap-3">
            {step > 0 && (
              <button
                onClick={handlePrev}
                disabled={loading}
                className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl sm:rounded-2xl transition-all disabled:opacity-50"
              >
                <ChevronLeft size={20} />
              </button>
            )}
            <button
              onClick={handleNext}
              disabled={loading}
              className="px-6 sm:px-10 py-3 sm:py-4 bg-slate-900 dark:bg-emerald-600 border border-slate-800 dark:border-emerald-500 text-white font-black uppercase tracking-widest text-[9px] sm:text-[10px] rounded-xl sm:rounded-2xl flex items-center gap-3 transition-all shadow-xl disabled:opacity-50 active:scale-95 hover:bg-slate-800 dark:hover:bg-emerald-700"
            >
              {step === steps.length - 1 ? (
                loading ? <><Loader2 className="animate-spin" size={14} /> Authorizing</> : 'Initialize'
              ) : (
                <>Next Step <ChevronRight size={14} /></>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
