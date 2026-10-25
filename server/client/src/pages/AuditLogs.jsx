import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import auditLogService from '../services/auditLogService';
import {
  ShieldCheck,
  Search,
  Filter,
  User,
  Clock,
  Globe,
  Activity,
  Layers,
  CheckCircle2,
} from 'lucide-react';

const AuditLogs = () => {
  const { user } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [selectedRole, setSelectedRole] = useState('all');

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await auditLogService.getAll({
        search,
        userRole: selectedRole !== 'all' ? selectedRole : undefined,
      });
      setLogs(res.data || []);
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to load audit logs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchLogs();
    }, 250);
    return () => clearTimeout(timer);
  }, [search, selectedRole]);

  const getActionBadge = (action) => {
    if (action.includes('Delete')) return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
    if (action.includes('Create') || action.includes('Add')) return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    if (action.includes('Issue')) return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    if (action.includes('Return') || action.includes('Fine')) return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    return 'bg-slate-800 text-slate-300 border-slate-700';
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold mb-2">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Security & Compliance</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          System Audit Trail & Logs
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Immutable event log tracking logins, book circulation, catalog modifications, and fine transactions.
        </p>
      </div>

      {/* Filters Bar */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by action, description, or user..."
            className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
          />
        </div>

        <select
          value={selectedRole}
          onChange={(e) => setSelectedRole(e.target.value)}
          className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Roles</option>
          <option value="admin">Admin</option>
          <option value="librarian">Librarian</option>
          <option value="faculty">Faculty</option>
          <option value="student">Student</option>
          <option value="system">System</option>
        </select>
      </div>

      {/* Logs Table */}
      <div className="rounded-2xl bg-slate-900/90 border border-slate-800 overflow-hidden shadow-xl">
        {loading ? (
          <div className="py-16 text-center text-slate-400">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-xs font-medium">Fetching system logs...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center">
            <ShieldCheck className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-white">No audit records found</h3>
            <p className="text-xs text-slate-400 mt-1">Actions performed in the system will automatically be logged here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950/80 text-xs uppercase font-semibold text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">Timestamp</th>
                  <th className="py-3.5 px-4">User</th>
                  <th className="py-3.5 px-4">Action</th>
                  <th className="py-3.5 px-4">Description</th>
                  <th className="py-3.5 px-4">IP Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {logs.map((log) => (
                  <tr key={log._id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-4 text-xs text-slate-400 whitespace-nowrap">
                      {new Date(log.createdAt || log.timestamp).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-xs">
                      <div className="font-semibold text-white">{log.userName || 'System'}</div>
                      <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500">
                        {log.userRole}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-lg border text-xs font-semibold ${getActionBadge(
                          log.action
                        )}`}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-300 max-w-md">
                      {log.description}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs text-slate-500">
                      {log.ipAddress || '127.0.0.1'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditLogs;
