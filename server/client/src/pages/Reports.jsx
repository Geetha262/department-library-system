import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import reportService from '../services/reportService';
import departmentService from '../services/departmentService';
import {
  BarChart3,
  Building2,
  Calendar,
  Download,
  Printer,
  Search,
  BookOpen,
  GraduationCap,
  Briefcase,
  BookDown,
  BookUp,
  ClockAlert,
  ReceiptIndianRupee,
  Layers,
} from 'lucide-react';

const Reports = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('dept-books');
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Report Data
  const [reportData, setReportData] = useState([]);

  // Filters
  const [selectedDept, setSelectedDept] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [memberType, setMemberType] = useState('all');
  const [paymentStatus, setPaymentStatus] = useState('all');

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

  const fetchReport = async () => {
    try {
      setLoading(true);
      setError('');
      let res;
      if (activeTab === 'dept-books') {
        res = await reportService.getDeptBooks();
      } else if (activeTab === 'dept-students') {
        res = await reportService.getDeptStudents();
      } else if (activeTab === 'issues') {
        res = await reportService.getIssues({
          department: selectedDept !== 'all' ? selectedDept : undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          memberType: memberType !== 'all' ? memberType : undefined,
        });
      } else if (activeTab === 'returns') {
        res = await reportService.getReturns({
          department: selectedDept !== 'all' ? selectedDept : undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        });
      } else if (activeTab === 'overdue') {
        res = await reportService.getOverdue({
          department: selectedDept !== 'all' ? selectedDept : undefined,
        });
      } else if (activeTab === 'fines') {
        res = await reportService.getFines({
          department: selectedDept !== 'all' ? selectedDept : undefined,
          paymentStatus: paymentStatus !== 'all' ? paymentStatus : undefined,
        });
      }
      setReportData(res?.data || []);
    } catch (err) {
      setError(err.message || 'Failed to generate report.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [activeTab, selectedDept, startDate, endDate, memberType, paymentStatus]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    if (!reportData || reportData.length === 0) return;
    const headers = Object.keys(reportData[0]).filter(k => typeof reportData[0][k] !== 'object');
    const csvRows = [];
    csvRows.push(headers.join(','));
    for (const row of reportData) {
      const values = headers.map(h => {
        const val = row[h];
        return `"${val !== undefined && val !== null ? String(val).replace(/"/g, '""') : ''}"`;
      });
      csvRows.push(values.join(','));
    }
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', `${activeTab}-report-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const tabs = [
    { id: 'dept-books', label: 'Department-wise Books', icon: BookOpen },
    { id: 'dept-students', label: 'Department Enrollment', icon: GraduationCap },
    { id: 'issues', label: 'Issues Audit', icon: BookDown },
    { id: 'returns', label: 'Returns Audit', icon: BookUp },
    { id: 'overdue', label: 'Overdue Summary', icon: ClockAlert },
    { id: 'fines', label: 'Fine Collections', icon: ReceiptIndianRupee },
  ];

  return (
    <div className="reports-page space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold mb-2">
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Institutional Intelligence</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Department Library Reports
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Department-wise inventories, circulation ledgers, overdue logs, and financial records.
          </p>
        </div>

        {/* Export and Print Buttons */}
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={handleExportCSV}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/30 transition"
          >
            <Printer className="w-4 h-4" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="no-print flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-none">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition border ${
                activeTab === tab.id
                  ? 'bg-blue-600 border-blue-500 text-white shadow-md shadow-blue-500/20'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Dynamic Filters Bar for Transaction Reports */}
      {['issues', 'returns', 'overdue', 'fines'].includes(activeTab) && (
        <div className="no-print p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-wrap gap-3">
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

          {activeTab === 'issues' && (
            <select
              value={memberType}
              onChange={(e) => setMemberType(e.target.value)}
              className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Member Types</option>
              <option value="Student">Students</option>
              <option value="Faculty">Faculty</option>
            </select>
          )}

          {activeTab === 'fines' && (
            <select
              value={paymentStatus}
              onChange={(e) => setPaymentStatus(e.target.value)}
              className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Payment Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Paid">Paid</option>
            </select>
          )}

          {['issues', 'returns'].includes(activeTab) && (
            <div className="flex items-center space-x-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-slate-500 text-xs">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}
        </div>
      )}

      {/* Report Table View */}
      <div className="report-content rounded-2xl bg-slate-900/90 border border-slate-800 overflow-hidden shadow-xl">
        <div className="print-only hidden">
          <p className="text-xs font-bold uppercase">Department Library</p>
          <h1 className="text-xl font-bold">Department Library Reports</h1>
          <p className="text-sm">Report: {tabs.find((tab) => tab.id === activeTab)?.label}</p>
          <p className="text-xs">Generated: {new Date().toLocaleString()}</p>
        </div>
        {loading ? (
          <div className="py-16 text-center text-slate-400">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-xs font-medium">Generating department analytics...</p>
          </div>
        ) : reportData.length === 0 ? (
          <div className="p-12 text-center">
            <BarChart3 className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-white">No report data found</h3>
            <p className="text-xs text-slate-400 mt-1">Try adjusting the filter criteria or date range.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            {/* 1. Dept Books Report */}
            {activeTab === 'dept-books' && (
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-950/80 text-xs uppercase font-semibold text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-3.5 px-4">Department Code</th>
                    <th className="py-3.5 px-4">Department Name</th>
                    <th className="py-3.5 px-4">Head of Dept (HOD)</th>
                    <th className="py-3.5 px-4 text-center">Total Titles</th>
                    <th className="py-3.5 px-4 text-center">Total Copies</th>
                    <th className="py-3.5 px-4 text-center">Available</th>
                    <th className="py-3.5 px-4 text-center">Currently Issued</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {reportData.map((row, i) => (
                    <tr key={i} className="hover:bg-slate-800/40">
                      <td className="py-3.5 px-4 font-bold text-blue-400">{row.deptCode}</td>
                      <td className="py-3.5 px-4 font-medium text-white">{row.name}</td>
                      <td className="py-3.5 px-4 text-xs text-slate-400">{row.hodName}</td>
                      <td className="py-3.5 px-4 text-center">{row.totalTitles}</td>
                      <td className="py-3.5 px-4 text-center font-semibold text-white">{row.totalCopies}</td>
                      <td className="py-3.5 px-4 text-center font-semibold text-emerald-400">{row.available}</td>
                      <td className="py-3.5 px-4 text-center font-semibold text-amber-400">{row.issued}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* 2. Dept Students Report */}
            {activeTab === 'dept-students' && (
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-950/80 text-xs uppercase font-semibold text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-3.5 px-4">Department Code</th>
                    <th className="py-3.5 px-4">Department Name</th>
                    <th className="py-3.5 px-4">Head of Dept (HOD)</th>
                    <th className="py-3.5 px-4 text-center">Enrolled Students</th>
                    <th className="py-3.5 px-4 text-center">Faculty Members</th>
                    <th className="py-3.5 px-4 text-center">Total Department Members</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {reportData.map((row, i) => (
                    <tr key={i} className="hover:bg-slate-800/40">
                      <td className="py-3.5 px-4 font-bold text-blue-400">{row.deptCode}</td>
                      <td className="py-3.5 px-4 font-medium text-white">{row.name}</td>
                      <td className="py-3.5 px-4 text-xs text-slate-400">{row.hodName}</td>
                      <td className="py-3.5 px-4 text-center font-semibold text-white">{row.studentCount}</td>
                      <td className="py-3.5 px-4 text-center font-semibold text-indigo-400">{row.facultyCount}</td>
                      <td className="py-3.5 px-4 text-center font-bold text-emerald-400">
                        {(row.studentCount || 0) + (row.facultyCount || 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* 3. Issues Audit Report */}
            {activeTab === 'issues' && (
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-950/80 text-xs uppercase font-semibold text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-3.5 px-4">Issue No</th>
                    <th className="py-3.5 px-4">Book Title</th>
                    <th className="py-3.5 px-4">Borrower</th>
                    <th className="py-3.5 px-4">Department</th>
                    <th className="py-3.5 px-4">Issue Date</th>
                    <th className="py-3.5 px-4">Due Date</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {reportData.map((row) => (
                    <tr key={row._id} className="hover:bg-slate-800/40">
                      <td className="py-3.5 px-4 font-mono text-xs text-blue-400">{row.issueNumber}</td>
                      <td className="py-3.5 px-4 font-medium text-white">{row.bookId?.title}</td>
                      <td className="py-3.5 px-4 text-xs">{row.memberId?.name} ({row.memberType})</td>
                      <td className="py-3.5 px-4 font-bold text-xs text-blue-400">{row.departmentId?.deptCode}</td>
                      <td className="py-3.5 px-4 text-xs">{new Date(row.issueDate).toLocaleDateString()}</td>
                      <td className="py-3.5 px-4 text-xs">{new Date(row.dueDate).toLocaleDateString()}</td>
                      <td className="py-3.5 px-4 text-center text-xs font-semibold">{row.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* 4. Returns Audit Report */}
            {activeTab === 'returns' && (
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
                  {reportData.map((row) => (
                    <tr key={row._id} className="hover:bg-slate-800/40">
                      <td className="py-3.5 px-4 font-medium text-white">{row.bookId?.title}</td>
                      <td className="py-3.5 px-4 text-xs">{row.memberId?.name} ({row.memberType})</td>
                      <td className="py-3.5 px-4 font-bold text-xs text-blue-400">{row.departmentId?.deptCode}</td>
                      <td className="py-3.5 px-4 text-xs">{new Date(row.returnDate).toLocaleDateString()}</td>
                      <td className="py-3.5 px-4 text-center text-xs">{row.overdueDays} days</td>
                      <td className="py-3.5 px-4 text-center text-xs font-bold text-rose-400">₹{row.fineAmount}</td>
                      <td className="py-3.5 px-4 text-xs text-slate-400">{row.remarks}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* 5. Overdue Report */}
            {activeTab === 'overdue' && (
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-950/80 text-xs uppercase font-semibold text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-3.5 px-4">Borrower</th>
                    <th className="py-3.5 px-4">Book Title</th>
                    <th className="py-3.5 px-4">Department</th>
                    <th className="py-3.5 px-4">Due Date</th>
                    <th className="py-3.5 px-4 text-center">Days Overdue</th>
                    <th className="py-3.5 px-4 text-center">Accrued Fine</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {reportData.map((row) => (
                    <tr key={row._id} className="hover:bg-slate-800/40">
                      <td className="py-3.5 px-4 font-semibold text-white">{row.memberId?.name} ({row.memberType})</td>
                      <td className="py-3.5 px-4">{row.bookId?.title}</td>
                      <td className="py-3.5 px-4 font-bold text-xs text-blue-400">{row.departmentId?.deptCode}</td>
                      <td className="py-3.5 px-4 text-xs text-rose-400 font-bold">{new Date(row.dueDate).toLocaleDateString()}</td>
                      <td className="py-3.5 px-4 text-center text-xs font-bold text-rose-400">{row.daysOverdue} days</td>
                      <td className="py-3.5 px-4 text-center text-xs font-bold text-rose-400">₹{row.fineAmount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* 6. Fine Collections Report */}
            {activeTab === 'fines' && (
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-950/80 text-xs uppercase font-semibold text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-3.5 px-4">Borrower</th>
                    <th className="py-3.5 px-4">Book Title</th>
                    <th className="py-3.5 px-4">Department</th>
                    <th className="py-3.5 px-4 text-center">Overdue Days</th>
                    <th className="py-3.5 px-4 text-center">Fine Amount</th>
                    <th className="py-3.5 px-4 text-center">Payment Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {reportData.map((row) => (
                    <tr key={row._id} className="hover:bg-slate-800/40">
                      <td className="py-3.5 px-4 font-semibold text-white">{row.memberId?.name} ({row.memberType})</td>
                      <td className="py-3.5 px-4">{row.bookId?.title}</td>
                      <td className="py-3.5 px-4 font-bold text-xs text-blue-400">{row.departmentId?.deptCode}</td>
                      <td className="py-3.5 px-4 text-center text-xs">{row.overdueDays} days</td>
                      <td className="py-3.5 px-4 text-center text-sm font-bold text-white">₹{row.fineAmount}</td>
                      <td className="py-3.5 px-4 text-center text-xs font-bold">{row.paymentStatus}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Reports;
