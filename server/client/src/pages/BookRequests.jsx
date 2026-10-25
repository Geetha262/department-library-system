import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import bookRequestService from '../services/bookRequestService';
import departmentService from '../services/departmentService';
import { issueService } from '../services/circulationService';
import { subscribeToEvents } from '../services/socket';
import {
  FileText,
  Search,
  Check,
  X,
  Building2,
  CheckCircle2,
  AlertCircle,
  Clock,
  BookOpen,
  ArrowRight,
} from 'lucide-react';

const BookRequests = () => {
  const { user } = useAuth();
  const isStaff = ['admin', 'librarian'].includes(user?.role);

  const [requests, setRequests] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Filters
  const [selectedStatus, setSelectedStatus] = useState('Pending Approval');
  const [selectedDept, setSelectedDept] = useState('all');
  const [search, setSearch] = useState('');

  // Rejection modal
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Issue modal
  const [issuingRequest, setIssuingRequest] = useState(null);

  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      const res = await bookRequestService.getAll({
        status: selectedStatus !== 'all' ? selectedStatus : undefined,
        department: selectedDept !== 'all' ? selectedDept : undefined,
        search,
      });
      setRequests(res.data || []);
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to fetch book requests.');
    } finally {
      setLoading(false);
    }
  }, [selectedStatus, selectedDept, search]);

  useEffect(() => {
    departmentService.getAll().then((res) => setDepartments(res.data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  // Subscribe to real-time events
  useEffect(() => {
    const unsubscribe = subscribeToEvents({
      onRequestUpdated: () => {
        fetchRequests();
      },
    });
    return unsubscribe;
  }, [fetchRequests]);

  const handleApprove = async (id, bookTitle) => {
    setActionLoading(true);
    setError('');
    setSuccessMsg('');
    try {
      await bookRequestService.approve(id);
      setSuccessMsg(`Request for "${bookTitle}" approved successfully.`);
      fetchRequests();
    } catch (err) {
      setError(err.message || 'Failed to approve request.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectSubmit = async (e) => {
    e.preventDefault();
    if (!rejectingId) return;
    setActionLoading(true);
    setError('');
    setSuccessMsg('');
    try {
      await bookRequestService.reject(rejectingId, rejectionReason);
      setSuccessMsg('Request rejected.');
      setRejectingId(null);
      setRejectionReason('');
      fetchRequests();
    } catch (err) {
      setError(err.message || 'Failed to reject request.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDirectIssue = async (reqDoc) => {
    setActionLoading(true);
    setError('');
    setSuccessMsg('');
    try {
      await issueService.create({
        memberType: reqDoc.memberType,
        memberId: reqDoc.memberId?._id || reqDoc.memberId,
        bookId: reqDoc.bookId?._id || reqDoc.bookId,
      });
      setSuccessMsg(`Book "${reqDoc.bookId?.title}" issued to ${reqDoc.userId?.name}.`);
      setIssuingRequest(null);
      fetchRequests();
    } catch (err) {
      setError(err.message || 'Failed to issue book.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold mb-2">
            <FileText className="w-3.5 h-3.5" />
            <span>Circulation Management</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Student Book Requests
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Review and approve advance book borrowing requests submitted by students and faculty.
          </p>
        </div>
      </div>

      {/* Alerts */}
      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg('')} className="text-emerald-400/80 hover:text-emerald-300">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError('')} className="text-rose-400/80 hover:text-rose-300">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Status Filter Tabs */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-none">
        {['Pending Approval', 'Approved', 'Rejected', 'Issued', 'all'].map((st) => (
          <button
            key={st}
            onClick={() => setSelectedStatus(st)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition border ${
              selectedStatus === st
                ? 'bg-blue-600 border-blue-500 text-white shadow-md shadow-blue-500/20'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            {st === 'all' ? 'All Requests' : st}
          </button>
        ))}
      </div>

      {/* Search & Department Filter Bar */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Request ID..."
            className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
          />
        </div>

        <select
          value={selectedDept}
          onChange={(e) => setSelectedDept(e.target.value)}
          className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Departments</option>
          {departments.map((d) => (
            <option key={d._id} value={d._id}>
              {d.deptCode} - {d.name}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="rounded-2xl bg-slate-900/90 border border-slate-800 overflow-hidden shadow-xl">
        {loading ? (
          <div className="py-16 text-center text-slate-400">Loading requests...</div>
        ) : requests.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <FileText className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-white">No book requests found</h3>
            <p className="text-xs text-slate-400 mt-1">Try switching status tabs or search parameters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950/80 text-xs uppercase font-semibold text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">Request ID</th>
                  <th className="py-3.5 px-4">Student / Member</th>
                  <th className="py-3.5 px-4">Book Title</th>
                  <th className="py-3.5 px-4">Department</th>
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4">Status</th>
                  {isStaff && <th className="py-3.5 px-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {requests.map((item) => (
                  <tr key={item._id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-4 font-mono text-xs font-semibold text-blue-400">
                      {item.requestId}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-white">{item.userId?.name || 'Student'}</div>
                      <div className="text-xs text-slate-500">{item.userId?.email}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-white max-w-xs truncate">{item.bookId?.title || 'Book'}</div>
                      <div className="text-[11px] text-slate-500 font-mono">ISBN: {item.bookId?.isbn || '-'}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-400 text-xs font-semibold">
                        <Building2 className="w-3 h-3" />
                        <span>{item.departmentId?.deptCode || 'DEPT'}</span>
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-400">
                      {new Date(item.requestedAt || item.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                          item.status === 'Approved'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : item.status === 'Pending Approval'
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            : item.status === 'Issued'
                            ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                            : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                    {isStaff && (
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          {item.status === 'Pending Approval' && (
                            <>
                              <button
                                onClick={() => handleApprove(item._id, item.bookId?.title || '')}
                                disabled={actionLoading}
                                className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition disabled:opacity-50"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Approve</span>
                              </button>
                              <button
                                onClick={() => {
                                  setRejectingId(item._id);
                                  setRejectionReason('');
                                }}
                                disabled={actionLoading}
                                className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 border border-rose-500/30 text-xs font-semibold transition disabled:opacity-50"
                              >
                                <X className="w-3.5 h-3.5" />
                                <span>Reject</span>
                              </button>
                            </>
                          )}
                          {item.status === 'Approved' && (
                            <button
                              onClick={() => handleDirectIssue(item)}
                              disabled={actionLoading}
                              className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition disabled:opacity-50"
                            >
                              <ArrowRight className="w-3.5 h-3.5" />
                              <span>Issue Book</span>
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Reject Modal */}
      {rejectingId && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 max-w-md w-full rounded-2xl p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white">Decline Book Request</h3>
            <p className="text-xs text-slate-400">Specify reason for declining this request.</p>
            <form onSubmit={handleRejectSubmit} className="space-y-4">
              <textarea
                required
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Reason for rejection..."
                rows="3"
                className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500"
              ></textarea>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setRejectingId(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-medium hover:bg-slate-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition disabled:opacity-50"
                >
                  Confirm Reject
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookRequests;
