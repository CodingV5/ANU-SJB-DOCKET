import React, { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot, Timestamp, addDoc, serverTimestamp } from 'firebase/firestore';
import { Archive, Search, Tag, BookOpen, ExternalLink, Calendar, Plus, X, Loader2, Scale } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Precedent {
  id: string;
  title: string;
  summary: string;
  ruling: string;
  tags: string[];
  date: Timestamp;
}

export default function PrecedentArchive({ user }: { user: any }) {
  const [precedents, setPrecedents] = useState<Precedent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    summary: '',
    ruling: '',
    tags: '',
    date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    const q = query(collection(db, 'precedents'), orderBy('date', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Precedent[];
      setPrecedents(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'precedents');
    });
    return () => unsubscribe();
  }, []);

  const handleAddPrecedent = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const tagArray = formData.tags.split(',').map(t => t.trim()).filter(t => t);
      await addDoc(collection(db, 'precedents'), {
        title: formData.title,
        summary: formData.summary,
        ruling: formData.ruling,
        tags: tagArray,
        date: Timestamp.fromDate(new Date(formData.date)),
        createdAt: serverTimestamp()
      });
      setShowAddForm(false);
      setFormData({ title: '', summary: '', ruling: '', tags: '', date: new Date().toISOString().split('T')[0] });
    } catch (error) {
      console.error("Archive Error:", error);
      alert("Failed to archive precedent.");
    } finally {
      setSubmitting(false);
    }
  };

  const allTags = Array.from(new Set(precedents.flatMap(p => p.tags || [])));

  const filtered = precedents.filter(p => {
    const matchesSearch = p.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         p.summary.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTag = !selectedTag || p.tags?.includes(selectedTag);
    return matchesSearch && matchesTag;
  });

  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-slate-200 dark:border-slate-800">
        <div className="flex-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest border border-slate-200 dark:border-slate-700 mb-3">
            <Archive size={12} />
            Institutional History
          </div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none">Judicial Archives</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium mt-3 max-w-2xl text-sm sm:text-base">Official library of board rulings, constitutional determinations, and historical legal precedents.</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
          <div className="relative group flex-1 sm:w-80">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors" size={18} />
            <input
              type="text"
              placeholder="Search rulings..."
              className="w-full pl-14 pr-6 py-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-bold text-sm shadow-sm text-slate-900 dark:text-white"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          {(user.role === 'judge' || user.role === 'court_clerk') && (
            <button
              onClick={() => setShowAddForm(true)}
              className="px-8 py-4 bg-slate-900 dark:bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 hover:bg-slate-800 transition-all active:scale-95 shadow-xl"
            >
              <Plus size={18} /> Add Entry
            </button>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showAddForm && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAddForm(false)} className="fixed inset-0 bg-slate-950/90" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[2.5rem] overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800">
              <form onSubmit={handleAddPrecedent} className="p-10 space-y-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Archive New Precedent</h3>
                  <button type="button" onClick={() => setShowAddForm(false)} className="p-2 text-slate-400 hover:text-red-500 transition-colors"><X size={24} /></button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Case Title</label>
                      <input required type="text" className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl px-5 py-3 outline-none focus:border-emerald-500 text-slate-900 dark:text-white font-bold" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Decision Date</label>
                      <input required type="date" className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl px-5 py-3 outline-none focus:border-emerald-500 text-slate-900 dark:text-white font-bold" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Tags (Comma separated)</label>
                      <input type="text" placeholder="e.g. Constitutional, Conduct" className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl px-5 py-3 outline-none focus:border-emerald-500 text-slate-900 dark:text-white font-bold" value={formData.tags} onChange={e => setFormData({...formData, tags: e.target.value})} />
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Summary</label>
                      <textarea required className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl px-5 py-3 outline-none focus:border-emerald-500 text-slate-900 dark:text-white font-medium h-24 resize-none" value={formData.summary} onChange={e => setFormData({...formData, summary: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Final Ruling</label>
                      <textarea required className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl px-5 py-3 outline-none focus:border-emerald-500 text-slate-900 dark:text-white font-medium h-24 resize-none" value={formData.ruling} onChange={e => setFormData({...formData, ruling: e.target.value})} />
                    </div>
                  </div>
                </div>

                <button type="submit" disabled={submitting} className="w-full py-5 bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 active:scale-95 transition-all shadow-xl shadow-emerald-900/20 disabled:opacity-50">
                  {submitting ? <Loader2 className="animate-spin" /> : <Archive size={18} />}
                  Commit to Archive
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedTag(null)}
          className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border-2 ${
            !selectedTag ? 'bg-slate-900 dark:bg-emerald-600 text-white border-slate-900 dark:border-emerald-600 shadow-xl' : 'bg-white dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700 hover:border-emerald-500 hover:text-emerald-600'
          }`}
        >
          All Categories
        </button>
        {allTags.map(tag => (
          <button
            key={tag}
            onClick={() => setSelectedTag(tag === selectedTag ? null : tag)}
            className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border-2 flex items-center gap-2 ${
              tag === selectedTag ? 'bg-emerald-600 text-white border-emerald-600 shadow-xl' : 'bg-white dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700 hover:border-emerald-500 hover:text-emerald-600'
            }`}
          >
            <Tag size={12} className={tag === selectedTag ? 'text-emerald-200' : 'text-slate-300 dark:text-slate-500'} />
            {tag}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
        {loading ? (
          Array(4).fill(0).map((_, i) => <div key={i} className="h-72 bg-white dark:bg-slate-900 rounded-[2.5rem] animate-pulse" />)
        ) : filtered.length > 0 ? (
          filtered.map((precedent) => (
            <motion.div
              key={precedent.id}
              layout
              className="bg-white dark:bg-slate-900 rounded-[2rem] sm:rounded-[2.5rem] border border-slate-200 dark:border-slate-800 p-8 sm:p-12 hover:border-emerald-500/50 transition-all group relative overflow-hidden flex flex-col"
            >
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity text-slate-400 dark:text-slate-100">
                <Scale size={160} />
              </div>

              <div className="flex items-center gap-3 sm:gap-4 text-[8px] sm:text-[10px] font-black text-slate-400 dark:text-slate-500 font-mono tracking-widest uppercase mb-6 sm:mb-10 relative z-10">
                <Calendar size={12} />
                {precedent.date.toDate().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                REF: {precedent.id.slice(0, 8)}
              </div>
              
              <h3 className="text-xl sm:text-3xl font-black text-slate-900 dark:text-white mb-4 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors uppercase tracking-tight leading-none relative z-10">
                {precedent.title}
              </h3>
              
              <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed mb-6 flex-grow font-medium relative z-10 line-clamp-3">
                {precedent.summary}
              </p>

              <div className="flex flex-wrap gap-2 mb-8 relative z-10">
                {precedent.tags?.map(t => (
                  <span key={t} className="text-[8px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1.5 rounded-xl uppercase tracking-widest border border-emerald-100 dark:border-emerald-900">
                    {t}
                  </span>
                ))}
              </div>

              <button className="w-full py-4 sm:py-5 bg-slate-50 dark:bg-slate-800 hover:bg-slate-900 dark:hover:bg-indigo-600 text-slate-900 dark:text-slate-200 hover:text-white rounded-2xl font-black uppercase tracking-widest text-[9px] sm:text-[10px] transition-all flex items-center justify-center gap-3 border border-slate-100 dark:border-slate-700 active:scale-95 relative z-10">
                Examine Judicial Ruling
                <ExternalLink size={14} className="opacity-40" />
              </button>
            </motion.div>
          ))
        ) : (
          <div className="col-span-full py-32 bg-slate-50/50 dark:bg-slate-900/50 rounded-[3rem] border-2 border-dashed border-slate-200 dark:border-slate-800 text-center">
            <Archive className="mx-auto text-slate-200 dark:text-slate-700 mb-6" size={64} />
            <h3 className="text-xl font-bold text-slate-900 dark:text-white uppercase mb-2">No Historical Data</h3>
            <p className="text-slate-500 dark:text-slate-400 font-medium">The judicial archive is currently empty.</p>
            {(user.role === 'judge' || user.role === 'court_clerk') && (
              <button onClick={() => setShowAddForm(true)} className="mt-8 px-8 py-4 bg-emerald-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-emerald-900/20 active:scale-95 transition-all flex items-center gap-2 mx-auto">
                <Plus size={18} /> Start Archive Protocol
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
