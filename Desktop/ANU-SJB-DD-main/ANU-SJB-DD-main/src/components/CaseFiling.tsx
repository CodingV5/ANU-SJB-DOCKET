import React, { useState, useRef } from 'react';
import { db, storage, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { ShieldCheck, Send, Loader2, Info, Image as ImageIcon, X, Paperclip } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function CaseFiling({ user, onSuccess }: { user: any; onSuccess: () => void }) {
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [submittedCase, setSubmittedCase] = useState<{ id: string; title: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    respondentName: '',
    respondentEmail: '',
    evidence: [] as string[],
  });

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    const newEvidence = [...formData.evidence];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const storageRef = ref(storage, `evidence/${user.uid}/${Date.now()}_${file.name}`);
        const snapshot = await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(snapshot.ref);
        newEvidence.push(downloadURL);
      } catch (error) {
        console.error("Upload error:", error);
        alert(`Failed to upload ${file.name}`);
      }
    }

    setFormData({ ...formData, evidence: newEvidence });
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeEvidence = (index: number) => {
    const newEvidence = [...formData.evidence];
    newEvidence.splice(index, 1);
    setFormData({ ...formData, evidence: newEvidence });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.description) return;

    setLoading(true);
    try {
      const caseData = {
        ...formData,
        petitionerId: user.uid,
        petitionerName: user.displayName,
        petitionerEmail: user.email,
        status: 'pending',
        filedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, 'cases'), caseData);
      setSubmittedCase({ id: docRef.id, title: formData.title });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'cases');
    } finally {
      setLoading(false);
    }
  };

  if (submittedCase) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md mx-auto bg-white dark:bg-slate-900 rounded-[2.5rem] p-10 shadow-2xl border border-slate-200 dark:border-slate-800 text-center transition-colors"
      >
        <div className="w-24 h-24 bg-emerald-600 rounded-[2.5rem] flex items-center justify-center mx-auto mb-10 shadow-2xl shadow-emerald-200 dark:shadow-emerald-900/20 ring-8 ring-emerald-50 dark:ring-emerald-950/20">
          <ShieldCheck className="text-white" size={48} />
        </div>
        <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-2 uppercase tracking-tighter">Protocol Committed</h2>
        <p className="text-slate-500 dark:text-slate-400 mb-8 font-medium">Judicial petition has been encrypted and integrated into the board ledger.</p>
        
        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-3xl p-8 mb-10 text-left border border-slate-100 dark:border-slate-800 shadow-inner">
          <div className="mb-6">
            <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] block mb-2">Tracking Sequence</span>
            <code className="text-emerald-600 dark:text-emerald-400 font-mono text-xs font-bold bg-emerald-50/50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 px-3 py-2 rounded-xl block break-all leading-relaxed">{submittedCase.id}</code>
          </div>
          <div>
            <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] block mb-2">Docket Subject</span>
            <p className="text-slate-900 dark:text-white font-bold text-lg leading-tight uppercase tracking-tight">{submittedCase.title}</p>
          </div>
        </div>

        <button
          onClick={onSuccess}
          className="w-full py-5 bg-slate-900 dark:bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-slate-800 dark:hover:bg-emerald-700 transition-all shadow-xl active:scale-95"
        >
          Return to Registry
        </button>
      </motion.div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-slate-900 dark:bg-slate-950 rounded-[2.5rem] p-10 mb-8 text-white relative overflow-hidden shadow-2xl border border-white/5 transition-colors">
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-emerald-400 text-[10px] font-black uppercase tracking-[0.3em] mb-4">
            New Submission Protocol
          </div>
          <h2 className="text-4xl font-black mb-2 flex items-center gap-4 uppercase tracking-tighter">
            Petition Filing
          </h2>
          <p className="text-slate-400 text-sm font-medium max-w-sm">
            Authenticated E2EE submission to the ANU SJB DOCKET centralized registry.
          </p>
        </div>
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full -mr-32 -mt-32 blur-[100px]" />
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 p-10 shadow-sm transition-colors">
        <form onSubmit={handleSubmit} className="space-y-8">
          <div>
            <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-3">Case Title / Reference</label>
            <input
              required
              type="text"
              placeholder="Case Subject"
              className="w-full px-5 py-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 font-bold text-slate-900 dark:text-white placeholder:text-slate-300 dark:placeholder:text-slate-600 outline-none transition-all shadow-sm"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-3">Respondent Name</label>
              <input
                required
                type="text"
                placeholder="Full Name"
                className="w-full px-5 py-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 font-bold text-slate-900 dark:text-white placeholder:text-slate-300 dark:placeholder:text-slate-600 outline-none transition-all shadow-sm"
                value={formData.respondentName}
                onChange={(e) => setFormData({ ...formData, respondentName: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-3">Respondent Email</label>
              <input
                required
                type="email"
                placeholder="email@example.com"
                className="w-full px-5 py-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 font-bold text-slate-900 dark:text-white placeholder:text-slate-300 dark:placeholder:text-slate-600 outline-none transition-all shadow-sm"
                value={formData.respondentEmail}
                onChange={(e) => setFormData({ ...formData, respondentEmail: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-3">Evidence Details & Legal Grounds</label>
            <textarea
              required
              rows={6}
              placeholder="Detailed grounds for petition..."
              className="w-full px-5 py-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 font-medium text-slate-700 dark:text-slate-300 placeholder:text-slate-300 dark:placeholder:text-slate-600 outline-none transition-all resize-none shadow-sm mb-6"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Supporting Evidence (Photos/Docs)</label>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-[10px] uppercase tracking-widest hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors"
              >
                {uploading ? <Loader2 size={14} className="animate-spin" /> : <Paperclip size={14} />}
                Attach Evidence
              </button>
              <input
                type="file"
                multiple
                hidden
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept="image/*,.pdf"
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {formData.evidence.map((url, index) => (
                <div key={index} className="relative aspect-square rounded-xl overflow-hidden border-2 border-slate-100 dark:border-slate-800 group shadow-sm bg-white dark:bg-slate-800">
                  {url.includes('.pdf') ? (
                    <div className="w-full h-full bg-slate-50 dark:bg-slate-800/50 flex items-center justify-center text-slate-400">
                      <Paperclip size={24} />
                    </div>
                  ) : (
                    <img src={url} alt="Evidence" className="w-full h-full object-cover" />
                  )}
                  <button
                    type="button"
                    onClick={() => removeEvidence(index)}
                    className="absolute top-1 right-1 p-1 bg-white/90 dark:bg-slate-900/90 text-red-500 rounded-lg opacity-0 group-hover:opacity-100 transition-all shadow-md"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
              {uploading && (
                <div className="aspect-square rounded-xl bg-slate-50 dark:bg-slate-800/50 border-2 border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center text-slate-400 gap-2">
                  <Loader2 size={20} className="animate-spin" />
                  <span className="text-[8px] font-black uppercase tracking-tighter">Encrypting...</span>
                </div>
              )}
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-[1.5rem] p-6 flex gap-4 transition-colors">
            <div className="bg-white dark:bg-slate-800 p-2 rounded-xl shadow-sm h-fit"><Info className="text-emerald-600 dark:text-emerald-400" size={18} /></div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
              Submission under judicial oath. Records are immutable once committed. Ensure all identifiers and evidence summaries are verified before final encryption.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-16 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-100 dark:disabled:bg-slate-800 text-white rounded-2xl font-black uppercase tracking-[0.2em] text-xs flex items-center justify-center gap-4 transition-all shadow-xl shadow-emerald-100 dark:shadow-none active:scale-95"
          >
            {loading ? <Loader2 className="animate-spin" /> : <ShieldCheck size={20} />}
            {loading ? 'Encrypting...' : 'File Official Petition'}
          </button>
        </form>
      </div>
    </div>
  );
}
