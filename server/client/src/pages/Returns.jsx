import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSearchParams } from 'react-router-dom';
import { returnService } from '../services/circulationService';
import departmentService from '../services/departmentService';
import {
  BookUp,
  Search,
  Building2,
  Calendar,
  User,
  GraduationCap,
  Briefcase,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  X,
  Clock,
  ReceiptIndianRupee,
  RotateCcw,
  Check,
} from 'lucide-react';

const Returns = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [returnsList, setReturnsList] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Search Loan State
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [selectedIssue, setSelectedIssue] = useState(null);

  // Return Processing
  const [remarks, setRemarks] = useState('Returned in good condition');
  const [processing, setProcessing] = useState(false);

  // Filter for history
  const [selectedDept, setSelectedDept] = useState('all');

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

  const fetchReturns = async () => {
    try {
      setLoading(true);
      const res = await returnService.getAll({
        department: selectedDept !== 'all' ? selectedDept : undefined,
      });
      setReturnsList(res.data || []);
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to fetch returns history.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReturns();
  }, [selectedDept]);

  const handleSearchLoan = async (e, queryOverride) => {
    e?.preventDefault();
    const query = (queryOverride || searchQuery).trim();
    if (!query) {
      setError('Please enter a Transaction ID, Book ID, Register No, or Employee ID.');
      return;
    }

    try {
      setSearching(true);
      setError('');
      setSelectedIssue(null);
      const res = await returnService.searchLoan(query);
      const results = res.data || [];
      setSearchResults(results);
      if (results.length === 1) {
        setSelectedIssue(results[0]);
      } else if (results.length === 0) {
        setError(`No active loans found matching "${query}".`);
      }
    } catch (err) {
      setError(err.message || 'No active loan found.');
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  useEffect(() => {
    const query = searchParams.get('query');
    if (query) {
      setSearchQuery(query);
      handleSearchLoan(null, query);
    }
  }, [searchParams]);

  const handleProcessReturn = async () => {
    if (!selectedIssue) return;
    setProcessing(true);
    setError('');
    setSuccessMsg('');

    try {
      const res = await returnService.create({
        issueId: selectedIssue._id,
        returnDate: new Date(),
        remarks,
      });

      setSuccessMsg(res.message || 'Book returned successfully!');
      setSelectedIssue(null);
      setSearchResults([]);
      setSearchQuery('');
      fetchReturns();
    } catch (err) {
      setError(err.message || 'Failed to process return.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold mb-2">
          <BookUp className="w-3.5 h-3.5" />
          <span>Return Circulation</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Book Return & Fine Processing
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Scan or search active loans to process returns with automated overdue days and fine calculation.
        </p>
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

      {/* Return Scanner & Quick Search Box */}
      <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6 shadow-xl space-y-4">
        <h2 className="text-base font-bold text-white flex items-center space-x-2">
          <Search className="w-4 h-4 text-blue-400" />
          <span>Lookup Active Loan for Return</span>
        </h2>

        <form onSubmit={handleSearchLoan} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Transaction ID (e.g. ISS-...), Book ID (e.g. BK-CSE-001), Student Reg No, or Faculty Emp ID..."
              className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            type="submit"
            disabled={searching}
            className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-semibold shadow-lg shadow-blue-600/30 transition disabled:opacity-50 flex items-center justify-center space-x-2 whitespace-nowrap"
          >
            {searching ? (
              <span>Searching...</span>
            ) : (
              <>
                <Search className="w-4 h-4" />
                <span>Find Loan</span>
              </>
            )}
          </button>
        </form>

        {/* Multi-result selector */}
        {searchResults.length > 1 && (
          <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-2xl space-y-2">
            <div className="text-xs text-slate-400 font-semibold uppercase">
              Multiple Active Loans Found ({searchResults.length}): Select one to return:
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {searchResults.map((loan) => (
                <div
                  key={loan._id}
                  onClick={() => setSelectedIssue(loan)}
                  className={`p-3 rounded-xl border cursor-pointer text-xs transition ${
                    selectedIssue?._id === loan._id
                      ? 'bg-blue-600/20 border-blue-500 text-white'
                      : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <div className="font-bold text-white">{loan.bookId?.title}</div>
                  <div className="text-slate-400 mt-0.5">
                    {loan.issueNumber} &bull; {loan.memberId?.name} ({loan.memberId?.registerNumber || loan.memberId?.employeeId})
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Selected Loan Return Preview Card */}
        {selectedIssue && (
          <div className="mt-4 p-6 rounded-2xl bg-gradient-to-br from-slate-950 to-blue-950/30 border border-blue-500/30 shadow-2xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-2">
              <div>
                <span className="text-xs font-mono text-blue-400 font-semibold">
                  Transaction: {selectedIssue.issueNumber}
                </span>
                <h3 className="text-lg font-extrabold text-white mt-0.5">
                  {selectedIssue.bookId?.title}
                </h3>
              </div>
              <span className="px-3 py-1 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-bold w-fit">
                Dept: {selectedIssue.departmentId?.deptCode}
              </span>
            </div>

            {/* Grid of Return Details */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800">
                <span className="text-slate-400 block mb-1">Borrower</span>
                <span className="font-semibold text-white block truncate">
                  {selectedIssue.memberId?.name}
                </span>
                <span className="text-[11px] text-slate-500">
                  {selectedIssue.memberType}: {selectedIssue.memberId?.registerNumber || selectedIssue.memberId?.employeeId}
                </span>
              </div>

              <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800">
                <span className="text-slate-400 block mb-1">Issue Date</span>
                <span className="font-semibold text-white block">
                  {new Date(selectedIssue.issueDate).toLocaleDateString()}
                </span>
                <span className="text-[11px] text-slate-500">Dispatched</span>
              </div>

              <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800">
                <span className="text-slate-400 block mb-1">Due Date</span>
                <span className={`font-semibold block ${selectedIssue.isOverdue ? 'text-rose-400 font-bold' : 'text-white'}`}>
                  {new Date(selectedIssue.dueDate).toLocaleDateString()}
                </span>
                <span className="text-[11px] text-slate-500">
                  {selectedIssue.isOverdue ? `${selectedIssue.overdueDays} days late` : 'On time'}
                </span>
              </div>

              <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800">
                <span className="text-slate-400 block mb-1">Calculated Fine</span>
                <span className={`text-base font-bold block ${selectedIssue.fineAmount > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                  ₹{selectedIssue.fineAmount || 0}
                </span>
                <span className="text-[11px] text-slate-500">
                  {selectedIssue.fineAmount > 0 ? `@ ₹${selectedIssue.finePerDay || 2}/day` : 'No fine'}
                </span>
              </div>
            </div>

            {/* Remarks and Action */}
            <div className="pt-2 flex flex-col sm:flex-row gap-3 items-center">
              <input
                type="text"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Return condition / remarks..."
                className="w-full sm:flex-1 px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={handleProcessReturn}
                disabled={processing}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-600/30 transition disabled:opacity-50 flex items-center justify-center space-x-2 whitespace-nowrap"
              >
                {processing ? (
                  <span>Processing...</span>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Confirm & Return Book</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Returns History Section */}
      <div className="space-y-4 pt-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center space-x-2">
              <RotateCcw className="w-4 h-4 text-blue-400" />
              <span>Recent Return Transactions</span>
            </h2>
            <p className="text-xs text-slate-400">
              Audit trail of completed return cycles and collected fines.
            </p>
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

        {/* Returns Table */}
        <div className="rounded-2xl bg-slate-900/90 border border-slate-800 overflow-hidden shadow-xl">
          {loading ? (
            <div className="py-16 text-center text-slate-400">
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
              <p className="text-xs font-medium">Loading return records...</p>
            </div>
          ) : returnsList.length === 0 ? (
            <div className="p-12 text-center">
              <BookUp className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-white">No return transactions recorded yet</h3>
              <p className="text-xs text-slate-400 mt-1">Processed returns will appear here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-950/80 text-xs uppercase font-semibold text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-3.5 px-4">Book Title</th>
                    <th className="py-3.5 px-4">Borrower</th>
                    <th className="py-3.5 px-4">Department</th>
                    <th className="py-3.5 px-4">Return Date</th>
                    <th className="py-3.5 px-4 text-center">Overdue Days</th>
                    <th className="py-3.5 px-4 text-center">Fine Incurred</th>
                    <th className="py-3.5 px-4">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {returnsList.map((ret) => (
                    <tr key={ret._id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-white max-w-xs truncate">
                          {ret.bookId?.title || 'Book Title'}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          ID: {ret.bookId?.bookId}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-xs">
                        <div className="font-semibold text-white">
                          {ret.memberId?.name || 'Member'}
                        </div>
                        <div className="text-slate-400 text-[11px]">
                          {ret.memberType}: {ret.memberId?.registerNumber || ret.memberId?.employeeId}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-semibold">
                          <Building2 className="w-3 h-3" />
                          <span>{ret.departmentId?.deptCode || 'DEPT'}</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-300">
                        {new Date(ret.returnDate).toLocaleDateString()}
                      </td>
                      <td className="py-3.5 px-4 text-center text-xs">
                        {ret.overdueDays > 0 ? (
                          <span className="font-bold text-rose-400">{ret.overdueDays} days</span>
                        ) : (
                          <span className="text-emerald-400 font-medium">On Time</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center text-xs">
                        {ret.fineAmount > 0 ? (
                          <span className="font-bold text-rose-400">₹{ret.fineAmount}</span>
                        ) : (
                          <span className="text-slate-400">₹0</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-400 italic max-w-xs truncate">
                        {ret.remarks || 'Returned'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Returns;
