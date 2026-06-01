import React, { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, onSnapshot, query, updateDoc, doc } from 'firebase/firestore';
import { Users, Shield, Search, Mail, User as UserIcon, Check, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';

interface AppUser {
  uid: string;
  email: string;
  role: 'petitioner' | 'judge' | 'court_clerk';
  displayName?: string;
  studentId?: string;
}

export default function UserManagement({ currentUser }: { currentUser: any }) {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'users'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setUsers(snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() })) as AppUser[]);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users');
    });
    return () => unsubscribe();
  }, []);

  const handleRoleChange = async (userId: string, newRole: string) => {
    setUpdating(userId);
    try {
      await updateDoc(doc(db, 'users', userId), { role: newRole });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
    } finally {
      setUpdating(null);
    }
  };

  const filteredUsers = users.filter(u => 
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.studentId?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const roles = ['petitioner', 'court_clerk', 'judge'];

  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h2 className="text-sm font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest font-mono mb-2">Personnel Registry</h2>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none">Security Access</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium mt-3">Manage secure clearance levels and judicial authorizations for the board.</p>
        </div>
        <div className="relative w-full md:w-96">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Search student ID or credentials..."
            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl pl-14 pr-6 py-4 outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-bold text-sm shadow-sm text-slate-900 dark:text-white"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-colors">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-slate-800/50">
                <th className="px-10 py-6 font-black text-[10px] uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Authenticated Profile</th>
                <th className="px-10 py-6 font-black text-[10px] uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 text-right">Access Authorization Matrix</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredUsers.map((user) => (
                <tr key={user.uid} className="hover:bg-slate-50/30 dark:hover:bg-slate-800/30 transition-colors group">
                  <td className="px-10 py-8">
                    <div className="flex items-center gap-5">
                      <div className="w-14 h-14 rounded-2xl bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-800 flex items-center justify-center text-slate-300 dark:text-slate-700 group-hover:border-emerald-100 dark:group-hover:border-emerald-900 transition-all shadow-sm">
                        <UserIcon size={28} />
                      </div>
                      <div>
                        <p className="font-black text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors uppercase tracking-tight text-lg">{user.displayName || 'UNIDENTIFIED'}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-black tracking-widest bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-lg border border-emerald-100 dark:border-emerald-800">{user.studentId || 'NO ID'}</span>
                          <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1.5"><Mail size={12} className="opacity-50" /> {user.email}</span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-10 py-8">
                    <div className="flex flex-wrap gap-2 justify-end">
                      {roles.map((role) => (
                        <button
                          key={role}
                          onClick={() => handleRoleChange(user.uid, role)}
                          disabled={updating === user.uid || user.role === role}
                          className={`px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 border-2 ${
                            user.role === role 
                              ? 'bg-slate-900 dark:bg-emerald-600 text-white border-slate-900 dark:border-emerald-600 shadow-xl'
                              : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-500 hover:border-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400'
                          } disabled:opacity-50 active:scale-95`}
                        >
                          {user.role === role && <Check size={12} />}
                          {updating === user.uid && user.role !== role ? <Loader2 className="animate-spin" size={12} /> : null}
                          {role.replace('_', ' ')}
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
