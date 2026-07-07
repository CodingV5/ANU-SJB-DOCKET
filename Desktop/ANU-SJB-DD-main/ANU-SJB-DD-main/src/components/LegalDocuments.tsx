import React from 'react';
import { motion } from 'motion/react';
import { X, Shield, Scale, FileText } from 'lucide-react';

interface LegalModalProps {
  type: 'terms' | 'privacy';
  onClose: () => void;
}

export default function LegalDocuments({ type, onClose }: LegalModalProps) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/95"
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[2.5rem] overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 transition-colors flex flex-col max-h-[85vh]"
      >
        <div className="p-6 sm:p-10 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-xl">
              {type === 'terms' ? <Scale size={24} /> : <Shield size={24} />}
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                {type === 'terms' ? 'Terms & Conditions' : 'Privacy Policy'}
              </h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Official ANU SJB Protocol</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 sm:p-10 custom-scrollbar bg-slate-50/50 dark:bg-slate-950/30">
          <div className="prose dark:prose-invert max-w-none space-y-8 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            {type === 'terms' ? (
              <>
                <section>
                  <h3 className="text-slate-900 dark:text-white font-bold uppercase tracking-tight flex items-center gap-2">
                    <span className="w-1.5 h-6 bg-emerald-500 rounded-full" /> 1. Judicial Authorization
                  </h3>
                  <p>By accessing the ANU SJB DOCKET, you acknowledge that you are a registered student or authorized faculty member of All Nations University. Any attempt to provide false identification or impersonate another party is a violation of university code.</p>
                </section>
                <section>
                  <h3 className="text-slate-900 dark:text-white font-bold uppercase tracking-tight flex items-center gap-2">
                    <span className="w-1.5 h-6 bg-emerald-500 rounded-full" /> 2. Data Integrity & Use
                  </h3>
                  <p>All filings, evidence, and deliberations committed to this ledger are legally binding within the jurisdiction of the Student Judicial Body. Users are prohibited from submitting malicious data, falsified evidence, or unauthorized recordings.</p>
                </section>
                <section>
                  <h3 className="text-slate-900 dark:text-white font-bold uppercase tracking-tight flex items-center gap-2">
                    <span className="w-1.5 h-6 bg-emerald-500 rounded-full" /> 3. Biometric Verification
                  </h3>
                  <p>Certain judicial actions, including final directives and summons acknowledgments, require biometric verification. You agree that your biometric data is processed locally on your device and is never transmitted to our servers.</p>
                </section>
              </>
            ) : (
              <>
                <section>
                  <h3 className="text-slate-900 dark:text-white font-bold uppercase tracking-tight flex items-center gap-2">
                    <span className="w-1.5 h-6 bg-emerald-500 rounded-full" /> 1. Information Collection
                  </h3>
                  <p>The SJB DOCKET collects Student IDs, University Email Addresses, and Profile Images solely for the purpose of maintaining a secure judicial record. We do not sell or share your data with third-party advertising networks.</p>
                </section>
                <section>
                  <h3 className="text-slate-900 dark:text-white font-bold uppercase tracking-tight flex items-center gap-2">
                    <span className="w-1.5 h-6 bg-emerald-500 rounded-full" /> 2. Evidence Storage
                  </h3>
                  <p>Uploaded evidence Artifacts (PDFs and Images) are stored in encrypted cloud silos. Access is strictly limited based on Role-Based Access Control (RBAC), viewable only by the Petitioner, Respondent, and presiding Board members.</p>
                </section>
                <section>
                  <h3 className="text-slate-900 dark:text-white font-bold uppercase tracking-tight flex items-center gap-2">
                    <span className="w-1.5 h-6 bg-emerald-500 rounded-full" /> 3. Retention Policy
                  </h3>
                  <p>Judicial records are retained for the duration of the current academic cycle plus two years, after which they are moved to deep archive or purged in accordance with University policy.</p>
                </section>
              </>
            )}

            <div className="pt-10 border-t border-slate-100 dark:border-slate-800 text-center">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">End of Document • Ref: ANU-SJB-LGL-2024</p>
            </div>
          </div>
        </div>

        <div className="p-6 sm:p-10 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
          <button
            onClick={onClose}
            className="w-full py-4 bg-slate-900 dark:bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs active:scale-95 transition-all shadow-xl"
          >
            I Understand
          </button>
        </div>
      </motion.div>
    </div>
  );
}
