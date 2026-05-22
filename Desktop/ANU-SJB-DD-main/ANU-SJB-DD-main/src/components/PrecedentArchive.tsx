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
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-slate-200 dark:border-slate-800">
        <div className="flex-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest border border-slate-200 dark:border-slate-700 mb-3">
            <Archive size={12} />
            Institutional History
          </div>
          <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Judicial Archives</h2>
          <p className="text-slate-500 dark:text-slate-400 font-medium mt-1"> Official library of SRC rulings, constitutional determinations, and legal precedents.</p>
        </div>

        <div className="w-full md:w-96">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
            <input
              type="text"
              placeholder="Filter by ruling or subject..."
              className="w-full pl-12 pr-4 py-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-medium shadow-sm text-sm text-slate-900 dark:text-white"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Tags Filter */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedTag(null)}
          className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border-2 ${
            !selectedTag ? 'bg-slate-900 dark:bg-indigo-600 text-white border-slate-900 dark:border-indigo-600 shadow-lg shadow-slate-200 dark:shadow-indigo-900/20' : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-400'
          }`}
        >
          Entire Registry
        </button>
        {allTags.map(tag => (
          <button
            key={tag}
            onClick={() => setSelectedTag(tag === selectedTag ? null : tag)}
            className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border-2 flex items-center gap-2 ${
              tag === selectedTag ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-100' : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-400'
            }`}
          >
            <Tag size={12} className={tag === selectedTag ? 'text-indigo-200' : 'text-slate-300 dark:text-slate-500'} />
            {tag}
          </button>
        ))}
      </div>

      {/* Library Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {loading ? (
          Array(4).fill(0).map((_, i) => (
            <div key={i} className="h-64 bg-white dark:bg-slate-900 rounded-3xl animate-pulse" />
          ))
        ) : filtered.length > 0 ? (
          filtered.map((precedent) => (
            <motion.div
              key={precedent.id}
              layout
              className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 p-10 hover:shadow-2xl dark:hover:shadow-none hover:border-indigo-100 dark:hover:border-indigo-900 transition-all group flex flex-col h-full relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity text-slate-400 dark:text-slate-600">
                <BookOpen size={120} />
              </div>

              <div className="flex items-center justify-between mb-8 relative z-10">
                <div className="flex items-center gap-3 text-[10px] font-black text-slate-400 dark:text-slate-500 font-mono tracking-[0.2em] uppercase bg-slate-50 dark:bg-slate-800/50 px-3 py-1.5 rounded-xl border border-slate-100 dark:border-slate-800">
                  <Calendar size={14} />
                  {precedent.date.toDate().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                </div>
                <div className="p-2.5 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl text-indigo-400 border border-indigo-100 dark:border-indigo-800 opacity-0 group-hover:opacity-100 transition-all">
                  <BookOpen size={20} />
                </div>
              </div>
              
              <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-4 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors uppercase tracking-tight leading-tight relative z-10">
                {precedent.title}
              </h3>
              
              <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed mb-8 flex-grow font-medium relative z-10">
                {precedent.summary}
              </p>

              <div className="flex flex-wrap gap-2 mb-10 relative z-10">
                {precedent.tags?.map(t => (
                  <span key={t} className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 px-3 py-1.5 rounded-xl uppercase tracking-widest border border-indigo-100 dark:border-indigo-800">
                    {t}
                  </span>
                ))}
              </div>

              <button className="mt-auto w-full py-5 bg-slate-50 dark:bg-slate-800 hover:bg-slate-900 dark:hover:bg-indigo-600 text-slate-900 dark:text-slate-200 hover:text-white rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all flex items-center justify-center gap-3 border border-slate-100 dark:border-slate-700 shadow-sm group-hover:shadow-lg active:scale-95 relative z-10">
                Examine Judicial Ruling
                <ExternalLink size={16} className="opacity-50" />
              </button>
            </motion.div>
          ))
        ) : (
          <div className="lg:col-span-2 text-center py-20 bg-slate-50/50 dark:bg-slate-900/50 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
            <Archive className="mx-auto text-slate-300 dark:text-slate-700 mb-4" size={48} />
            <p className="text-slate-500 dark:text-slate-400 font-medium">No precedents found in the archive for this selection.</p>
            <button 
              onClick={seedData}
              className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold flex items-center gap-2 mx-auto"
            >
              <Database size={16} />
              Seed Demo Data
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
