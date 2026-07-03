import React, { useEffect, useState } from 'react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, where, onSnapshot, orderBy, Timestamp, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { Clock, CheckCircle2, AlertCircle, ChevronRight, Search, FileText, Scale, Bell, ShieldCheck, Archive, X, Download, Sparkles, Wand2, Loader2, Send, ExternalLink, Paperclip, Calendar, MoreHorizontal, ArrowUpRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { jsPDF } from 'jspdf';
import { NativeBiometric } from '@capgo/capacitor-native-biometric';
import { Capacitor } from '@capacitor/core';

interface Case {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'reviewing' | 'hearing' | 'resolved' | 'dismissed';
  filedAt: Timestamp | null;
  updatedAt?: Timestamp | null;
  petitionerName: string;
  petitionerId: string;
  petitionerEmail?: string;
  respondentName?: string;
  respondentEmail?: string;
  evidence?: string[];
  deliberations?: any[];
  hearingDate?: string;
  finalDirective?: string;
}

export default function Dashboard({ user, initialCaseId, onModalClose }: { user: any; initialCaseId?: string | null; onModalClose?: () => void }) {
  const [cases, setCases] = useState<Case[]>([]);
  const [summonsCount, setSummonsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  const [aiBrief, setAiBrief] = useState<string | null>(null);
  const [summarizing, setSummarizing] = useState(false);
  const [directiveText, setDirectiveText] = useState('');
  const [showDirectiveInput, setShowDirectiveInput] = useState(false);

  const formatTimestamp = (ts: any, type: 'date' | 'time' = 'date') => {
    if (!ts) return 'N/A';
    try {
      const date = ts.toDate ? ts.toDate() : new Date(ts);
      return type === 'date' ? date.toLocaleDateString() : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return 'Syncing...';
    }
  };

  const getAiBrief = async (caseData: Case) => {
    setSummarizing(true);
    setAiBrief(null);
    try {
      const serverUrl = Capacitor.isNativePlatform()
        ? 'https://anu-sjb-docket.onrender.com'
        : window.location.origin;

      const response = await fetch(`${serverUrl}/api/summarize-case`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: caseData.description, title: caseData.title })
      });
      if (!response.ok) throw new Error(`Server error: ${response.status}`);
      const data = await response.json();
      setAiBrief(data.summary);
    } catch (e) {
      console.error("AI Brief Error:", e);
      alert("AI Analysis is temporarily offline.");
    } finally {
      setSummarizing(false);
    }
  };

  const generateCertificate = (caseData: Case) => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    // Use the official university letterhead image you provided
    const templateUrl = "https://r.jina.ai/i/0582046554b341f2987a070119e7a83d";

    // 1. Draw the Background Template
    doc.addImage(templateUrl, 'PNG', 0, 0, 210, 297);

    // 2. Overlay Dynamic Date
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor("#000000");
    const date = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    doc.text(date, 52, 72); // Positioned next to "Date:" field in template

    // 3. Overlay Final Directive (The core message)
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    const directive = caseData.finalDirective || "This case has been officially resolved following a formal judicial review.";
    const splitDirective = doc.splitTextToSize(directive, 150);
    doc.text(splitDirective, 30, 105); // Positioned under [TYPE YOUR OFFICIAL LETTER CONTENT]

    // 4. Case Metadata (In the "Additional Paragraphs" section)
    doc.setFont("helvetica", "bold");
    doc.text("JUDICIAL REFERENCE DATA:", 30, 175);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Docket ID: ${caseData.id.toUpperCase()}`, 30, 182);
    doc.text(`Subject: ${caseData.title}`, 30, 189);
    doc.text(`Petitioner: ${caseData.petitionerName}`, 30, 196);
    doc.text(`Counterparty: ${caseData.respondentName || 'Unspecified'}`, 30, 203);

    // 5. Official Attribution (Bottom)
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("REGISTRAR, STUDENT JUDICIAL BODY", 105, 260, { align: "center" });

    doc.save(`Official_Directive_${caseData.id.slice(0, 8)}.pdf`);
  };

  useEffect(() => {
    if (initialCaseId && cases.length > 0) {
      const found = cases.find(c => c.id === initialCaseId);
      if (found) setSelectedCase(found);
    }
  }, [initialCaseId, cases]);

  const handleCloseModal = () => {
    setSelectedCase(null);
    setAiBrief(null);
    if (onModalClose) onModalClose();
  };

  useEffect(() => {
    const casesRef = collection(db, 'cases');
    const summonsRef = collection(db, 'summons');
    const qCases = user.role === 'petitioner'
      ? query(casesRef, where('petitionerId', '==', user.uid), orderBy('filedAt', 'desc'))
      : query(casesRef, orderBy('filedAt', 'desc'));

    const unsubscribeCases = onSnapshot(qCases, (snapshot) => {
      const casesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Case[];
      setCases(casesData);
      setLoading(false);

      // Sync selected case if modal is open to reflect remote deletions or updates
      if (selectedCase) {
        const updated = casesData.find(c => c.id === selectedCase.id);
        if (!updated) {
          setSelectedCase(null); // Case was deleted on server
        } else {
          setSelectedCase(updated);
        }
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'cases');
      setLoading(false);
    });

    const qSummons = (user.role === 'judge' || user.role === 'court_clerk')
      ? query(summonsRef)
      : query(summonsRef, where('recipientEmail', '==', user.email));

    const unsubscribeSummons = onSnapshot(qSummons, (snapshot) => setSummonsCount(snapshot.size), (error) => {
      console.warn("Summons count sync issue:", error);
    });
    return () => { unsubscribeCases(); unsubscribeSummons(); };
  }, [user]);

  const filteredCases = cases.filter(c => 
    c.title.toLowerCase().includes(filter.toLowerCase()) || 
    c.id.toLowerCase().includes(filter.toLowerCase())
  );

  const stats = {
    total: cases.length,
    pending: cases.filter(c => c.status === 'pending' || c.status === 'reviewing').length,
    resolved: cases.filter(c => c.status === 'resolved').length,
    summons: summonsCount
  };

  const updateCaseStatus = async (caseId: string, newStatus: string) => {
    if (Capacitor.isNativePlatform() && (newStatus === 'resolved' || newStatus === 'dismissed')) {
      try {
        const result = await NativeBiometric.isAvailable();
        if (result.isAvailable) {
          await NativeBiometric.verifyIdentity({
            reason: "Judicial Authorization Required",
            title: "Authorize Legal Ruling",
            subtitle: "Verify identity to commit this decision.",
            description: "Scan fingerprint/FaceID to proceed.",
          });
        }
      } catch (e) { return; }
    }

    try {
      const caseRef = doc(db, 'cases', caseId);
      const updateData: any = { status: newStatus, updatedAt: serverTimestamp() };
      if (newStatus === 'resolved' && directiveText.trim()) updateData.finalDirective = directiveText.trim();
      await updateDoc(caseRef, updateData);

      if (selectedCase && selectedCase.id === caseId) setSelectedCase({ ...selectedCase, status: newStatus as any, finalDirective: updateData.finalDirective });
      setShowDirectiveInput(false);
      setDirectiveText('');
    } catch (error) { handleFirestoreError(error, OperationType.UPDATE, `cases/${caseId}`); }
  };

  const addDeliberation = async (caseId: string, text: string) => {
    if (!text.trim()) return;
    try {
      const caseRef = doc(db, 'cases', caseId);
      const newNote = { author: user.displayName, role: user.role, text: text.trim(), timestamp: new Date().toISOString() };
      const updatedDeliberations = [...(selectedCase as any)?.deliberations || [], newNote];
      await updateDoc(caseRef, { deliberations: updatedDeliberations });
      setSelectedCase({ ...selectedCase, deliberations: updatedDeliberations } as any);
    } catch (error) { handleFirestoreError(error, OperationType.UPDATE, `cases/${caseId}`); }
  };

  const scheduleHearing = async (caseId: string, dateStr: string) => {
    try {
      const caseRef = doc(db, 'cases', caseId);
      await updateDoc(caseRef, { hearingDate: dateStr, status: 'hearing', updatedAt: serverTimestamp() });
      if (selectedCase) setSelectedCase({ ...selectedCase, hearingDate: dateStr, status: 'hearing' } as any);
    } catch (error) { handleFirestoreError(error, OperationType.UPDATE, `cases/${caseId}`); }
  };

  return (
    <div className="space-y-12">
      {/* Dynamic Dashboard Header */}
      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest font-mono">System Terminal</h2>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <h1 className="text-5xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">
            {user.role === 'petitioner' ? 'Legal Portfolio' : 'Board Docket'}
          </h1>
          <div className="flex items-center gap-2 bg-white dark:bg-slate-900 p-1 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
            <input
              type="text"
              placeholder="Search sequence..."
              className="bg-transparent pl-4 pr-2 py-2 text-sm outline-none font-bold min-w-[200px] text-slate-900 dark:text-white"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
            <div className="bg-slate-50 dark:bg-slate-800 p-2 rounded-xl text-slate-400">
              <Search size={18} />
            </div>
          </div>
        </div>
      </div>

      {/* Metrics Grid - Improved responsiveness */}
      <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <StatCard label="DOCKET SIZE" value={stats.total} icon={<FileText />} color="text-slate-900 dark:text-white" />
        <StatCard label="PENDING REVIEW" value={stats.pending} icon={<Clock />} color="text-emerald-600 dark:text-emerald-400" />
        <StatCard label="SUMMONS" value={stats.summons} icon={<Bell />} color="text-blue-600 dark:text-blue-400" />
        <StatCard label="RESOLUTIONS" value={stats.resolved} icon={<CheckCircle2 />} color="text-emerald-600 dark:text-emerald-400" />
      </div>

      {/* Modern List View */}
      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-colors">
        <div className="grid grid-cols-1 divide-y divide-slate-100 dark:divide-slate-800">
          {loading ? (
            <div className="p-20 text-center text-slate-400 font-bold uppercase tracking-widest text-xs animate-pulse">Syncing Judicial Ledger...</div>
          ) : filteredCases.length > 0 ? (
            filteredCases.map((caseItem) => (
              <CaseRow key={caseItem.id} caseItem={caseItem} onClick={() => setSelectedCase(caseItem)} />
            ))
          ) : (
            <div className="p-32 text-center">
              <Archive size={48} className="mx-auto text-slate-200 dark:text-slate-700 mb-4" />
              <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No Records Found</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal - Professional Drawer Style */}
      {selectedCase && (
        <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-0 sm:p-8">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={handleCloseModal} className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm" />
          <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 30, stiffness: 300 }} className="relative bg-white dark:bg-slate-900 w-full max-w-4xl sm:rounded-[2.5rem] rounded-t-[2.5rem] shadow-2xl flex flex-col max-h-[94vh] overflow-hidden border border-slate-200 dark:border-slate-800 transition-colors">
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <div className="p-8 sm:p-16">
                <div className="flex justify-between items-start mb-12">
                  <div>
                    <div className="flex items-center gap-3 mb-4">
                      <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase border-2 ${
                        selectedCase.status === 'resolved' ? 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800' : 'bg-slate-50 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700'
                      }`}>
                        {selectedCase.status}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 uppercase tracking-widest">ID: {selectedCase.id}</span>
                    </div>
                    <h3 className="text-4xl sm:text-5xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none">{selectedCase.title}</h3>
                  </div>
                  <div className="flex gap-2">
                    {(user.role === 'judge' || user.role === 'court_clerk') && (
                      <button onClick={() => getAiBrief(selectedCase)} disabled={summarizing} className="p-3 bg-emerald-600 text-white rounded-2xl shadow-lg shadow-emerald-900/20 active:scale-95 disabled:opacity-50">
                        {summarizing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles size={20} />}
                      </button>
                    )}
                    <button onClick={handleCloseModal} className="p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"><X size={24} /></button>
                  </div>
                </div>

                {aiBrief && (
                  <div className="mb-12 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900 rounded-3xl p-8">
                    <div className="flex items-center gap-2 mb-4 text-emerald-600 dark:text-emerald-400">
                      <Sparkles size={18} />
                      <h4 className="text-[10px] font-black uppercase tracking-widest">AI Judicial Assistant</h4>
                    </div>
                    <div className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed whitespace-pre-wrap font-medium">{aiBrief}</div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-16">
                  <div className="space-y-4">
                    <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Parties Involved</h4>
                    <div className="space-y-3">
                      <div className="p-5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                        <p className="text-[9px] font-bold text-emerald-500 uppercase mb-1">Petitioner Entity</p>
                        <p className="font-black text-slate-900 dark:text-white">{selectedCase.petitionerName}</p>
                      </div>
                      <div className="p-5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                        <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Respondent Party</p>
                        <p className="font-black text-slate-900 dark:text-white">{selectedCase.respondentName || 'Unspecified'}</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Temporal Data</h4>
                    <div className="p-8 bg-slate-900 dark:bg-slate-950 rounded-3xl text-white border border-slate-800 dark:border-slate-900 shadow-xl space-y-4">
                      <div className="flex justify-between border-b border-white/5 pb-3">
                        <span className="text-[10px] font-bold text-slate-500 uppercase">Filing Date</span>
                        <span className="text-[10px] font-mono">{formatTimestamp(selectedCase.filedAt)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[10px] font-bold text-slate-500 uppercase">Last Activity</span>
                        <span className="text-[10px] font-mono text-emerald-400">{formatTimestamp(selectedCase.updatedAt, 'time')}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 mb-16">
                  <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Petition Narrative</h4>
                  <div className="p-10 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[2rem] text-slate-700 dark:text-slate-300 text-lg leading-relaxed italic font-medium transition-colors">
                    {selectedCase.description}
                  </div>
                </div>

                {selectedCase.finalDirective && (
                  <div className="mb-16 bg-emerald-50 dark:bg-emerald-900/20 border-2 border-emerald-500/20 rounded-[1.5rem] p-8 relative overflow-hidden group">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                        <ShieldCheck size={20} />
                        <h4 className="text-[10px] font-black uppercase tracking-widest">Official Judicial Directive</h4>
                      </div>
                      <button
                        onClick={() => generateCertificate(selectedCase)}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-900/20 active:scale-95"
                      >
                        <Download size={14} />
                        Download Ruling
                      </button>
                    </div>
                    <div className="text-slate-800 dark:text-slate-200 text-sm leading-relaxed font-bold italic">"{selectedCase.finalDirective}"</div>
                  </div>
                )}
              </div>
            </div>

            {(user.role === 'judge' || user.role === 'court_clerk') && selectedCase.status !== 'resolved' && (
              <div className="p-8 bg-slate-950 border-t border-white/5 flex flex-col sm:flex-row gap-4">
                <AnimatePresence>
                  {showDirectiveInput ? (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="flex-1 space-y-4 pt-4"
                    >
                      <div className="flex items-center justify-between">
                        <label className="block text-[10px] font-black text-indigo-400 uppercase tracking-widest">Final Directive Text</label>
                        <span className="text-[9px] text-white/30 italic">Visible to all parties upon resolution</span>
                      </div>
                      <textarea
                        autoFocus
                        placeholder="Provide clear instructions or the final verdict for the petitioner and respondent..."
                        className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-sm text-white outline-none focus:ring-2 focus:ring-emerald-500/50 min-h-[120px] resize-none placeholder:text-white/20"
                        value={directiveText}
                        onChange={(e) => setDirectiveText(e.target.value)}
                      />
                      <div className="flex gap-3">
                        <button
                          onClick={() => { setShowDirectiveInput(false); setDirectiveText(''); }}
                          className="px-6 py-3 bg-white/5 text-white/50 text-[10px] font-black uppercase rounded-xl hover:bg-white/10 transition-colors"
                        >
                          Abort
                        </button>
                        <button
                          disabled={!directiveText.trim()}
                          onClick={() => updateCaseStatus(selectedCase.id, 'resolved')}
                          className="flex-1 py-3 bg-emerald-600 text-white text-[10px] font-black uppercase rounded-xl shadow-lg shadow-emerald-900/40 disabled:opacity-30 disabled:cursor-not-allowed active:scale-95 transition-all"
                        >
                          Confirm & Issue Final Directive
                        </button>
                      </div>
                    </motion.div>
                  ) : (
                    <div className="flex flex-col sm:flex-row gap-4 w-full">
                      <div className="flex gap-2">
                        <StatusActionBtn
                          label="Mark Review"
                          onClick={() => updateCaseStatus(selectedCase.id, 'reviewing')}
                          active={selectedCase.status === 'reviewing'}
                        />
                        <div className="relative group">
                          <StatusActionBtn
                            label="Schedule Hearing"
                            onClick={() => {}}
                            active={selectedCase.status === 'hearing'}
                          />
                          <input
                            type="datetime-local"
                            className="absolute inset-0 opacity-0 cursor-pointer"
                            onChange={(e) => scheduleHearing(selectedCase.id, e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="flex-1 flex gap-3">
                        <button
                          onClick={() => setShowDirectiveInput(true)}
                          className="flex-1 py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-emerald-900/40 hover:bg-emerald-500 active:scale-95 transition-all"
                        >
                          Authorize Resolution
                        </button>
                        <button
                          onClick={() => updateCaseStatus(selectedCase.id, 'dismissed')}
                          className="px-6 py-4 bg-white/5 text-white/40 rounded-2xl font-black uppercase tracking-widest text-[10px] border border-white/10 hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/50 transition-all active:scale-95"
                        >
                          Dismiss
                        </button>
                      </div>
                    </div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, icon, color }: any) {
  return (
    <div className="bg-white dark:bg-slate-900 p-5 sm:p-8 rounded-[1.5rem] sm:rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm relative group hover:border-emerald-500/50 transition-all">
      <div className="flex justify-between items-center sm:items-start gap-2">
        <div className="min-w-0">
          <p className="text-[8px] sm:text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.1em] sm:tracking-[0.2em] mb-1 sm:mb-2 truncate">{label}</p>
          <p className={`text-2xl sm:text-4xl font-black ${color} tracking-tighter leading-none`}>{value}</p>
        </div>
        <div className="p-2.5 sm:p-4 bg-slate-50 dark:bg-slate-800 rounded-xl sm:rounded-2xl text-slate-400 group-hover:text-emerald-600 transition-colors shrink-0">
          {React.cloneElement(icon as React.ReactElement, { size: 20 })}
        </div>
      </div>
    </div>
  );
}

function CaseRow({ caseItem, onClick }: any) {
  return (
    <div onClick={onClick} className="px-5 sm:px-10 py-6 sm:py-8 flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6 hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition-all group">
      <div className="flex items-center gap-4 sm:gap-6 flex-1 min-w-0">
        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-emerald-600 group-hover:text-white transition-all shrink-0">
          <FileText size={18} className="sm:w-5 sm:h-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="text-sm sm:text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight group-hover:text-emerald-600 transition-colors truncate">{caseItem.title}</h4>
          <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-[8px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5 sm:mt-1">
            <span className="text-emerald-500 dark:text-emerald-400 truncate max-w-[80px] sm:max-w-none">{caseItem.petitionerName}</span>
            <span className="w-1 h-1 bg-slate-200 dark:bg-slate-700 rounded-full shrink-0" />
            <span className="font-mono">REF: {caseItem.id.slice(0, 8)}</span>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between md:justify-end gap-4 sm:gap-8 border-t md:border-none pt-3 md:pt-0 border-slate-50 dark:border-slate-800/50">
        <div className={`px-2.5 sm:px-4 py-1 sm:py-1.5 rounded-lg sm:rounded-xl text-[8px] sm:text-[9px] font-black uppercase tracking-widest border-2 ${
          caseItem.status === 'resolved' ? 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800' :
          caseItem.status === 'dismissed' ? 'bg-slate-50 text-slate-400 border-slate-200 dark:bg-slate-800 dark:border-slate-700' :
          'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700'
        }`}>
          {caseItem.status}
        </div>
        <ArrowUpRight size={18} className="text-slate-200 dark:text-slate-700 group-hover:text-slate-900 dark:group-hover:text-white transition-colors" />
      </div>
    </div>
  );
}
