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
    const q = (user.role === 'judge' || user.role === 'court_clerk')
      ? query(summonsRef, orderBy('sentAt', 'desc'))
      : query(summonsRef, where('recipientEmail', '==', user.email), orderBy('sentAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Summon[];
      setSummons(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'summons');
    });
    return () => unsubscribe();
  }, [user]);

  const handleAcknowledge = async (summonId: string) => {
    try {
      await updateDoc(doc(db, 'summons', summonId), { status: 'acknowledged' });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `summons/${summonId}`);
    }
  };

  return (
    <div className="space-y-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-sm font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest font-mono mb-2">Notice Relay</h2>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Summons Engine</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium mt-2">Certified digital delivery and acknowledgment for board proceedings.</p>
        </div>

        {(user.role === 'judge' || user.role === 'court_clerk') && (
          <button
            onClick={() => setShowIssueForm(!showIssueForm)}
            className="flex items-center gap-2 px-8 py-4 bg-slate-900 dark:bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-wider text-[10px] hover:bg-slate-800 dark:hover:bg-emerald-700 transition-all shadow-xl active:scale-95"
          >
            <UserPlus size={18} />
            Initiate Summons
          </button>
        )}
      </div>

      {showIssueForm && <IssueSummonForm onSuccess={() => setShowIssueForm(false)} />}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          Array(3).fill(0).map((_, i) => <div key={i} className="h-64 bg-white dark:bg-slate-900 rounded-3xl animate-pulse" />)
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
          <div className="md:col-span-full py-24 bg-white dark:bg-slate-900 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[2.5rem] text-center">
            <ShieldAlert size={48} className="mx-auto text-slate-300 dark:text-slate-700 mb-4" />
            <h3 className="font-bold text-slate-900 dark:text-white uppercase tracking-widest text-xs">No Active Summons</h3>
          </div>
        )}
      </div>
    </div>
  );
}

function IssueSummonForm({ onSuccess }: { onSuccess: () => void }) {
  const [formData, setFormData] = useState({ caseId: '', caseTitle: '', recipientEmail: '', recipientName: '', notes: '' });
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
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

  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); setShowConfirm(true); };

  const processSubmission = async () => {
    setShowConfirm(false);
    setLoading(true);
    try {
      const summonData = { ...formData, status: 'delivered', sentAt: serverTimestamp() };
      await addDoc(collection(db, 'summons'), summonData);

      const serverUrl = Capacitor.isNativePlatform() ? 'https://anu-sjb-docket.onrender.com' : window.location.origin;
      await fetch(`${serverUrl}/api/notify-summon`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientName: formData.recipientName, recipientEmail: formData.recipientEmail, caseTitle: formData.caseTitle, caseId: formData.caseId })
      });
      onSuccess();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'summons');
    } finally {
      setLoading(false);
    }
  };

  const filteredCases = availableCases.filter(c =>
    c.title.toLowerCase().includes(caseFilter.toLowerCase()) || c.id.toLowerCase().includes(caseFilter.toLowerCase())
  );

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-slate-900 dark:bg-slate-950 p-10 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden mb-12">
      <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full -mr-32 -mt-32 blur-[100px]" />
      <h3 className="text-xl font-black mb-8 flex items-center gap-3 uppercase tracking-tight">
        <Mail className="text-emerald-400" />
        Digital Summons Protocol
      </h3>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
        <div className="space-y-6">
          <div className="relative">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Judicial Link</label>
            <button type="button" onClick={() => setShowCaseList(!showCaseList)} className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 flex items-center justify-between hover:bg-white/10 transition-all text-left">
              <span className={formData.caseTitle ? 'text-white' : 'text-white/40'}>{formData.caseTitle || 'Select active petition...'}</span>
              <ChevronDown size={18} className={`transition-transform ${showCaseList ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence>
              {showCaseList && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="absolute top-full left-0 right-0 mt-3 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden z-50 border border-slate-200 dark:border-slate-800">
                  <div className="max-h-64 overflow-y-auto">
                    {filteredCases.map(c => (
                      <button key={c.id} type="button" onClick={() => { setFormData({ ...formData, caseId: c.id, caseTitle: c.title }); setShowCaseList(false); }} className="w-full px-5 py-4 text-left hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors border-b border-slate-50 dark:border-slate-800 last:border-0">
                        <div className="font-black text-xs uppercase text-slate-900 dark:text-white truncate">{c.title}</div>
                        <div className="text-[10px] text-slate-400 font-mono mt-1">REF: {c.id.slice(0, 12)}</div>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <div className="grid grid-cols-1 gap-4">
            <Input label="Recipient Email" value={formData.recipientEmail} onChange={(v) => setFormData({ ...formData, recipientEmail: v })} />
            <Input label="Recipient Name" value={formData.recipientName} onChange={(v) => setFormData({ ...formData, recipientName: v })} />
          </div>
        </div>
        <div className="space-y-6">
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Directives</label>
          <textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} placeholder="Enter formal instructions..." className="w-full h-[180px] bg-white/5 border border-white/10 rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all text-white placeholder:text-white/20 resize-none text-sm font-medium" />
        </div>
        <div className="md:col-span-2">
          <button type="submit" disabled={loading || !formData.caseId} className="w-full h-16 bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-4 hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-900/20 active:scale-95">
            {loading ? <Loader2 className="animate-spin" /> : <Send size={20} />}
            Issue Official Summon
          </button>
        </div>
      </form>
      {/* Confirmation Modal */}
      <AnimatePresence>
        {showConfirm && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowConfirm(false)} className="fixed inset-0 bg-slate-950/90 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="relative bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] p-10 shadow-2xl border border-slate-200 dark:border-slate-800">
              <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase mb-4">Confirm Issuance</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-8">You are initiating a certified summons protocol for <span className="text-slate-900 dark:text-white font-bold">{formData.recipientName}</span>.</p>
              <div className="flex gap-3">
                <button onClick={() => setShowConfirm(false)} className="flex-1 py-4 bg-slate-50 dark:bg-slate-800 rounded-xl font-bold uppercase text-[10px]">Cancel</button>
                <button onClick={processSubmission} className="flex-1 py-4 bg-emerald-600 text-white rounded-xl font-black uppercase text-[10px]">Confirm</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function Input({ label, value, onChange, type = 'text', disabled = false }: any) {
  return (
    <div>
      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{label}</label>
      <input required disabled={disabled} type={type} value={value} onChange={(e) => onChange(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 focus:ring-2 focus:ring-emerald-500/50 text-white outline-none font-bold text-sm" />
    </div>
  );
}

function SummonCard({ summon, onAcknowledge, isRecipient, onViewCase }: any) {
  const isPending = summon.status === 'delivered';
  const isRead = summon.status === 'read';
  const isAcknowledged = summon.status === 'acknowledged';

  return (
    <motion.div whileHover={{ y: -4 }} className={`bg-white dark:bg-slate-900 border-2 rounded-[2.5rem] p-8 flex flex-col h-full transition-all relative overflow-hidden ${
      (isPending || isRead) && isRecipient ? 'border-emerald-500 shadow-2xl dark:shadow-none ring-4 ring-emerald-50 dark:ring-emerald-950/20' : 'border-slate-100 dark:border-slate-800'
    }`}>
      <div className="flex items-start justify-between mb-8">
        <div className={`p-4 rounded-2xl ${isRecipient ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400' : 'bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-600'}`}>
          <Bell size={24} />
        </div>
        <div className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest ${
          isAcknowledged ? 'bg-emerald-600 text-white' : 'bg-slate-900 dark:bg-emerald-900/40 text-white'
        }`}>{summon.status}</div>
      </div>
      <h4 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight leading-tight mb-4">{summon.caseTitle}</h4>
      <div className="space-y-2 mb-8 flex-grow">
        <div className="flex items-center gap-2 text-[11px] font-bold text-slate-600 dark:text-slate-400"><UserPlus size={14} className="text-slate-300" /> {summon.recipientName}</div>
        <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400 truncate"><Mail size={14} className="text-slate-200 dark:text-slate-700" /> {summon.recipientEmail}</div>
      </div>
      <div className="flex gap-2">
        {(isPending || isRead) && isRecipient ? (
          <button onClick={onAcknowledge} className="flex-1 py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-widest text-[9px] shadow-lg shadow-emerald-900/20">Acknowledge</button>
        ) : (
          <div className="flex-1 py-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl flex flex-col items-center justify-center">
            <span className="text-[8px] font-black text-slate-300 uppercase">Received</span>
            <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400">{summon.sentAt ? formatTimestamp(summon.sentAt) : 'Pending'}</span>
          </div>
        )}
        <button onClick={onViewCase} className="p-4 bg-slate-900 text-white rounded-2xl hover:bg-slate-800 transition-all"><ChevronRight size={20} /></button>
      </div>
    </motion.div>
  );
}

function formatTimestamp(ts: any) {
  if (!ts) return 'N/A';
  const date = ts.toDate ? ts.toDate() : new Date(ts);
  return date.toLocaleDateString([], { dateStyle: 'short' });
}
