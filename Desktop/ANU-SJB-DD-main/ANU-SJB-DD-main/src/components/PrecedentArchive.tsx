import React, { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot, Timestamp, addDoc } from 'firebase/firestore';
import { Archive, Search, Tag, BookOpen, ExternalLink, Calendar, Database } from 'lucide-react';
import { motion } from 'motion/react';

interface Precedent {
  id: string;
  title: string;
  summary: string;
  ruling: string;
  tags: string[];
  date: Timestamp;
}

export default function PrecedentArchive() {
  const [precedents, setPrecedents] = useState<Precedent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  const seedData = async () => {
    const data = [
      {
        title: "Constitutional Review vs. AI Autonomy",
        summary: "A landmark case regarding the legal personality of autonomous agents within the SRC jurisdiction.",
        ruling: "The court ruled that while AI agents possess 'limited agency', ultimate legal liability rests with the human operator or organization.",
        tags: ["Constitutional", "Technology"],
        date: Timestamp.fromDate(new Date('2025-10-15'))
      },
      {
        title: "Privacy Rights in Decentralized Networks",
        summary: "Investigation into the balance between public ledger transparency and individual right to be forgotten.",
        ruling: "Individual privacy outweighs protocol transparency when biometric data is involved.",
        tags: ["Privacy", "Digital Rights"],
        date: Timestamp.fromDate(new Date('2025-12-01'))
      },
      {
        title: "The People vs. Global Grid Systems",
        summary: "Class action lawsuit regarding infrastructure downtime and economic damages.",
        ruling: "Infrastructure providers are liable for 'gross negligence' if redundant systems fail to meet the 99.9% uptime mandate.",
        tags: ["Tort", "Infrastructure"],
        date: Timestamp.fromDate(new Date('2026-01-20'))
      }
    ];
    for (const p of data) {
      await addDoc(collection(db, 'precedents'), p);
    }
  };

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

  const allTags = Array.from(new Set(precedents.flatMap(p => p.tags || [])));

  const filtered = precedents.filter(p => {
    const matchesSearch = p.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         p.summary.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTag = !selectedTag || p.tags?.includes(selectedTag);
    return matchesSearch && matchesTag;
  });

  return (
    <div className="space-y-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="flex-1">
          <h2 className="text-sm font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest font-mono mb-2">Legal Precedents</h2>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none">Judicial Archives</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium mt-3 max-w-2xl">Official library of board rulings, constitutional determinations, and historical legal precedents.</p>
        </div>

        <div className="w-full md:w-96">
          <div className="relative group">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors" size={18} />
            <input
              type="text"
              placeholder="Search rulings..."
              className="w-full pl-14 pr-6 py-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-bold text-sm shadow-sm text-slate-900 dark:text-white"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

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
            <Tag size={12} className={tag === selectedTag ? 'text-emerald-200' : 'text-slate-300'} />
            {tag}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {loading ? (
          Array(4).fill(0).map((_, i) => <div key={i} className="h-72 bg-white dark:bg-slate-900 rounded-[2.5rem] animate-pulse" />)
        ) : filtered.length > 0 ? (
          filtered.map((precedent) => (
            <motion.div
              key={precedent.id}
              layout
              className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 p-12 hover:border-emerald-500/50 transition-all group relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity text-slate-400 dark:text-slate-100">
                <BookOpen size={160} />
              </div>

              <div className="flex items-center gap-4 text-[10px] font-black text-slate-400 dark:text-slate-500 font-mono tracking-widest uppercase mb-10 relative z-10">
                <Calendar size={14} />
                {precedent.date.toDate().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                REF: {precedent.id.slice(0, 8)}
              </div>
              
              <h3 className="text-3xl font-black text-slate-900 dark:text-white mb-6 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors uppercase tracking-tight leading-none relative z-10">
                {precedent.title}
              </h3>
              
              <p className="text-slate-500 dark:text-slate-400 text-base leading-relaxed mb-10 flex-grow font-medium relative z-10">
                {precedent.summary}
              </p>

              <div className="flex flex-wrap gap-2 mb-12 relative z-10">
                {precedent.tags?.map(t => (
                  <span key={t} className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-4 py-1.5 rounded-xl uppercase tracking-widest border border-emerald-100 dark:border-emerald-900">
                    {t}
                  </span>
                ))}
              </div>

              <button className="w-full py-5 bg-slate-50 dark:bg-slate-800 hover:bg-slate-900 dark:hover:bg-emerald-600 text-slate-900 dark:text-slate-200 hover:text-white rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all flex items-center justify-center gap-3 border border-slate-100 dark:border-slate-700 active:scale-95 relative z-10">
                Examine Judicial Ruling
                <ExternalLink size={16} className="opacity-40" />
              </button>
            </motion.div>
          ))
        ) : (
          <div className="lg:col-span-2 text-center py-32 bg-slate-50/50 dark:bg-slate-900/50 rounded-[3rem] border-2 border-dashed border-slate-200 dark:border-slate-800">
            <Archive className="mx-auto text-slate-200 dark:text-slate-700 mb-6" size={64} />
            <p className="text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest text-xs mb-8">Registry record not found</p>
            <button onClick={seedData} className="px-8 py-4 bg-emerald-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-emerald-900/20 active:scale-95 transition-all">
              Initialize Seed Protocol
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
