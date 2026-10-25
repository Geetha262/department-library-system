import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { issueService } from '../services/circulationService';
import departmentService from '../services/departmentService';
import {
  ClockAlert,
  Search,
  Building2,
  Calendar,
  User,
  GraduationCap,
  Briefcase,
  BookOpen,
  ReceiptIndianRupee,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';

const Overdue = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [overdueList, setOverdueList] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [selectedDept, setSelectedDept] = useState('all');
  const [selectedRange, setSelectedRange] = useState('all');
  const [search, setSearch] = useState('');
  const [dueTodayCount, setDueTodayCount] = useState(0);

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

  const fetchOverdue = async () => {
    try {
      setLoading(true);
      const [res, dueToday] = await Promise.all([
        issueService.getOverdue({
        department: selectedDept !== 'all' ? selectedDept : undefined,
        }),
        issueService.getAll({
          status: 'Due Today',
          department: selectedDept !== 'all' ? selectedDept : undefined,
          limit: 1,
        }),
      ]);
      setOverdueList(res.data || []);
      setDueTodayCount(dueToday.total || dueToday.data?.length || 0);
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to fetch overdue books.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverdue();
  }, [selectedDept]);

  const filteredOverdue = overdueList.filter((item) => {
    const days = item.daysOverdue || 0;
    const inRange = selectedRange === 'all'
      || (selectedRange === '1-7' && days >= 1 && days <= 7)
      || (selectedRange === '8-30' && days >= 8 && days <= 30)
      || (selectedRange === '30+' && days > 30);
    if (!inRange) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      item.issueNumber?.toLowerCase().includes(q) ||
      item.bookId?.title?.toLowerCase().includes(q) ||
      item.bookId?.bookId?.toLowerCase().includes(q) ||
      item.memberId?.name?.toLowerCase().includes(q) ||
      item.memberId?.registerNumber?.toLowerCase().includes(q) ||
      item.memberId?.employeeId?.toLowerCase().includes(q)
    );
  });

  const totalOverdueFines = filteredOverdue.reduce((sum, item) => sum + (item.currentFine ?? item.fineAmount ?? 0), 0);
  const longestOverdue = filteredOverdue.reduce((max, item) => Math.max(max, item.daysOverdue || 0), 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold mb-2">
            <ClockAlert className="w-3.5 h-3.5" />
            <span>Circulation Alerts</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Overdue Books Tracker
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Real-time monitoring of delinquent loans across academic departments with live fine accrual.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-500/30 min-w-[150px]">
          <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center">
            <ReceiptIndianRupee className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-slate-400 uppercase font-semibold">Overdue Books</div>
            <div className="text-xl font-extrabold text-rose-400">{filteredOverdue.length}</div>
          </div>
          </div>
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 min-w-[150px]">
            <div className="text-[11px] text-slate-400 uppercase font-semibold">Outstanding Fine</div>
            <div className="text-xl font-extrabold text-white">₹{totalOverdueFines}</div>
          </div>
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 min-w-[150px]">
            <div className="text-[11px] text-slate-400 uppercase font-semibold">Longest Overdue</div>
            <div className="text-xl font-extrabold text-white">{longestOverdue} days</div>
          </div>
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 min-w-[150px]">
            <div className="text-[11px] text-slate-400 uppercase font-semibold">Due Today</div>
            <div className="text-xl font-extrabold text-white">{dueTodayCount}</div>
          </div>
        </div>
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
            placeholder="Search by Borrower Name, Book Title, Transaction ID, Reg No..."
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
              {d.deptCode}
            </option>
          ))}
        </select>
        <select
          value={selectedRange}
          onChange={(e) => setSelectedRange(e.target.value)}
          className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Overdue</option>
          <option value="1-7">1-7 days</option>
          <option value="8-30">8-30 days</option>
          <option value="30+">More than 30 days</option>
        </select>
      </div>

      {/* Overdue Table */}
      <div className="rounded-2xl bg-slate-900/90 border border-slate-800 overflow-hidden shadow-xl">
        {loading ? (
          <div className="py-16 text-center text-slate-400">
            <div className="w-8 h-8 border-4 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-xs font-medium">Scanning for overdue loans...</p>
          </div>
        ) : filteredOverdue.length === 0 ? (
          <div className="p-12 text-center">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-white">No overdue books</h3>
            <p className="text-xs text-slate-400 mt-1">All borrowed books are currently within their valid loan period.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950/80 text-xs uppercase font-semibold text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">Member</th>
                  <th className="py-3.5 px-4">Member ID</th>
                  <th className="py-3.5 px-4">Book</th>
                  <th className="py-3.5 px-4">ISBN</th>
                  <th className="py-3.5 px-4">Issue Date</th>
                  <th className="py-3.5 px-4">Due Date</th>
                  <th className="py-3.5 px-4 text-center">Days Overdue</th>
                  <th className="py-3.5 px-4 text-center">Fine</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  {['admin', 'librarian'].includes(user?.role) && (
                    <th className="py-3.5 px-4 text-right">Action</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {filteredOverdue.map((item) => (
                  <tr key={item._id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-white">{item.memberId?.name || 'Member'}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="text-xs">{item.memberId?.registerNumber || item.memberId?.employeeId}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-white max-w-xs truncate">{item.bookId?.title}</div>
                    </td>
                    <td className="py-3.5 px-4 text-xs">{item.bookId?.isbn || '-'}</td>
                    <td className="py-3.5 px-4 text-xs text-slate-300">
                      {new Date(item.issueDate).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4 text-xs font-bold text-rose-400">
                      {new Date(item.dueDate).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                        {item.daysOverdue} days
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="text-sm font-extrabold text-rose-400">
                        ₹{item.currentFine ?? item.fineAmount}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        @ ₹{item.finePerDay}/day
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">OVERDUE</span>
                    </td>
                    {['admin', 'librarian'].includes(user?.role) && (
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => navigate(`/returns?query=${encodeURIComponent(item.issueNumber)}`)}
                          className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600 border border-blue-500/30 text-blue-300 hover:text-white text-xs font-semibold transition"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Return</span>
                        </button>
                      </td>
                    )}
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

export default Overdue;
