import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { fineService } from '../services/circulationService';
import departmentService from '../services/departmentService';
import {
  ReceiptIndianRupee,
  Search,
  Building2,
  CheckCircle2,
  AlertCircle,
  X,
  CreditCard,
  Clock,
  Check,
  GraduationCap,
  Briefcase,
  Layers,
} from 'lucide-react';

const Fines = () => {
  const { user } = useAuth();
  const isStaff = ['admin', 'librarian'].includes(user?.role);

  const [finesList, setFinesList] = useState([]);
  const [stats, setStats] = useState({
    totalPendingAmount: 0,
    pendingCount: 0,
    totalPaidAmount: 0,
    paidCount: 0,
  });
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Filters
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedDept, setSelectedDept] = useState('all');
  const [payingId, setPayingId] = useState(null);
  const [paymentFine, setPaymentFine] = useState(null);
  const [paymentForm, setPaymentForm] = useState({ amount: '', paymentMethod: 'Cash', referenceNumber: '' });

  useEffect(() => {
    const fetchDepts = async () => {
      try {
        const res = await departmentService.getAll();
        setDepartments(res.data || []);
      } catch (err) {
        console.error(err);
      }
    };
    fetchDepts();
  }, []);

  const fetchFines = async () => {
    try {
      setLoading(true);
      const res = await fineService.getAll({
        paymentStatus: selectedStatus !== 'all' ? selectedStatus : undefined,
        department: selectedDept !== 'all' ? selectedDept : undefined,
      });
      setFinesList(res.data || []);
      if (res.stats) {
        setStats(res.stats);
      }
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to fetch fines.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFines();
  }, [selectedStatus, selectedDept]);

  const handlePayFine = async (id) => {
    try {
      setPayingId(id);
      setError('');
      setSuccessMsg('');
      const res = await fineService.payFine(id, paymentForm);
      setSuccessMsg(res.message || 'Fine marked as paid successfully!');
      setPaymentFine(null);
      setPaymentForm({ amount: '', paymentMethod: 'Cash', referenceNumber: '' });
      fetchFines();
    } catch (err) {
      setError(err.message || 'Failed to process payment.');
    } finally {
      setPayingId(null);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold mb-2">
            <ReceiptIndianRupee className="w-3.5 h-3.5" />
            <span>Revenue & Penalties</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Fine & Penalty Management
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Track, audit, and collect overdue book penalty fees categorized by department.
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

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-400 uppercase font-semibold">Total Fines Logged</div>
            <div className="text-2xl font-extrabold text-white mt-1">
              ₹{(stats.totalPendingAmount || 0) + (stats.totalPaidAmount || 0)}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              {(stats.pendingCount || 0) + (stats.paidCount || 0)} total penalty records
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
            <ReceiptIndianRupee className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-xs text-rose-400 uppercase font-semibold">Pending Collection</div>
            <div className="text-2xl font-extrabold text-rose-400 mt-1">
              ₹{stats.totalPendingAmount || 0}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              {stats.pendingCount || 0} outstanding dues
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-xs text-emerald-400 uppercase font-semibold">Collected Revenue</div>
            <div className="text-2xl font-extrabold text-emerald-400 mt-1">
              ₹{stats.totalPaidAmount || 0}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              {stats.paidCount || 0} receipts settled
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-2">
          {['all', 'Unpaid', 'Partially Paid', 'Paid'].map((st) => (
            <button
              key={st}
              onClick={() => setSelectedStatus(st)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition border ${
                selectedStatus === st
                  ? 'bg-blue-600 border-blue-500 text-white shadow-md shadow-blue-500/20'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {st === 'all' ? 'All Fines' : st}
            </button>
          ))}
        </div>

        <select
          value={selectedDept}
          onChange={(e) => setSelectedDept(e.target.value)}
          className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Departments</option>
          {departments.map((d) => (
            <option key={d._id} value={d._id}>
              {d.deptCode}
            </option>
          ))}
        </select>
      </div>

      {/* Fines Table */}
      <div className="rounded-2xl bg-slate-900/90 border border-slate-800 overflow-hidden shadow-xl">
        {loading ? (
          <div className="py-16 text-center text-slate-400">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-xs font-medium">Fetching fine ledgers...</p>
          </div>
        ) : finesList.length === 0 ? (
          <div className="p-12 text-center">
            <ReceiptIndianRupee className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-white">No fines found</h3>
            <p className="text-xs text-slate-400 mt-1">No fine records match your filter criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950/80 text-xs uppercase font-semibold text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">Fine ID</th>
                  <th className="py-3.5 px-4">Member</th>
                  <th className="py-3.5 px-4">Book Title</th>
                  <th className="py-3.5 px-4">Issue ID</th>
                  <th className="py-3.5 px-4">Due Date</th>
                  <th className="py-3.5 px-4">Return Date</th>
                  <th className="py-3.5 px-4 text-center">Overdue Days</th>
                  <th className="py-3.5 px-4 text-center">Fine / Day</th>
                  <th className="py-3.5 px-4 text-center">Total Fine</th>
                  <th className="py-3.5 px-4 text-center">Paid</th>
                  <th className="py-3.5 px-4 text-center">Remaining</th>
                  <th className="py-3.5 px-4 text-center">Payment Status</th>
                  {isStaff && <th className="py-3.5 px-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {finesList.map((fine) => (
                  <tr key={fine._id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-4 text-xs font-mono text-blue-400">{fine._id}</td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-white">{fine.memberId?.name || 'Member'}</div>
                      <div className="text-slate-400 text-xs flex items-center space-x-1 mt-0.5">
                        {fine.memberType === 'Student' ? (
                          <GraduationCap className="w-3 h-3 text-blue-400" />
                        ) : (
                          <Briefcase className="w-3 h-3 text-indigo-400" />
                        )}
                        <span>
                          {fine.memberType}: {fine.memberId?.registerNumber || fine.memberId?.employeeId}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-white max-w-xs truncate">
                        {fine.bookId?.title}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        ID: {fine.bookId?.bookId}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-xs font-mono text-slate-400">{fine.issueId?.issueNumber || '-'}</td>
                    <td className="py-3.5 px-4 text-xs text-slate-300">
                      {new Date(fine.dueDate).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-300">
                      {fine.returnDate ? new Date(fine.returnDate).toLocaleDateString() : '-'}
                    </td>
                    <td className="py-3.5 px-4 text-center text-xs font-bold text-slate-300">
                      {fine.overdueDays} days
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="text-sm font-extrabold text-white">₹{fine.overdueDays ? fine.fineAmount / fine.overdueDays : 0}</span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="text-sm font-extrabold text-white">₹{fine.fineAmount}</span>
                    </td>
                    <td className="py-3.5 px-4 text-center">₹{fine.paidAmount || 0}</td>
                    <td className="py-3.5 px-4 text-center">₹{fine.remainingAmount ?? fine.fineAmount}</td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          fine.paymentStatus === 'Paid'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : fine.paymentStatus === 'Partially Paid'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}
                      >
                        {fine.paymentStatus}
                      </span>
                    </td>
                    {isStaff && (
                      <td className="py-3.5 px-4 text-right">
                        {fine.paymentStatus !== 'Paid' ? (
                          <button
                            onClick={() => {
                              setPaymentFine(fine);
                              setPaymentForm({ amount: String(fine.remainingAmount ?? fine.fineAmount), paymentMethod: 'Cash', referenceNumber: '' });
                            }}
                            disabled={payingId === fine._id}
                            className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm transition disabled:opacity-50"
                          >
                            <CreditCard className="w-3 h-3" />
                            <span>{payingId === fine._id ? 'Processing...' : 'Record Payment'}</span>
                          </button>
                        ) : (
                          <span className="text-xs text-slate-500 italic">Settled</span>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {paymentFine && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              handlePayFine(paymentFine._id);
            }}
            className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">Record Fine Payment</h2>
              <button type="button" onClick={() => setPaymentFine(null)} className="text-slate-400 hover:text-white">{String.fromCharCode(215)}</button>
            </div>
            <p className="text-xs text-slate-400">Remaining amount: ₹{paymentFine.remainingAmount ?? paymentFine.fineAmount}</p>
            <input
              type="number"
              min="0.01"
              max={paymentFine.remainingAmount ?? paymentFine.fineAmount}
              step="0.01"
              required
              value={paymentForm.amount}
              onChange={(event) => setPaymentForm({ ...paymentForm, amount: event.target.value })}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white"
              placeholder="Payment amount"
            />
            <select
              value={paymentForm.paymentMethod}
              onChange={(event) => setPaymentForm({ ...paymentForm, paymentMethod: event.target.value })}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white"
            >
              {['Cash', 'UPI', 'Card', 'Other'].map((method) => <option key={method}>{method}</option>)}
            </select>
            <input
              value={paymentForm.referenceNumber}
              onChange={(event) => setPaymentForm({ ...paymentForm, referenceNumber: event.target.value })}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white"
              placeholder="Reference number (optional)"
            />
            <button type="submit" className="w-full px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold">Save Payment</button>
          </form>
        </div>
      )}
    </div>
  );
};

export default Fines;
