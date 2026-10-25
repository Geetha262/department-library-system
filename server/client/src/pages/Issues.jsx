import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { issueService } from '../services/circulationService';
import { studentService, facultyService } from '../services/memberService';
import bookService from '../services/bookService';
import departmentService from '../services/departmentService';
import {
  BookDown,
  Search,
  Plus,
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
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';

const Issues = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [issues, setIssues] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Filters
  const [search, setSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState('all');
  const [selectedMemberType, setSelectedMemberType] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');

  // Issue Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [memberType, setMemberType] = useState('Student');
  const [memberSearch, setMemberSearch] = useState('');
  const [memberResults, setMemberResults] = useState([]);
  const [selectedMember, setSelectedMember] = useState(null);

  const [bookSearch, setBookSearch] = useState('');
  const [bookResults, setBookResults] = useState([]);
  const [selectedBook, setSelectedBook] = useState(null);

  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );

  useEffect(() => {
    const fetchDepts = async () => {
      try {
        const res = await departmentService.getAll();
        setDepartments(res.data || []);
      } catch (err) {
        console.error('Failed to load departments:', err);
      }
    };
    fetchDepts();
  }, []);

  const fetchIssues = async () => {
    try {
      setLoading(true);
      const res = await issueService.getAll({
        search,
        department: selectedDept !== 'all' ? selectedDept : undefined,
        memberType: selectedMemberType !== 'all' ? selectedMemberType : undefined,
        status: selectedStatus !== 'all' ? selectedStatus : undefined,
      });
      setIssues(res.data || []);
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to fetch issues.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchIssues();
    }, 250);
    return () => clearTimeout(timer);
  }, [search, selectedDept, selectedMemberType, selectedStatus]);

  // Live member search
  useEffect(() => {
    const searchMembers = async () => {
      if (!memberSearch.trim()) {
        setMemberResults([]);
        return;
      }
      try {
        const service = memberType === 'Student' ? studentService : facultyService;
        const res = await service.getAll({ search: memberSearch, limit: 6 });
        setMemberResults(res.data || []);
      } catch (err) {
        console.error(err);
      }
    };
    const timer = setTimeout(searchMembers, 200);
    return () => clearTimeout(timer);
  }, [memberSearch, memberType]);

  // Live book search
  useEffect(() => {
    const searchBooks = async () => {
      if (!bookSearch.trim()) {
        setBookResults([]);
        return;
      }
      try {
        const res = await bookService.getAll({ search: bookSearch, limit: 6 });
        setBookResults(res.data || []);
      } catch (err) {
        console.error(err);
      }
    };
    const timer = setTimeout(searchBooks, 200);
    return () => clearTimeout(timer);
  }, [bookSearch]);

  const handleOpenModal = () => {
    setSelectedMember(null);
    setSelectedBook(null);
    setMemberSearch('');
    setBookSearch('');
    setMemberType('Student');
    setIssueDate(new Date().toISOString().split('T')[0]);
    setDueDate(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
    setModalOpen(true);
    setError('');
  };

  const handleIssueSubmit = async (e) => {
    e.preventDefault();
    if (!selectedMember) {
      setError('Please select a member.');
      return;
    }
    if (!selectedBook) {
      setError('Please select a book.');
      return;
    }
    if (selectedBook.availableQuantity <= 0) {
      setError(`"${selectedBook.title}" is out of stock.`);
      return;
    }

    const limit = memberType === 'Student' ? 3 : 5;
    if ((selectedMember.activeLoansCount || 0) >= limit) {
      setError(`${memberType} has reached the maximum borrowing limit of ${limit} books.`);
      return;
    }

    setSubmitting(true);
    setError('');
    setSuccessMsg('');

    try {
      const res = await issueService.create({
        memberType,
        memberId: selectedMember._id,
        bookId: selectedBook._id,
        issueDate,
        dueDate,
      });
      setSuccessMsg(res.message || 'Book issued successfully!');
      setModalOpen(false);
      fetchIssues();
    } catch (err) {
      setError(err.message || 'Failed to issue book.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold mb-2">
            <BookDown className="w-3.5 h-3.5" />
            <span>Circulation Desk</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Book Issue Management
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Issue departmental books to students and faculty with strict quota validation.
          </p>
        </div>

        <button
          onClick={handleOpenModal}
          className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold shadow-lg shadow-blue-600/30 transition"
        >
          <Plus className="w-4 h-4" />
          <span>Issue New Book</span>
        </button>
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
            placeholder="Search by Transaction/Issue No..."
            className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
          />
        </div>

        {/* Dept filter */}
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

        {/* Member Type */}
        <select
          value={selectedMemberType}
          onChange={(e) => setSelectedMemberType(e.target.value)}
          className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Member Types</option>
          <option value="Student">Students</option>
          <option value="Faculty">Faculty</option>
        </select>

        {/* Status */}
        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Statuses</option>
          <option value="Active">Active</option>
          <option value="Due Today">Due Today</option>
          <option value="Returned">Returned</option>
          <option value="Overdue">Overdue</option>
        </select>
      </div>

      {/* Issues Table */}
      <div className="rounded-2xl bg-slate-900/90 border border-slate-800 overflow-hidden shadow-xl">
        {loading ? (
          <div className="py-16 text-center text-slate-400">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-xs font-medium">Fetching circulation records...</p>
          </div>
        ) : issues.length === 0 ? (
          <div className="p-12 text-center">
            <BookDown className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-white">No issue records found</h3>
            <p className="text-xs text-slate-400 mt-1">Try adjusting search or filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950/80 text-xs uppercase font-semibold text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">Issue ID</th>
                  <th className="py-3.5 px-4">Member</th>
                  <th className="py-3.5 px-4">Book Title</th>
                  <th className="py-3.5 px-4">ISBN</th>
                  <th className="py-3.5 px-4">Issue Date</th>
                  <th className="py-3.5 px-4">Due Date</th>
                  <th className="py-3.5 px-4">Return Date</th>
                  <th className="py-3.5 px-4">Overdue Days</th>
                  <th className="py-3.5 px-4">Fine</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {issues.map((item) => {
                  const displayStatus = item.displayStatus || (item.status === 'Returned' ? 'Returned' : item.isOverdue ? 'Overdue' : 'Active');
                  const isLate = displayStatus === 'Overdue';
                  return (
                    <tr key={item._id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3.5 px-4 font-mono text-xs font-semibold text-blue-400">
                        {item.issueNumber}
                      </td>
                      <td className="py-3.5 px-4 text-xs">
                        <div className="font-semibold text-white">{item.memberId?.name || 'Member'}</div>
                        <div className="text-slate-400">{item.memberId?.registerNumber || item.memberId?.employeeId}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-white max-w-xs truncate">
                          {item.bookId?.title || 'Book Title'}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          ID: {item.bookId?.bookId} &bull; Shelf: {item.bookId?.shelfNumber}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-300">
                        {item.bookId?.isbn || '-'}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-300">
                        {new Date(item.issueDate).toLocaleDateString()}
                      </td>
                      <td className="py-3.5 px-4 text-xs">
                        <div className={`font-medium ${isLate ? 'text-rose-400 font-bold' : 'text-slate-300'}`}>
                          {new Date(item.dueDate).toLocaleDateString()}
                        </div>
                        {isLate && <span className="text-[10px] text-rose-400">({item.overdueDays} days late)</span>}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-300">
                        {item.returnDetails?.returnDate ? new Date(item.returnDetails.returnDate).toLocaleDateString() : '-'}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-300">{item.returnDetails?.overdueDays || item.overdueDays || 0}</td>
                      <td className="py-3.5 px-4 text-xs text-slate-300">₹{item.returnDetails?.fineAmount || 0}</td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            displayStatus === 'Returned'
                              ? 'bg-slate-800 text-emerald-400 border border-emerald-500/20'
                              : isLate
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}
                        >
                          {displayStatus}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {displayStatus !== 'Returned' && (
                          <button
                            onClick={() => navigate('/returns')}
                            className="px-3 py-1.5 rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-300 hover:bg-blue-600 hover:text-white text-xs font-semibold"
                          >
                            Return
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Issue Book Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 max-w-2xl w-full rounded-3xl p-6 sm:p-8 shadow-2xl my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <h2 className="text-xl font-bold text-white flex items-center space-x-2">
                <BookDown className="w-5 h-5 text-blue-400" />
                <span>Issue Book to Member</span>
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleIssueSubmit} className="space-y-5 mt-5">
              {/* Member Type Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  Select Borrower Type
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setMemberType('Student');
                      setSelectedMember(null);
                      setMemberSearch('');
                    }}
                    className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-center space-x-2 transition ${
                      memberType === 'Student'
                        ? 'bg-blue-600/20 border-blue-500 text-blue-300 shadow-sm'
                        : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-white'
                    }`}
                  >
                    <GraduationCap className="w-4 h-4" />
                    <span>Student (Limit: 3 Books)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setMemberType('Faculty');
                      setSelectedMember(null);
                      setMemberSearch('');
                    }}
                    className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-center space-x-2 transition ${
                      memberType === 'Faculty'
                        ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300 shadow-sm'
                        : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-white'
                    }`}
                  >
                    <Briefcase className="w-4 h-4" />
                    <span>Faculty Member (Limit: 5 Books)</span>
                  </button>
                </div>
              </div>

              {/* Member Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Find {memberType} *
                </label>
                {selectedMember ? (
                  <div className="p-3.5 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold text-white">{selectedMember.name}</div>
                      <div className="text-xs text-slate-400">
                        {memberType === 'Student'
                          ? `Reg No: ${selectedMember.registerNumber} • Dept: ${selectedMember.departmentId?.deptCode} • Year ${selectedMember.year}`
                          : `Emp ID: ${selectedMember.employeeId} • Dept: ${selectedMember.departmentId?.deptCode} • ${selectedMember.designation}`}
                      </div>
                      <div className="text-xs text-blue-400 mt-1 font-medium">
                        Active Loans: {selectedMember.activeLoansCount || 0} / {memberType === 'Student' ? 3 : 5} Books
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedMember(null)}
                      className="text-xs px-2.5 py-1 rounded-lg bg-slate-700 text-slate-300 hover:text-white"
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <input
                      type="text"
                      value={memberSearch}
                      onChange={(e) => setMemberSearch(e.target.value)}
                      placeholder={`Type name, ${memberType === 'Student' ? 'Register No' : 'Employee ID'}...`}
                      className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {memberResults.length > 0 && (
                      <div className="absolute top-full mt-1 left-0 right-0 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl z-20 max-h-48 overflow-y-auto">
                        {memberResults.map((m) => (
                          <div
                            key={m._id}
                            onClick={() => {
                              setSelectedMember(m);
                              setMemberResults([]);
                            }}
                            className="p-2.5 hover:bg-slate-700 cursor-pointer border-b border-slate-700/50 last:border-none text-xs"
                          >
                            <div className="font-semibold text-white">{m.name}</div>
                            <div className="text-slate-400">
                              {m.registerNumber || m.employeeId} &bull; Dept: {m.departmentId?.deptCode} &bull; Active: {m.activeLoansCount || 0} books
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Book Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Select Book to Issue *
                </label>
                {selectedBook ? (
                  <div className="p-3.5 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold text-white">{selectedBook.title}</div>
                      <div className="text-xs text-slate-400">
                        ID: <span className="font-mono text-blue-400">{selectedBook.bookId}</span> &bull; Dept: {selectedBook.departmentId?.deptCode} &bull; Shelf: {selectedBook.shelfNumber}
                      </div>
                      <div className="text-xs text-emerald-400 mt-1 font-medium">
                        Available in Library: {selectedBook.availableQuantity} of {selectedBook.quantity} copies
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedBook(null)}
                      className="text-xs px-2.5 py-1 rounded-lg bg-slate-700 text-slate-300 hover:text-white"
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <input
                      type="text"
                      value={bookSearch}
                      onChange={(e) => setBookSearch(e.target.value)}
                      placeholder="Search book by Title, ISBN, Book ID..."
                      className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {bookResults.length > 0 && (
                      <div className="absolute top-full mt-1 left-0 right-0 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl z-20 max-h-48 overflow-y-auto">
                        {bookResults.map((b) => (
                          <div
                            key={b._id}
                            onClick={() => {
                              setSelectedBook(b);
                              setBookResults([]);
                            }}
                            className="p-2.5 hover:bg-slate-700 cursor-pointer border-b border-slate-700/50 last:border-none text-xs flex justify-between items-center"
                          >
                            <div>
                              <div className="font-semibold text-white">{b.title}</div>
                              <div className="text-slate-400">
                                {b.bookId} &bull; Dept: {b.departmentId?.deptCode} &bull; Shelf: {b.shelfNumber}
                              </div>
                            </div>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                b.availableQuantity > 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                              }`}
                            >
                              {b.availableQuantity > 0 ? `${b.availableQuantity} Avail` : 'Out of Stock'}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Issue Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={issueDate}
                    onChange={(e) => setIssueDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Due Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !selectedMember || !selectedBook}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/30 transition disabled:opacity-50"
                >
                  {submitting ? 'Issuing...' : 'Confirm & Issue Book'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Issues;
