import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, User, FileText, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface HearingCase {
  id: string;
  docketId: string;
  title: string;
  petitionerName: string;
  respondentName?: string;
  hearingDate: string;
  status: string;
}

export default function CalendarView({ user, onViewCase }: { user: any, onViewCase: (id: string) => void }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [hearings, setHearings] = useState<HearingCase[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, 'cases'),
      where('status', '==', 'hearing'),
      orderBy('hearingDate', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as HearingCase[];
      setHearings(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));

  const monthName = currentDate.toLocaleString('default', { month: 'long' });
  const year = currentDate.getFullYear();

  const days = [];
  const numDays = daysInMonth(year, currentDate.getMonth());
  const startDay = firstDayOfMonth(year, currentDate.getMonth());

  // Padding for start of month
  for (let i = 0; i < startDay; i++) {
    days.push(null);
  }

  for (let i = 1; i <= numDays; i++) {
    days.push(i);
  }

  const getHearingsForDay = (day: number) => {
    return hearings.filter(h => {
      const hDate = new Date(h.hearingDate);
      return hDate.getDate() === day &&
             hDate.getMonth() === currentDate.getMonth() &&
             hDate.getFullYear() === currentDate.getFullYear();
    });
  };

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-sm font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest font-mono mb-2">Schedule Management</h2>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Hearing Calendar</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium mt-2">Oversee all scheduled board deliberations and chamber sessions.</p>
        </div>

        <div className="flex items-center gap-4 bg-white dark:bg-slate-900 p-2 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <button onClick={prevMonth} className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors">
            <ChevronLeft size={20} />
          </button>
          <span className="text-sm font-black uppercase tracking-widest min-w-[140px] text-center">
            {monthName} {year}
          </span>
          <button onClick={nextMonth} className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors">
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Calendar Grid */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden p-6 sm:p-10">
          <div className="grid grid-cols-7 mb-6">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
              <div key={d} className="text-center text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 py-2">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {days.map((day, i) => {
              const dayHearings = day ? getHearingsForDay(day) : [];
              const isToday = day === new Date().getDate() &&
                             currentDate.getMonth() === new Date().getMonth() &&
                             currentDate.getFullYear() === new Date().getFullYear();

              return (
                <div
                  key={i}
                  className={`min-h-[60px] sm:min-h-[100px] p-2 rounded-2xl border transition-all ${
                    day ? 'bg-slate-50/50 dark:bg-slate-800/30' : 'opacity-0 pointer-events-none'
                  } ${
                    isToday ? 'border-emerald-500 ring-2 ring-emerald-50 dark:ring-emerald-900/10' : 'border-transparent'
                  }`}
                >
                  {day && (
                    <>
                      <span className={`text-[10px] font-black ${isToday ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-600'}`}>
                        {day.toString().padStart(2, '0')}
                      </span>
                      <div className="mt-2 space-y-1">
                        {dayHearings.map(h => (
                          <div
                            key={h.id}
                            onClick={() => onViewCase(h.id)}
                            className="bg-emerald-600 dark:bg-emerald-500 text-white text-[7px] sm:text-[8px] font-bold p-1 rounded-md truncate cursor-pointer hover:scale-105 transition-transform"
                          >
                            {h.docketId || 'CASE'}
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Sidebar: Upcoming Hearings */}
        <div className="space-y-6">
          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 flex items-center gap-2 px-2">
            <Clock size={14} /> Agenda Items
          </h3>

          <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
            {loading ? (
              Array(3).fill(0).map((_, i) => (
                <div key={i} className="h-32 bg-slate-100 dark:bg-slate-800 rounded-3xl animate-pulse" />
              ))
            ) : hearings.length > 0 ? (
              hearings.map(h => (
                <motion.div
                  key={h.id}
                  whileHover={{ x: 4 }}
                  onClick={() => onViewCase(h.id)}
                  className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm cursor-pointer group hover:border-emerald-500/50 transition-all"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="px-3 py-1 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-lg text-[8px] font-black uppercase tracking-widest border border-emerald-100 dark:border-emerald-800">
                      Hearing
                    </div>
                    <span className="text-[10px] font-mono text-slate-400">{h.docketId}</span>
                  </div>
                  <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight mb-4 group-hover:text-emerald-600 transition-colors line-clamp-1">{h.title}</h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                      <User size={12} className="text-slate-400" /> {h.petitionerName}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase">
                      <CalendarIcon size={12} /> {new Date(h.hearingDate).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-slate-50 dark:border-slate-800 flex items-center justify-between text-slate-300 dark:text-slate-700 group-hover:text-emerald-500 transition-colors">
                    <span className="text-[8px] font-black uppercase tracking-widest">Access Docket</span>
                    <ArrowRight size={14} />
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="bg-slate-50 dark:bg-slate-900/50 rounded-[2rem] p-12 text-center border-2 border-dashed border-slate-200 dark:border-slate-800">
                <CalendarIcon size={32} className="mx-auto text-slate-200 dark:text-slate-700 mb-4" />
                <p className="text-[10px] font-black uppercase text-slate-400">No scheduled sessions</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
