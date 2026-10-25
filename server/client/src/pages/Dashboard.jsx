import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import dashboardService from '../services/dashboardService';
import { issueService, reservationService } from '../services/circulationService';
import {
  Building2,
  BookOpen,
  Users,
  GraduationCap,
  Briefcase,
  ClockAlert,
  ArrowRight,
  ReceiptIndianRupee,
  Layers,
  CheckCircle2,
  BookDown,
  BookUp,
  TrendingUp,
  BookmarkCheck,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  CartesianGrid,
} from 'recharts';

const COLORS = ['#3b82f6', '#06b6d4', '#8b5cf6', '#f59e0b', '#ef4444', '#10b981', '#ec4899'];

import { subscribeToEvents } from '../services/socket';

const Dashboard = () => {
  const { user } = useAuth();
  const isStaff = ['admin', 'librarian'].includes(user?.role);
  const isStudent = user?.role === 'student';

  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [myLoans, setMyLoans] = useState([]);
  const [myReservations, setMyReservations] = useState([]);
  const [myCirculationLoading, setMyCirculationLoading] = useState(false);
  const [myCirculationError, setMyCirculationError] = useState('');

  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await dashboardService.getStats();
      setStats(res.data);
    } catch (err) {
      console.error('Failed to load dashboard statistics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToEvents({
      onBookUpdated: () => fetchStats(),
      onRequestUpdated: () => fetchStats(),
      onReservationUpdated: () => fetchStats(),
      onIssueUpdated: () => fetchStats(),
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!isStudent) return undefined;
    let active = true;
    setMyCirculationLoading(true);
    Promise.all([
      issueService.getAll({ limit: 100 }),
      reservationService.getMine(),
    ])
      .then(([issuesResponse, reservationsResponse]) => {
        if (!active) return;
        setMyLoans(issuesResponse.data || []);
        setMyReservations(reservationsResponse.data || []);
        setMyCirculationError('');
      })
      .catch((err) => {
        if (active) setMyCirculationError(err.message || 'Unable to load your borrowing activity.');
      })
      .finally(() => {
        if (active) setMyCirculationLoading(false);
      });
    return () => { active = false; };
  }, [isStudent]);

  const summary = stats?.summary || {
    totalDepartments: 0,
    totalBookTitles: 0,
    totalCopies: 0,
    availableCopies: 0,
    issuedCopies: 0,
    totalStudents: 0,
    totalFaculty: 0,
    totalIssued: 0,
    totalReturned: 0,
    totalOverdue: 0,
    totalPendingFines: 0,
  };

  const deptStats = stats?.deptStats || [];
  const monthlyData = stats?.monthlyData || [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Welcome Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-blue-900/40 via-indigo-900/30 to-purple-900/20 border border-slate-800 p-6 sm:p-8 backdrop-blur shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold mb-3">
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span>
              <span>Authenticated Role: {user?.role?.toUpperCase()}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Welcome back, {user?.name}!
            </h1>
            <p className="text-slate-400 text-sm mt-1 max-w-xl">
              Apex College Central Library Portal. Academic cataloging, circulation limits, and reporting managed department-wise.
            </p>

            {user?.department && (
              <div className="mt-4 inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700 text-sm text-slate-200">
                <Building2 className="w-4 h-4 text-blue-400" />
                <span className="font-semibold text-blue-400">{user.department.deptCode}</span>
                <span className="text-slate-500">-</span>
                <span>{user.department.name}</span>
              </div>
            )}
          </div>

          <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl shadow-inner text-sm space-y-1.5 min-w-[240px]">
            <div className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-2">
              User Profile
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Account:</span>
              <span className="text-white font-medium">{user?.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Status:</span>
              <span className="text-emerald-400 font-medium">Active</span>
            </div>
            {user?.memberDetails && (
              <div className="flex justify-between">
                <span className="text-slate-400">
                  {user.role === 'student' ? 'Reg No:' : 'Emp ID:'}
                </span>
                <span className="text-blue-300 font-medium">
                  {user.memberDetails.registerNumber || user.memberDetails.employeeId}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {isStudent && (() => {
        const activeLoans = myLoans.filter((loan) => ['Issued', 'Overdue'].includes(loan.status));
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const dueSoon = activeLoans.filter((loan) => {
          const dueDate = new Date(loan.dueDate);
          const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
          return daysUntilDue >= 0 && daysUntilDue <= 7;
        });
        const overdue = activeLoans.filter((loan) => new Date(loan.dueDate) < today);
        return (
          <section className="space-y-4" aria-labelledby="my-circulation-title">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 id="my-circulation-title" className="text-lg font-bold text-white">My Library Activity</h2>
                <p className="mt-1 text-sm text-slate-400">Current loans, due dates, and reservation updates.</p>
              </div>
              <Link to="/my-books" className="inline-flex items-center gap-1 text-sm font-semibold text-blue-400 hover:text-blue-300">View My Books <ArrowRight className="h-4 w-4" /></Link>
            </div>
            {myCirculationError && <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-400">{myCirculationError}</div>}
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {[
                ['Borrowed Books', activeLoans.length, BookDown, 'text-blue-400'],
                ['My Reservations', myReservations.filter((item) => ['Pending', 'Available'].includes(item.status)).length, BookmarkCheck, 'text-amber-400'],
                ['Due Soon', dueSoon.length, BookUp, 'text-amber-400'],
                ['Overdue', overdue.length, ClockAlert, 'text-rose-400'],
              ].map(([label, value, Icon, tone]) => (
                <div key={label} className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                  <div className="flex items-center justify-between gap-2 text-xs font-semibold text-slate-400"><span>{label}</span><Icon className={`h-4 w-4 ${tone}`} /></div>
                  <div className={`mt-2 text-2xl font-bold ${tone}`}>{myCirculationLoading ? '—' : value}</div>
                </div>
              ))}
            </div>
            {!myCirculationLoading && activeLoans.length === 0 && myReservations.length === 0 && !myCirculationError && (
              <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-5 text-sm text-slate-400">No borrowing activity yet. Browse the catalogue to find a book.</div>
            )}
            {(dueSoon.length > 0 || overdue.length > 0) && (
              <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
                <div className="border-b border-slate-800 px-4 py-3 text-sm font-semibold text-white">Books Requiring Attention</div>
                <div className="divide-y divide-slate-800">
                  {[...overdue, ...dueSoon].map((loan) => (
                    <div key={loan._id} className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                      <span className="text-sm font-medium text-white">{loan.bookId?.title || 'Book'}</span>
                      <span className={`text-xs ${new Date(loan.dueDate) < today ? 'text-rose-400' : 'text-amber-400'}`}>
                        {new Date(loan.dueDate) < today ? 'Overdue' : 'Due'} {new Date(loan.dueDate).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        );
      })()}

      {/* Summary Stat Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 uppercase font-semibold">Total Departments</span>
            <Building2 className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-extrabold text-white mt-2">{summary.totalDepartments}</div>
          <div className="text-[11px] text-slate-500 mt-1">CSE, IT, ECE, EEE, MECH, etc.</div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 uppercase font-semibold">Total Books</span>
            <BookOpen className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-extrabold text-white mt-2">{summary.totalCopies}</div>
          <div className="text-[11px] text-emerald-400 mt-1">
            {summary.availableCopies} Available in stacks
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 uppercase font-semibold">Active Borrowings</span>
            <BookDown className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-extrabold text-amber-400 mt-2">{summary.issuedCopies}</div>
          <div className="text-[11px] text-slate-500 mt-1">{summary.totalReturned} lifetime returns</div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs text-rose-400 uppercase font-semibold">Overdue Loans</span>
            <ClockAlert className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-extrabold text-rose-400 mt-2">{summary.totalOverdue}</div>
          <div className="text-[11px] text-rose-400/80 mt-1">₹{summary.totalPendingFines} pending fines</div>
        </div>
      </div>

      {/* Analytics Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Books Collection by Department (Available vs Issued) */}
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white">Department Book Inventory</h3>
              <p className="text-xs text-slate-400">Available vs Issued copies by department</p>
            </div>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={deptStats} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="deptCode" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Bar dataKey="availableBooks" name="Available" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="issuedBooks" name="Issued" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Monthly Issues & Returns Trends */}
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white">Monthly Circulation Trends</h3>
              <p className="text-xs text-slate-400">Issue and Return activity over the last 6 months</p>
            </div>
            <TrendingUp className="w-4 h-4 text-blue-400" />
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Line type="monotone" dataKey="issues" name="Issues" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="returns" name="Returns" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 3: Students Enrolled by Department */}
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white">Students by Department</h3>
              <p className="text-xs text-slate-400">Library user distribution across academic branches</p>
            </div>
            <GraduationCap className="w-4 h-4 text-blue-400" />
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={deptStats} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="deptCode" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }}
                />
                <Bar dataKey="studentCount" name="Enrolled Students" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 4: Department Distribution Pie */}
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white">Department Collection Share</h3>
              <p className="text-xs text-slate-400">Total book stock proportion per department</p>
            </div>
            <Layers className="w-4 h-4 text-purple-400" />
          </div>
          <div className="h-64 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={deptStats}
                  dataKey="totalBooks"
                  nameKey="deptCode"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ deptCode, percent }) => `${deptCode} (${(percent * 100).toFixed(0)}%)`}
                  labelLine={false}
                >
                  {deptStats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Quick Access Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Link
          to="/departments"
          className="group p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-blue-500/40 transition shadow-lg"
        >
          <Building2 className="w-6 h-6 text-blue-400 mb-3" />
          <h3 className="font-bold text-white text-base">Department Catalogs</h3>
          <p className="text-xs text-slate-400 mt-1">
            Browse isolated inventories for CSE, IT, ECE, EEE, MECH, CIVIL, and AI&DS.
          </p>
          <div className="mt-4 flex items-center text-xs text-blue-400 font-semibold">
            <span>Explore Departments</span>
            <ArrowRight className="w-3.5 h-3.5 ml-1 group-hover:translate-x-1 transition" />
          </div>
        </Link>

        <Link
          to="/books"
          className="group p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-indigo-500/40 transition shadow-lg"
        >
          <BookOpen className="w-6 h-6 text-indigo-400 mb-3" />
          <h3 className="font-bold text-white text-base">Global Book Search</h3>
          <p className="text-xs text-slate-400 mt-1">
            Search titles, authors, categories, and availability across all departments.
          </p>
          <div className="mt-4 flex items-center text-xs text-indigo-400 font-semibold">
            <span>Open Catalog</span>
            <ArrowRight className="w-3.5 h-3.5 ml-1 group-hover:translate-x-1 transition" />
          </div>
        </Link>

        {isStaff ? (
          <Link
            to="/reports"
            className="group p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-emerald-500/40 transition shadow-lg"
          >
            <Layers className="w-6 h-6 text-emerald-400 mb-3" />
            <h3 className="font-bold text-white text-base">Department Reports</h3>
            <p className="text-xs text-slate-400 mt-1">
              Export inventory, circulation audit trails, overdue lists, and fine ledgers.
            </p>
            <div className="mt-4 flex items-center text-xs text-emerald-400 font-semibold">
              <span>View Reports</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1 group-hover:translate-x-1 transition" />
            </div>
          </Link>
        ) : (
          <Link
            to="/fines"
            className="group p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-amber-500/40 transition shadow-lg"
          >
            <ReceiptIndianRupee className="w-6 h-6 text-amber-400 mb-3" />
            <h3 className="font-bold text-white text-base">My Dues & History</h3>
            <p className="text-xs text-slate-400 mt-1">
              Check loan due dates, borrowing records, and library guidelines.
            </p>
            <div className="mt-4 flex items-center text-xs text-amber-400 font-semibold">
              <span>Check Account</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1 group-hover:translate-x-1 transition" />
            </div>
          </Link>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
