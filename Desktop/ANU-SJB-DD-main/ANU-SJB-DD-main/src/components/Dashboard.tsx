import React, { useEffect, useState } from 'react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, where, onSnapshot, orderBy, Timestamp, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { Clock, CheckCircle2, AlertCircle, ChevronRight, Search, FileText, Scale, Bell, ShieldCheck, Archive, X, Download, Sparkles, Wand2, Loader2, Send, ExternalLink, Paperclip, Calendar } from 'lucide-react';
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
      // Automatic detection: works on Localhost, IP, and Render/Netlify
      const serverUrl = window.location.origin;

      const response = await fetch(`${serverUrl}/api/summarize-case`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: caseData.description, title: caseData.title })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server responded with ${response.status}`);
      }

      const data = await response.json();
      setAiBrief(data.summary);
    } catch (e) {
      console.error("AI Brief Error:", e);
      alert(`AI Assistant Error: ${e instanceof Error ? e.message : 'Connection failed'}. \n\nEnsure your computer and phone are on the same Wi-Fi.`);
    } finally {
      setSummarizing(false);
    }
  };

  const generateCertificate = (caseData: Case) => {
    const doc = new jsPDF();
    const primaryColor = "#4f46e5"; // Indigo-600
    const secondaryColor = "#0f172a"; // Slate-900

    // Header
    doc.setFillColor(secondaryColor);
    doc.rect(0, 0, 210, 40, 'F');

    doc.setTextColor("#ffffff");
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text("ANU SJB DOCKET", 105, 20, { align: "center" });

    doc.setFontSize(10);
    doc.text("OFFICIAL JUDICIAL RESOLUTION CERTIFICATE", 105, 30, { align: "center" });

    // Border
    doc.setDrawColor(primaryColor);
    doc.setLineWidth(1);
    doc.rect(10, 50, 190, 230);

    // Content
    doc.setTextColor(secondaryColor);
    doc.setFontSize(14);
    doc.text("CASE IDENTIFICATION", 20, 70);

    doc.setDrawColor("#e2e8f0");
    doc.line(20, 72, 190, 72);

    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text(`Title: ${caseData.title.toUpperCase()}`, 20, 85);
    doc.text(`Reference ID: ${caseData.id}`, 20, 95);
    doc.text(`Filing Date: ${caseData.filedAt ? (caseData.filedAt.toDate ? caseData.filedAt.toDate().toLocaleDateString() : new Date(caseData.filedAt as any).toLocaleDateString()) : 'N/A'}`, 20, 105);

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("PARTIES INVOLVED", 20, 125);
    doc.line(20, 127, 190, 127);

    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text(`Petitioner: ${caseData.petitionerName}`, 20, 140);
    doc.text(`Respondent: ${caseData.respondentName || 'UNSPECIFIED'}`, 20, 150);

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("JUDICIAL DETERMINATION", 20, 170);
    doc.line(20, 172, 190, 172);

    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    const splitDescription = doc.splitTextToSize(caseData.description, 170);
    doc.text(splitDescription, 20, 185);

    // Status Stamp
    doc.setDrawColor(primaryColor);
    doc.setLineWidth(2);
    doc.rect(140, 230, 50, 20);
    doc.setTextColor(primaryColor);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("RESOLVED", 165, 243, { align: "center" });

    // Footer
    doc.setTextColor("#94a3b8");
    doc.setFontSize(8);
    const date = new Date().toLocaleString();
    doc.text(`Certified via ANU SJB DOCKET Digital Protocol on ${date}`, 105, 275, { align: "center" });
    doc.text("This document is a digital representation of an immutable blockchain-verified record.", 105, 280, { align: "center" });

    doc.save(`Resolution_${caseData.id.slice(0, 8)}.pdf`);
  };

  useEffect(() => {
    if (initialCaseId && cases.length > 0) {
      const found = cases.find(c => c.id === initialCaseId);
      if (found) {
        setSelectedCase(found);
      }
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
    
    // Cases Query
    const qCases = user.role === 'petitioner' 
      ? query(casesRef, where('petitionerId', '==', user.uid), orderBy('filedAt', 'desc'))
      : query(casesRef, orderBy('filedAt', 'desc'));

    const unsubscribeCases = onSnapshot(qCases, (snapshot) => {
      const casesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Case[];
      setCases(casesData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'cases');
      setLoading(false);
    });

    // Summons Query for Stats
    const qSummons = (user.role === 'judge' || user.role === 'court_clerk')
      ? query(summonsRef)
      : query(summonsRef, where('recipientEmail', '==', user.email));

    const unsubscribeSummons = onSnapshot(qSummons, (snapshot) => {
      setSummonsCount(snapshot.size);
    });

    return () => {
      unsubscribeCases();
      unsubscribeSummons();
    };
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
    // Biometric Security for final judicial actions
    if (Capacitor.isNativePlatform() && (newStatus === 'resolved' || newStatus === 'dismissed')) {
      try {
        const result = await NativeBiometric.isAvailable();
        if (result.isAvailable) {
          await NativeBiometric.verifyIdentity({
            reason: "Judicial Authorization Required",
            title: "Authorize Legal Ruling",
            subtitle: "Please verify your identity to commit this decision to the docket.",
            description: "Scan your fingerprint or use FaceID to proceed.",
          });
        }
      } catch (error) {
        console.warn("Biometric verification failed or canceled:", error);
        alert("Judicial authorization failed. Record was not committed.");
        return; // Stop the update
      }
    }

    try {
      const caseRef = doc(db, 'cases', caseId);
      const updateData: any = {
        status: newStatus,
        updatedAt: serverTimestamp()
      };

      if (newStatus === 'resolved' && directiveText.trim()) {
        updateData.finalDirective = directiveText.trim();
      }

      await updateDoc(caseRef, updateData);

      // Notify parties of the resolution
      if (newStatus === 'resolved' || newStatus === 'dismissed') {
        const parties = [
          { name: selectedCase?.petitionerName, email: selectedCase?.petitionerEmail },
          { name: selectedCase?.respondentName, email: (selectedCase as any).respondentEmail }
        ].filter(p => p.email);

        for (const party of parties) {
          fetch('/api/notify-summon', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              recipientName: party.name,
              recipientEmail: party.email,
              caseTitle: `FINAL RULING: ${selectedCase?.title}`,
              caseId: selectedCase?.id,
              notes: newStatus === 'resolved' ? directiveText : "This case has been dismissed by the Judicial Board."
            })
          });
        }
      }

      // Update local state for immediate visual confirmation
      if (selectedCase && selectedCase.id === caseId) {
        setSelectedCase({ ...selectedCase, status: newStatus as any, finalDirective: updateData.finalDirective });
      }
      setShowDirectiveInput(false);
      setDirectiveText('');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `cases/${caseId}`);
    }
  };

  const addDeliberation = async (caseId: string, text: string) => {
    if (!text.trim()) return;
    try {
      const caseRef = doc(db, 'cases', caseId);
      const newNote = {
        author: user.displayName,
        role: user.role,
        text: text.trim(),
        timestamp: new Date().toISOString()
      };

      const currentDeliberations = (selectedCase as any)?.deliberations || [];
      const updatedDeliberations = [...currentDeliberations, newNote];

      await updateDoc(caseRef, { deliberations: updatedDeliberations });
      setSelectedCase({ ...selectedCase, deliberations: updatedDeliberations } as any);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `cases/${caseId}`);
    }
  };

  const scheduleHearing = async (caseId: string, dateStr: string) => {
    try {
      const caseRef = doc(db, 'cases', caseId);
      await updateDoc(caseRef, {
        hearingDate: dateStr,
        status: 'hearing',
        updatedAt: serverTimestamp()
      });
      if (selectedCase) {
        setSelectedCase({ ...selectedCase, hearingDate: dateStr, status: 'hearing' } as any);
      }

      // Trigger a notification for the hearing
      if (selectedCase) {
        fetch('/api/notify-summon', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recipientName: selectedCase.petitionerName,
            recipientEmail: (selectedCase as any).petitionerEmail || '',
            caseTitle: `HEARING SCHEDULED: ${selectedCase.title}`,
            caseId: selectedCase.id
          })
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `cases/${caseId}`);
    }
  };

  return (
    <div className="space-y-10">
      {/* Role Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase tracking-widest border border-indigo-100 dark:border-indigo-800 mb-3">
            <ShieldCheck size={12} />
            {user.role.replace('_', ' ')} Terminal
          </div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight uppercase">
            {user.role === 'petitioner' ? 'My Legal Portfolio' : 'Judicial Oversight Dashboard'}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium mt-1">
            {user.role === 'petitioner' 
              ? 'Monitoring your active judicial petitions and summons.' 
              : 'Managing the judicial docket and case progression for ANU Student Body.'}
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full md:w-auto">
          <StatCard label="DOCKET SIZE" value={stats.total} icon={<FileText size={18} />} color="text-slate-900 dark:text-white" bg="bg-white dark:bg-slate-900" trend="Official" />
          <StatCard label="IN REVIEW" value={stats.pending} icon={<Clock size={18} />} color="text-indigo-600 dark:text-indigo-400" bg="bg-indigo-50 dark:bg-indigo-900/20" trend="Active" />
          <StatCard label="SUMMONS" value={stats.summons} icon={<Bell size={18} />} color="text-blue-600 dark:text-blue-400" bg="bg-blue-50 dark:bg-blue-900/20" trend="Dispatched" />
          <StatCard label="RESOLVED" value={stats.resolved} icon={<CheckCircle2 size={18} />} color="text-emerald-600 dark:text-emerald-400" bg="bg-emerald-50 dark:bg-emerald-900/20" trend="Terminated" />
        </div>
      </div>

      {/* Case Browser Section */}
      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-colors">
        <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-900/50">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white uppercase tracking-tight">Case Registry</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">Filter and browse active legal proceedings</p>
          </div>
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
            <input
              type="text"
              placeholder="Case title or ID..."
              className="pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl w-full md:w-64 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm font-medium text-slate-900 dark:text-white"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
          </div>
        </div>

        <div className="p-2">
          <div className="grid grid-cols-1 gap-1">
            {loading ? (
              Array(3).fill(0).map((_, i) => (
                <div key={i} className="h-20 bg-slate-50 dark:bg-slate-800 animate-pulse rounded-2xl m-2" />
              ))
            ) : filteredCases.length > 0 ? (
              filteredCases.map((caseItem) => (
                <CaseCard key={caseItem.id} caseItem={caseItem} onClick={() => setSelectedCase(caseItem)} />
              ))
            ) : (
              <div className="p-20 text-center">
                <div className="bg-slate-50 dark:bg-slate-800 w-20 h-20 rounded-[2rem] flex items-center justify-center mx-auto mb-4 border border-slate-100 dark:border-slate-700">
                  <Archive className="text-slate-300 dark:text-slate-600 w-10 h-10" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white uppercase">No Records Found</h3>
                <p className="text-slate-400 dark:text-slate-500 max-w-xs mx-auto mt-2 font-medium">
                  The judicial portal currently contains no petitions matching your clearance or filters.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Case Details Modal */}
      {selectedCase && (
        <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-0 sm:p-6">
          <div
            onClick={handleCloseModal}
            className="fixed inset-0 bg-slate-900/90 transition-opacity"
          />
          <motion.div 
            initial={{ opacity: 0, y: "100%" }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative bg-white dark:bg-slate-900 w-full max-w-2xl sm:rounded-[2rem] rounded-t-[2rem] shadow-2xl border-x border-t sm:border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh] sm:max-h-[85vh]"
          >
            {/* Drag Handle for Mobile */}
            <div className="sm:hidden flex justify-center p-3 shrink-0">
              <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full" />
            </div>

            {/* Header - Fixed at top of modal */}
            <div className="px-6 py-4 sm:px-10 sm:py-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-white dark:bg-slate-900 sticky top-0 z-10 sm:rounded-t-[2rem]">
              <div className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border shadow-sm ${
                selectedCase.status === 'resolved' ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800' :
                selectedCase.status === 'dismissed' ? 'bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700' :
                'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-800'
              }`}>
                {selectedCase.status || 'Syncing'}
              </div>
              <div className="flex items-center gap-2">
                {(user.role === 'judge' || user.role === 'court_clerk') && (
                  <button
                    onClick={() => getAiBrief(selectedCase)}
                    disabled={summarizing}
                    className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all disabled:opacity-50"
                  >
                    {summarizing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 size={12} />}
                    <span className="hidden xs:inline">AI Analysis</span>
                  </button>
                )}
                <button
                  onClick={handleCloseModal}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all text-slate-400"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Content - Scrollable area */}
            <div className="flex-1 overflow-y-auto custom-scrollbar dark:bg-slate-900">
              <div className="p-6 sm:p-10 space-y-8">
                {aiBrief && (
                  <div className="mb-6 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 rounded-2xl p-5">
                    <div className="flex items-center gap-2 mb-3 text-indigo-600 dark:text-indigo-400">
                      <Sparkles size={16} />
                      <h4 className="text-[10px] font-black uppercase tracking-widest">AI Judicial Summary</h4>
                    </div>
                    <div className="text-slate-700 dark:text-slate-300 text-xs font-medium leading-relaxed whitespace-pre-wrap">
                      {aiBrief}
                    </div>
                  </div>
                )}

                <div className="space-y-6">
                  <div>
                    <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight leading-tight mb-2">
                      {selectedCase.title || 'Untitled Case'}
                    </h3>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[8px] font-bold text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 px-2 py-0.5 rounded uppercase font-mono">
                        REF: {selectedCase.id.slice(0, 16)}
                      </span>
                      {selectedCase.status === 'resolved' && (
                        <button
                          onClick={() => generateCertificate(selectedCase)}
                          className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-600 text-white text-[8px] font-bold uppercase rounded shadow-sm"
                        >
                          <Download size={10} />
                          Certificate
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                      <p className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-0.5">Petitioner</p>
                      <p className="text-sm font-bold text-slate-900 dark:text-white">{selectedCase.petitionerName || 'Unknown'}</p>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                      <p className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-0.5">Respondent</p>
                      <p className="text-sm font-bold text-slate-900 dark:text-white">{selectedCase.respondentName || 'Unspecified'}</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Judicial Narrative</p>
                    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-5 rounded-xl text-slate-700 dark:text-slate-300 text-sm leading-relaxed italic font-medium">
                      {selectedCase.description || 'No description provided.'}
                    </div>
                  </div>

                  {selectedCase.evidence && selectedCase.evidence.length > 0 && (
                    <div>
                      <p className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">Submitted Evidence Artifacts</p>
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                        {selectedCase.evidence.map((url, i) => (
                          <a
                            key={i}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 hover:border-indigo-400 transition-all group"
                          >
                            {url.includes('.pdf') ? (
                              <div className="w-full h-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                                <Paperclip size={24} />
                              </div>
                            ) : (
                              <img src={url} alt="Artifact" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                            )}
                            <div className="absolute inset-0 bg-indigo-600/0 group-hover:bg-indigo-600/20 transition-colors flex items-center justify-center">
                              <ExternalLink size={16} className="text-white opacity-0 group-hover:opacity-100 scale-50 group-hover:scale-100 transition-all" />
                            </div>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-4 text-[8px] font-black uppercase text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-1.5">
                      <Clock size={12} className="text-slate-300 dark:text-slate-600" />
                      FILED: {formatTimestamp(selectedCase.filedAt, 'date')}
                    </div>
                    <div className="hidden sm:block w-px h-3 bg-slate-200 dark:bg-slate-700" />
                    {selectedCase.hearingDate && (
                      <>
                        <div className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400">
                          <Calendar size={12} />
                          HEARING: {new Date(selectedCase.hearingDate).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                        </div>
                        <a
                          href={`https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent('ANU SJB HEARING: ' + selectedCase.title)}&dates=${new Date(selectedCase.hearingDate).toISOString().replace(/-|:|\.\d\d\d/g, "")}/${new Date(new Date(selectedCase.hearingDate).getTime() + 3600000).toISOString().replace(/-|:|\.\d\d\d/g, "")}&details=${encodeURIComponent('Judicial Hearing for Case ID: ' + selectedCase.id)}&location=Judicial+Board+Chambers`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-indigo-600 text-white px-2 py-1 rounded-md hover:bg-indigo-700 transition-all ml-auto flex items-center gap-1"
                        >
                          <Calendar size={10} /> Add
                        </a>
                      </>
                    )}
                    <div className="hidden sm:block w-px h-3 bg-slate-200 dark:bg-slate-700" />
                    <div className="flex items-center gap-1.5">
                      <AlertCircle size={12} className="text-slate-300 dark:text-slate-600" />
                      UPDATED: {formatTimestamp(selectedCase.updatedAt, 'time')}
                    </div>
                  </div>

                  {selectedCase.finalDirective && (
                    <div className="bg-emerald-50 dark:bg-emerald-900/20 border-2 border-emerald-500/20 rounded-[1.5rem] p-6 shadow-sm shadow-emerald-100 dark:shadow-none">
                      <div className="flex items-center gap-2 mb-4 text-emerald-600 dark:text-emerald-400">
                        <ShieldCheck size={20} />
                        <h4 className="text-[10px] font-black uppercase tracking-widest">Official Judicial Directive</h4>
                      </div>
                      <div className="text-slate-800 dark:text-slate-200 text-sm leading-relaxed font-bold italic">
                        "{selectedCase.finalDirective}"
                      </div>
                      <div className="mt-4 pt-4 border-t border-emerald-500/10 flex justify-between items-center">
                        <span className="text-[8px] font-black text-emerald-600/60 uppercase tracking-widest">Legally Binding Decision</span>
                        <span className="text-[8px] font-mono text-emerald-600/40">{new Date(selectedCase.updatedAt?.toDate() || Date.now()).toLocaleDateString()}</span>
                      </div>
                    </div>
                  )}

                  {/* Private Judicial Deliberations */}
                  {(user.role === 'judge' || user.role === 'court_clerk') && (
                    <div className="bg-slate-900 dark:bg-slate-950 rounded-[1.5rem] p-6 text-white border border-slate-800 dark:border-slate-900 shadow-xl">
                      <div className="flex items-center gap-2 mb-4 text-indigo-400">
                        <Scale size={16} />
                        <h4 className="text-[10px] font-black uppercase tracking-widest">Judicial Workspace (Private)</h4>
                      </div>

                      <div className="space-y-3 mb-6 max-h-48 overflow-y-auto custom-scrollbar">
                        {((selectedCase as any).deliberations || []).map((note: any, i: number) => (
                          <div key={i} className="bg-white/5 rounded-lg p-3 border border-white/5">
                            <div className="flex justify-between items-start mb-1">
                              <span className="text-[8px] font-bold text-indigo-300 uppercase">{note.author} ({note.role})</span>
                              <span className="text-[7px] text-white/30 font-mono">{new Date(note.timestamp).toLocaleTimeString()}</span>
                            </div>
                            <p className="text-xs text-white/80 leading-snug">{note.text}</p>
                          </div>
                        ))}
                        {!(selectedCase as any).deliberations?.length && (
                          <p className="text-[10px] text-white/20 italic text-center py-4">No internal deliberations recorded.</p>
                        )}
                      </div>

                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Add private note..."
                          className="w-full bg-white/10 border border-white/10 rounded-xl pl-4 pr-12 py-3 text-xs text-white outline-none focus:ring-2 focus:ring-indigo-500/50"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              addDeliberation(selectedCase.id, (e.target as HTMLInputElement).value);
                              (e.target as HTMLInputElement).value = '';
                            }
                          }}
                        />
                        <button className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-indigo-400 hover:text-white transition-colors">
                          <Send size={14} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Actions - Fixed at bottom of modal */}
            {(user.role === 'judge' || user.role === 'court_clerk') && selectedCase.status !== 'resolved' && selectedCase.status !== 'dismissed' && (
              <div className="p-5 sm:p-6 bg-slate-900 border-t border-slate-800 shrink-0 sm:rounded-b-[2rem]">
                <AnimatePresence>
                  {showDirectiveInput && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mb-4 space-y-3"
                    >
                      <label className="block text-[8px] font-black text-indigo-400 uppercase tracking-widest">Final Directive Text</label>
                      <textarea
                        autoFocus
                        placeholder="Type the final ruling and instructions for the parties..."
                        className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-xs text-white outline-none focus:ring-2 focus:ring-emerald-500/50 min-h-[100px] resize-none"
                        value={directiveText}
                        onChange={(e) => setDirectiveText(e.target.value)}
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => { setShowDirectiveInput(false); setDirectiveText(''); }}
                          className="px-4 py-2 bg-white/5 text-white/50 text-[9px] font-black uppercase rounded-lg hover:bg-white/10"
                        >
                          Cancel
                        </button>
                        <button
                          disabled={!directiveText.trim()}
                          onClick={() => updateCaseStatus(selectedCase.id, 'resolved')}
                          className="flex-1 py-2 bg-emerald-600 text-white text-[9px] font-black uppercase rounded-lg shadow-lg shadow-emerald-900/40 disabled:opacity-50"
                        >
                          Confirm & Issue Directive
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {!showDirectiveInput && (
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col sm:flex-row gap-3">
                      <div className="flex gap-2 w-full sm:w-auto">
                        <StatusActionBtn
                          label="Review"
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
                      <div className="flex-1 flex gap-2">
                        <button
                          onClick={() => setShowDirectiveInput(true)}
                          className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-bold uppercase text-[9px] tracking-wider transition-all active:scale-95 shadow-lg shadow-emerald-900/20"
                        >
                          Authorize Resolution
                        </button>
                        <button
                          onClick={() => updateCaseStatus(selectedCase.id, 'dismissed')}
                          className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold uppercase text-[9px] tracking-wider border border-white/10 transition-all active:scale-95"
                        >
                          Dismiss
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </div>
  );
}

function StatusActionBtn({ label, onClick, active, variant = 'default' }: any) {
  const styles = {
    default: active ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-500',
    success: 'bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-600 hover:text-white',
    danger: 'bg-red-50 text-red-600 border-red-100 hover:bg-red-600 hover:text-white',
  };

  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider border transition-all ${styles[variant as keyof typeof styles]}`}
    >
      {label}
    </button>
  );
}

function StatCard({ label, value, icon, color, bg, trend }: any) {
  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group hover:shadow-xl hover:border-indigo-100 dark:hover:border-indigo-900 transition-all">
      <div className="flex items-start justify-between relative z-10">
        <div>
          <div className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-1">{label}</div>
          <div className={`text-3xl font-black ${color} tracking-tighter leading-none`}>{value}</div>
          {trend && <div className="text-[10px] font-bold text-slate-300 dark:text-slate-700 mt-2 uppercase tracking-widest">{trend}</div>}
        </div>
        <div className={`${bg} ${color} p-4 rounded-2xl shadow-lg ring-1 ring-slate-100 dark:ring-slate-800 transition-transform group-hover:scale-110`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

function CaseCard({ caseItem, onClick }: any) {
  const statusStyles: Record<string, string> = {
    pending: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800',
    reviewing: 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800',
    hearing: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800',
    resolved: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
    dismissed: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700',
  };

  const StatusIconMap: Record<string, any> = {
    pending: Clock,
    reviewing: Search,
    hearing: Scale,
    resolved: CheckCircle2,
    dismissed: AlertCircle,
  };

  const StatusIcon = StatusIconMap[caseItem.status] || AlertCircle;

  return (
    <motion.div
      onClick={onClick}
      whileHover={{ y: -1, x: 2 }}
      className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 group transition-all hover:bg-slate-50/50 dark:hover:bg-slate-800/50 cursor-pointer"
    >
      <div className="flex items-start gap-4 flex-1">
        <div className={`p-2.5 rounded-lg border-2 ${statusStyles[caseItem.status] || statusStyles.pending} shrink-0 shadow-sm`}>
          <StatusIcon size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-3 mb-1">
            <h3 className="font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors uppercase tracking-tight text-sm">
              {caseItem.title}
            </h3>
            <span className="text-[9px] font-mono text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded shadow-sm">
              REF: {caseItem.id.slice(0, 12)}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mb-2 font-medium opacity-80">{caseItem.description}</p>
          <div className="flex items-center gap-6 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
            <span className="flex items-center gap-1.5"><FileText size={12} className="opacity-50" /> {caseItem.petitionerName}</span>
            <span className="flex items-center gap-1.5">
              <Clock size={12} className="opacity-50" />
              {caseItem.filedAt ? (caseItem.filedAt.toDate ? caseItem.filedAt.toDate().toLocaleDateString() : 'Syncing...') : 'N/A'}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between md:justify-end gap-6 border-t md:border-t-0 border-slate-100 dark:border-slate-800 pt-3 md:pt-0">
        <div className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border-2 shadow-sm ${statusStyles[caseItem.status] || statusStyles.pending}`}>
          {caseItem.status}
        </div>
        <div className="p-1.5 text-slate-300 dark:text-slate-600 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
          <ChevronRight size={18} />
        </div>
      </div>
    </motion.div>
  );
}
