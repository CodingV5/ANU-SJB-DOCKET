import React, { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, where, onSnapshot, orderBy, Timestamp, updateDoc, doc, addDoc, serverTimestamp } from 'firebase/firestore';
import { Bell, Send, CheckCircle2, UserPlus, Loader2, Mail, ShieldAlert, Search as SearchIcon, ChevronDown, ChevronRight, Eye } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Capacitor } from '@capacitor/core';

interface Summon {
  id: string;
  caseId: string;
  caseTitle: string;
  recipientEmail: string;
  recipientName: string;
  status: 'delivered' | 'read' | 'acknowledged';
  sentAt: Timestamp | null;
  notes?: string;
}

export default function SummonsSystem({ user, onViewCase }: { user: any; onViewCase: (caseId: string) => void }) {
  const [summons, setSummons] = useState<Summon[]>([]);
  const [loading, setLoading] = useState(true);
  const [showIssueForm, setShowIssueForm] = useState(false);

  useEffect(() => {
    const summonsRef = collection(db, 'summons');
    // If not judge/clerk, show only summons sent to this user
    const q = (user.role === 'judge' || user.role === 'court_clerk')
      ? query(summonsRef, orderBy('sentAt', 'desc'))
      : query(summonsRef, where('recipientEmail', '==', user.email), orderBy('sentAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Summon[];
      setSummons(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'summons');
    });

    return () => unsubscribe();
  }, [user]);

  const handleAcknowledge = async (summonId: string) => {
    try {
      const summonDoc = doc(db, 'summons', summonId);
      await updateDoc(summonDoc, { status: 'acknowledged' });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `summons/${summonId}`);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight uppercase flex items-center gap-4">
            <div className="bg-indigo-600 p-2.5 rounded-2xl shadow-lg shadow-indigo-100 dark:shadow-indigo-900/20">
              <Bell className="text-white" size={28} />
            </div>
            Summons Engine
          </h2>
          <p className="text-slate-500 dark:text-slate-400 font-medium mt-2">Certified delivery and acknowledgment protocol for judicial proceedings</p>
        </div>

        {(user.role === 'judge' || user.role === 'court_clerk') && (
          <button
            onClick={() => setShowIssueForm(!showIssueForm)}
            className="flex items-center gap-2 px-8 py-4 bg-slate-900 dark:bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-wider text-xs hover:bg-slate-800 dark:hover:bg-indigo-700 transition-all shadow-xl shadow-slate-200 dark:shadow-indigo-900/20 active:scale-95"
          >
            <UserPlus size={18} />
            Initiate Summons
          </button>
        )}
      </div>

      {showIssueForm && <IssueSummonForm onSuccess={() => setShowIssueForm(false)} />}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {loading ? (
          Array(3).fill(0).map((_, i) => <div key={i} className="h-48 bg-white dark:bg-slate-900 rounded-3xl animate-pulse" />)
        ) : summons.length > 0 ? (
          summons.map((summon) => (
            <SummonCard 
              key={summon.id} 
              summon={summon} 
              onAcknowledge={() => handleAcknowledge(summon.id)} 
              isRecipient={summon.recipientEmail === user.email}
              onViewCase={() => onViewCase(summon.caseId)}
            />
          ))
        ) : (
          <div className="md:col-span-2 xl:col-span-3 py-16 bg-white dark:bg-slate-900 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl text-center">
            <ShieldAlert size={48} className="mx-auto text-slate-300 dark:text-slate-700 mb-4" />
            <h3 className="font-bold text-slate-900 dark:text-white">No active summons</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Status: Operational. No immediate judicial actions required.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function IssueSummonForm({ onSuccess }: { onSuccess: () => void }) {
  const [formData, setFormData] = useState({
    caseId: '',
    caseTitle: '',
    recipientEmail: '',
    recipientName: '',
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowConfirm(true);
  };

  const processSubmission = async () => {
    setShowConfirm(false);
    setLoading(true);
    try {
      const summonData = {
        ...formData,
        status: 'delivered',
        sentAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, 'summons'), summonData);

      // Call our notification API via Render
      try {
        const serverUrl = Capacitor.isNativePlatform()
          ? 'https://anu-sjb-docket.onrender.com'
          : window.location.origin;

        fetch(`${serverUrl}/api/notify-summon`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recipientName: formData.recipientName,
            recipientEmail: formData.recipientEmail,
            caseTitle: formData.caseTitle,
            caseId: formData.caseId
          })
        });
      } catch (err) {
        console.warn('Notification failed, but summon was issued:', err);
      }

      onSuccess();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'summons');
    } finally {
      setLoading(false);
    }
  };

  const [availableCases, setAvailableCases] = useState<any[]>([]);
  const [showCaseList, setShowCaseList] = useState(false);
  const [caseFilter, setCaseFilter] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'cases'), orderBy('filedAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setAvailableCases(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

  const filteredCases = availableCases.filter(c =>
    c.title.toLowerCase().includes(caseFilter.toLowerCase()) ||
    c.id.toLowerCase().includes(caseFilter.toLowerCase())
  );

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-slate-900 dark:bg-slate-950 p-8 rounded-3xl text-white shadow-2xl relative overflow-hidden mb-8"
    >
      <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full -mr-32 -mt-32 blur-3xl" />
      <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
        <Mail className="text-indigo-400" />
        Digital Summons Protocol
      </h3>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
        <div className="space-y-4">
          <div className="relative">
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Link to Existing Case</label>
            <button
              type="button"
              onClick={() => setShowCaseList(!showCaseList)}
              className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-3 flex items-center justify-between hover:bg-white/20 transition-all text-left"
            >
              <span className={formData.caseTitle ? 'text-white' : 'text-white/40'}>
                {formData.caseTitle || 'Select a judicial petition...'}
              </span>
              <ChevronDown size={18} className={`transition-transform ${showCaseList ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
              {showCaseList && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setShowCaseList(false)} 
                  />
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden z-50 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800"
                  >
                    <div className="p-3 border-b border-slate-100 dark:border-slate-800">
                      <div className="relative">
                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                        <input 
                          type="text" 
                          placeholder="Filter cases..."
                          className="w-full bg-slate-50 dark:bg-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-indigo-500/20"
                          value={caseFilter}
                          onChange={(e) => setCaseFilter(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="max-h-60 overflow-y-auto">
                      {filteredCases.map(c => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            setFormData({ ...formData, caseId: c.id, caseTitle: c.title });
                            setShowCaseList(false);
                          }}
                          className="w-full px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors border-b border-slate-50 dark:border-slate-800 last:border-0"
                        >
                          <div className="font-bold text-xs uppercase truncate">{c.title}</div>
                          <div className="text-[10px] text-slate-400 font-mono">Case REF: {c.id.slice(0, 8)}...</div>
                        </button>
                      ))}
                      {filteredCases.length === 0 && (
                        <div className="px-4 py-8 text-center text-slate-400 text-xs">No matching cases found</div>
                      )}
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input 
              label="Selected ID" 
              value={formData.caseId} 
              onChange={() => {}} 
              disabled // Derived from selection
            />
            <Input 
              label="Selected Subject" 
              value={formData.caseTitle} 
              onChange={() => {}} 
              disabled // Derived from selection
            />
          </div>
        </div>
        <div className="space-y-4">
          <Input label="Recipient Email" type="email" value={formData.recipientEmail} onChange={(v) => setFormData({ ...formData, recipientEmail: v })} />
          <Input label="Recipient Full Name" value={formData.recipientName} onChange={(v) => setFormData({ ...formData, recipientName: v })} />
          
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Judicial Notes / Instructions</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Enter specific instructions or context for the recipient..."
              className="w-full h-32 border bg-white/10 border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all text-white placeholder:text-white/20 resize-none"
            />
          </div>
        </div>
        <div className="md:col-span-2 pt-4">
          <button
            type="submit"
            disabled={loading || !formData.caseId}
            className="w-full h-14 bg-indigo-500 text-white rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-indigo-600 transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/20"
          >
            {loading ? <Loader2 className="animate-spin" /> : <Send size={20} />}
            Distribute Official Judicial Summon
          </button>
        </div>
      </form>

      <AnimatePresence>
        {showConfirm && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowConfirm(false)}
              className="absolute inset-0 bg-slate-900/80 backdrop-blur-md" 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white dark:bg-slate-900 text-slate-900 dark:text-white w-full max-w-md rounded-3xl p-8 shadow-2xl border border-slate-200 dark:border-slate-800"
            >
              <div className="w-16 h-16 bg-amber-50 dark:bg-amber-900/20 rounded-2xl flex items-center justify-center mb-6 border border-amber-100 dark:border-amber-900/30">
                <ShieldAlert className="text-amber-500" size={32} />
              </div>
              <h3 className="text-xl font-bold mb-2 uppercase tracking-tight">Authorize Judicial Summons?</h3>
              <p className="text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
                You are about to issue an official judicial summons to <span className="font-bold text-slate-900 dark:text-white">{formData.recipientName}</span>.
                This action will be logged in the public ledger and trigger an automated notification protocol.
              </p>
              
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 mb-8 border border-slate-100 dark:border-slate-800 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400 dark:text-slate-500 font-bold uppercase">Recipient</span>
                  <span className="font-mono">{formData.recipientEmail}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400 dark:text-slate-500 font-bold uppercase">Case Title</span>
                  <span className="font-bold text-slate-900 dark:text-white truncate max-w-[200px]">{formData.caseTitle}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400 dark:text-slate-500 font-bold uppercase">Case ID</span>
                  <span className="font-mono text-indigo-600 dark:text-indigo-400">{formData.caseId}</span>
                </div>
                {formData.notes && (
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                    <span className="text-slate-400 dark:text-slate-500 font-bold uppercase text-[10px] block mb-1">Custom Instructions</span>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 italic line-clamp-2">{formData.notes}</p>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => setShowConfirm(false)}
                  className="flex-1 px-6 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={processSubmission}
                  className="flex-1 px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
                >
                  Confirm Issuance
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function Input({ label, value, onChange, type = 'text', disabled = false }: { label: string; value: string; onChange: (v: string) => void; type?: string; disabled?: boolean }) {
  return (
    <div>
      <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">{label}</label>
      <input
        required
        disabled={disabled}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 transition-all ${
          disabled 
            ? 'bg-white/5 border-white/5 text-white/30 cursor-not-allowed' 
            : 'bg-white/10 border-white/10 focus:ring-indigo-500/50 text-white placeholder:text-white/20'
        }`}
      />
    </div>
  );
}

function SummonCard({ summon, onAcknowledge, isRecipient, onViewCase }: any) {
  const isPending = summon.status === 'delivered';
  const isRead = summon.status === 'read';
  const isAcknowledged = summon.status === 'acknowledged';

  useEffect(() => {
    if (isRecipient && isPending) {
      const markAsRead = async () => {
        try {
          await updateDoc(doc(db, 'summons', summon.id), { status: 'read' });
        } catch (error) {
          // Silent failure for background status update
          console.warn("Background status update failed:", error);
        }
      };
      markAsRead();
    }
  }, [isRecipient, isPending, summon.id]);

  return (
    <motion.div
      whileHover={{ y: -4 }}
      className={`bg-white dark:bg-slate-900 border rounded-[2rem] p-8 flex flex-col h-full transition-all relative overflow-hidden ${
        (isPending || isRead) && isRecipient 
          ? 'border-indigo-400 dark:border-indigo-500 shadow-2xl dark:shadow-none shadow-indigo-100 ring-2 ring-indigo-50 dark:ring-indigo-900/20'
          : 'border-slate-200 dark:border-slate-800 shadow-sm'
      }`}
    >
      {/* Visual Indicator for user */}
      {(isPending || isRead) && isRecipient && (
        <div className="absolute top-0 right-0 px-4 py-1 bg-indigo-600 text-white text-[9px] font-black uppercase tracking-widest rounded-bl-xl">
          Action Required
        </div>
      )}

      <div className="flex items-start justify-between mb-6">
        <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-[1.25rem] relative border border-slate-100 dark:border-slate-700">
          <Bell className={(isPending || isRead) && isRecipient ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'} size={24} />
          {isRead && (
            <div className="absolute -top-1.5 -right-1.5 bg-blue-500 text-white rounded-full p-1 border-2 border-white dark:border-slate-900">
              <Eye size={12} />
            </div>
          )}
        </div>
        <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.1em] border-2 shadow-sm ${
          isAcknowledged ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' :
          isRead ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800' :
          'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800'
        }`}>
          {summon.status}
        </div>
      </div>

      <h4 className="text-xl font-bold text-slate-900 dark:text-white mb-2 line-clamp-2 leading-tight uppercase tracking-tight">{summon.caseTitle}</h4>
      <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono tracking-tighter mb-6 bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded inline-block w-fit">REF: {summon.caseId}</p>

      <div className="space-y-3 mb-8 flex-grow">
        <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300 font-medium">
          <div className="bg-slate-100 dark:bg-slate-800 p-1.5 rounded-lg text-slate-400 dark:text-slate-500"><UserPlus size={14} /></div>
          <span>{summon.recipientName}</span>
        </div>
        <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300 font-medium">
          <div className="bg-slate-100 dark:bg-slate-800 p-1.5 rounded-lg text-slate-400 dark:text-slate-500"><Mail size={14} /></div>
          <span className="truncate opacity-80">{summon.recipientEmail}</span>
        </div>
      </div>

      {summon.notes && (
        <div className="mb-8 p-5 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-2xl relative">
          <span className="absolute -top-2 left-4 bg-white dark:bg-slate-900 px-2 text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest border border-slate-100 dark:border-slate-800 rounded">Instructions</span>
          <p className="text-xs text-slate-600 dark:text-slate-400 italic leading-relaxed">{summon.notes}</p>
        </div>
      )}

      <div className="mt-auto space-y-4">
        {(isPending || isRead) && isRecipient ? (
          <button
            onClick={onAcknowledge}
            className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-wider text-xs flex items-center justify-center gap-3 hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200 dark:shadow-none active:scale-95"
          >
            <CheckCircle2 size={18} />
            Acknowledge Protocol
          </button>
        ) : (
          <div className="py-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-2xl flex flex-col items-center justify-center gap-1">
            <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none">Record Logged</span>
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300 tracking-tight">
              {summon.sentAt ? (summon.sentAt.toDate ? summon.sentAt.toDate().toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : new Date(summon.sentAt as any).toLocaleString()) : 'Pending...'}
            </span>
          </div>
        )}
        
        <button
          onClick={onViewCase}
          className="w-full py-4 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-2xl font-black uppercase tracking-wider text-[10px] flex items-center justify-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-slate-300 dark:hover:border-slate-600 transition-all active:scale-95"
        >
          <SearchIcon size={16} className="text-slate-400 dark:text-slate-500" />
          Access Case Docket
        </button>
      </div>
    </motion.div>
  );
}
