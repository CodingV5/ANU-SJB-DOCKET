import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, Briefcase, Archive, Bell, CheckCircle2, ChevronRight, ChevronLeft, Scale } from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';

interface OnboardingProps {
  user: any;
  onComplete: () => void;
}

export default function Onboarding({ user, onComplete }: OnboardingProps) {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [studentId, setStudentId] = useState('');

  const steps = [
    {
      title: "ANU SJB Protocol",
      description: "Identity verified. You have been granted secure access to the ANU student judicial board terminal. Please enter your student identification.",
      icon: <Scale className="text-white w-12 h-12" />,
      color: "bg-slate-900 dark:bg-emerald-600",
      content: (
        <div className="mt-8 w-full max-w-xs mx-auto">
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 text-left">Student ID Number</label>
          <input
            required
            autoFocus
            type="text"
            placeholder="ANU-2024-XXXX"
            className="w-full px-6 py-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 font-bold text-slate-900 dark:text-white placeholder:text-slate-300 dark:placeholder:text-slate-600 outline-none transition-all text-center"
            value={studentId}
            onChange={(e) => setStudentId(e.target.value.toUpperCase())}
          />
        </div>
      )
    },
    {
      title: user.role === 'petitioner' ? "File Petition" : "Judicial Desk",
      description: user.role === 'petitioner' 
        ? "Submit encrypted legal petitions directly to the board. Track resolution status in real-time."
        : "Manage the official judicial docket, examine digital evidence, and issue board directives.",
      icon: user.role === 'petitioner' ? <ShieldCheck className="text-white w-12 h-12" /> : <Briefcase className="text-white w-12 h-12" />,
      color: "bg-emerald-600"
    },
    {
      title: "Notice Relay",
      description: "The Summons Engine provides certified digital delivery of board notices to all relevant parties via the centralized relay.",
      icon: <Bell className="text-white w-12 h-12" />,
      color: "bg-emerald-500"
    },
    {
      title: "Full Authorization",
      description: "Your digital fingerprint is now linked to this profile. You are responsible for all judicial data processing under this identity.",
      icon: <CheckCircle2 className="text-white w-12 h-12" />,
      color: "bg-slate-900"
    }
  ];

  const handleNext = () => {
    if (step === 0 && !studentId.trim()) {
      alert("Official Student ID is required.");
      return;
    }
    if (step < steps.length - 1) setStep(step + 1);
    else completeOnboarding();
  };

  const handlePrev = () => { if (step > 0) setStep(step - 1); };

  const completeOnboarding = async () => {
    setLoading(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        hasCompletedOnboarding: true,
        studentId: studentId.trim()
      });
      onComplete();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" />
      <motion.div initial={{ opacity: 0, scale: 0.9, y: 30 }} animate={{ opacity: 1, scale: 1, y: 0 }} className="relative bg-white dark:bg-slate-900 w-full max-w-lg rounded-[3rem] overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 transition-colors">
        <div className="flex flex-col">
          <AnimatePresence mode="wait">
            <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ type: "spring", damping: 25 }} className="p-12 text-center flex flex-col items-center">
              <div className={`${steps[step].color} w-28 h-28 rounded-[2.5rem] flex items-center justify-center mb-10 shadow-2xl relative transition-colors`}>
                <div className="absolute inset-0 bg-white/20 blur-2xl rounded-full translate-y-4" />
                <div className="relative z-10">{steps[step].icon}</div>
              </div>
              <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter mb-4 leading-tight">{steps[step].title}</h2>
              <p className="text-slate-500 dark:text-slate-400 font-medium leading-relaxed">{steps[step].description}</p>
              {(steps[step] as any).content}
            </motion.div>
          </AnimatePresence>
          <div className="p-10 bg-slate-50 dark:bg-slate-950/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="flex gap-2.5">
              {steps.map((_, i) => (
                <div key={i} className={`h-2 rounded-full transition-all duration-500 ${i === step ? 'w-10 bg-emerald-600 shadow-lg shadow-emerald-500/20' : 'w-2 bg-slate-200 dark:bg-slate-800'}`} />
              ))}
            </div>
            <div className="flex gap-4">
              {step > 0 && (
                <button onClick={handlePrev} className="w-12 h-12 flex items-center justify-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-2xl transition-all shadow-sm" disabled={loading}>
                  <ChevronLeft size={20} />
                </button>
              )}
              <button onClick={handleNext} disabled={loading} className="px-10 py-4 bg-slate-900 dark:bg-emerald-600 border border-slate-800 dark:border-emerald-500 text-white font-black uppercase tracking-widest text-[10px] rounded-2xl flex items-center gap-3 transition-all shadow-xl disabled:opacity-50 active:scale-95">
                {step === steps.length - 1 ? (loading ? 'Authorizing...' : 'Initialize') : <>Proceed <ChevronRight size={14} /></>}
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
