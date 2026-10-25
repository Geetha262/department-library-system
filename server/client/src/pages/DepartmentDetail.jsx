import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import departmentService from '../services/departmentService';
import bookService from '../services/bookService';
import {
  Building2,
  BookOpen,
  ArrowLeft,
  Search,
  Plus,
  Layers,
  CheckCircle2,
  AlertCircle,
  Users,
  ChevronDown,
} from 'lucide-react';

const DepartmentDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isStaff = ['admin', 'librarian'].includes(user?.role);

  const [department, setDepartment] = useState(null);
  const [allDepartments, setAllDepartments] = useState([]);
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [booksLoading, setBooksLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [categories, setCategories] = useState([]);
  const [error, setError] = useState('');

  // Fetch all departments for quick switcher
  useEffect(() => {
    const fetchAllDepts = async () => {
      try {
        const res = await departmentService.getAll();
        setAllDepartments(res.data || []);
      } catch (err) {
        console.error('Error loading department list:', err);
      }
    };
    fetchAllDepts();
  }, []);

  // Fetch current department details & stats
  useEffect(() => {
    const fetchDept = async () => {
      try {
        setLoading(true);
        const res = await departmentService.getById(id);
        setDepartment(res.data);
        setError('');
      } catch (err) {
        setError(err.message || 'Failed to load department.');
      } finally {
        setLoading(false);
      }
    };
    if (id) {
      fetchDept();
    }
  }, [id]);

  // Fetch books belonging strictly to this department
  const fetchDeptBooks = async () => {
    if (!id) return;
    try {
      setBooksLoading(true);
      const res = await bookService.getAll({
        department: id,
        search,
        category: categoryFilter !== 'all' ? categoryFilter : undefined,
      });
      setBooks(res.data || []);
      // Extract categories
      const distinctCategories = [...new Set((res.data || []).map((b) => b.category))].filter(Boolean);
      setCategories(distinctCategories);
    } catch (err) {
      console.error('Error fetching department books:', err);
    } finally {
      setBooksLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchDeptBooks();
    }, 250);
    return () => clearTimeout(timer);
  }, [id, search, categoryFilter]);

  const handleSwitchDepartment = (newId) => {
    navigate(`/departments/${newId}`);
  };

  if (loading) {
    return (
      <div className="py-24 text-center text-slate-400">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <p className="text-sm font-medium">Loading department details & collection...</p>
      </div>
    );
  }

  if (error || !department) {
    return (
      <div className="p-8 max-w-xl mx-auto text-center bg-slate-900 border border-slate-800 rounded-3xl mt-12">
        <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-white mb-2">Department Not Found</h2>
        <p className="text-sm text-slate-400 mb-6">{error || 'The requested department could not be located.'}</p>
        <Link
          to="/departments"
          className="inline-flex items-center px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-500 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
          Back to Departments
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Navigation & Quick Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Link
          to="/departments"
          className="inline-flex items-center text-xs font-semibold text-slate-400 hover:text-white transition w-fit"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          Back to All Departments
        </Link>

        {/* Quick Department Selector Dropdown */}
        <div className="flex items-center space-x-2">
          <label className="text-xs font-medium text-slate-400 whitespace-nowrap">
            Switch Department:
          </label>
          <select
            value={id}
            onChange={(e) => handleSwitchDepartment(e.target.value)}
            className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs font-medium text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
          >
            {allDepartments.map((dept) => (
              <option key={dept._id} value={dept._id}>
                {dept.deptCode} - {dept.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Department Header Showcase Card */}
      <div className="rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950/40 border border-slate-800 p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <span className="px-3.5 py-1 rounded-xl bg-blue-600/20 border border-blue-500/40 text-blue-300 font-bold text-sm tracking-wider">
                {department.deptCode}
              </span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                {department.status || 'Active'}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {department.name}
            </h1>

            <div className="mt-2 text-sm text-slate-300 flex items-center space-x-2">
              <span className="text-slate-400">Head of Department (HOD):</span>
              <span className="font-semibold text-white">{department.hodName}</span>
            </div>

            {department.description && (
              <p className="text-xs text-slate-400 mt-2 max-w-2xl leading-relaxed">
                {department.description}
              </p>
            )}
          </div>

          {/* Core Metric Cards */}
          <div className="grid grid-cols-3 gap-3 min-w-[300px]">
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 text-center">
              <div className="text-[11px] text-slate-400 uppercase font-semibold">Total Books</div>
              <div className="text-2xl font-extrabold text-white mt-1">
                {department.stats?.totalBooks || 0}
              </div>
              <div className="text-[10px] text-slate-500">{department.stats?.totalTitles || 0} Titles</div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 text-center">
              <div className="text-[11px] text-emerald-400 uppercase font-semibold">Available</div>
              <div className="text-2xl font-extrabold text-emerald-400 mt-1">
                {department.stats?.availableBooks || 0}
              </div>
              <div className="text-[10px] text-slate-500">In Stacks</div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 text-center">
              <div className="text-[11px] text-amber-400 uppercase font-semibold">Issued</div>
              <div className="text-2xl font-extrabold text-amber-400 mt-1">
                {department.stats?.issuedBooks || 0}
              </div>
              <div className="text-[10px] text-slate-500">Active Loans</div>
            </div>
          </div>
        </div>
      </div>

      {/* Department Quick Tabs */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-none">
        {allDepartments.map((d) => (
          <button
            key={d._id}
            onClick={() => handleSwitchDepartment(d._id)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition border ${
              d._id === id
                ? 'bg-blue-600 border-blue-500 text-white shadow-md shadow-blue-500/20'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            {d.deptCode}
          </button>
        ))}
      </div>

      {/* Search & Filter bar for Books in this Department */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center space-x-2">
            <span>Books in {department.deptCode} Department</span>
            <span className="text-xs font-normal text-slate-400">({books.length} records)</span>
          </h2>
          <p className="text-xs text-slate-400">
            Exclusive departmental catalog. Only books assigned to {department.name} are shown.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {/* Category Filter */}
          {categories.length > 0 && (
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          )}

          {/* Search Input */}
          <div className="relative min-w-[240px]">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search className="w-3.5 h-3.5" />
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Search in ${department.deptCode}...`}
              className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {isStaff && (
            <Link
              to={`/books?newDept=${department._id}`}
              className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-sm transition whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Book</span>
            </Link>
          )}
        </div>
      </div>

      {/* Books Table */}
      <div className="rounded-2xl bg-slate-900/90 border border-slate-800 overflow-hidden shadow-xl">
        {booksLoading ? (
          <div className="py-16 text-center text-slate-400">
            <div className="w-7 h-7 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-xs">Fetching books for {department.deptCode}...</p>
          </div>
        ) : books.length === 0 ? (
          <div className="p-12 text-center">
            <BookOpen className="w-10 h-10 text-slate-600 mx-auto mb-2" />
            <p className="text-sm font-semibold text-white">No books registered in {department.deptCode} department</p>
            <p className="text-xs text-slate-400 mt-1">
              Use the Add Book feature to assign books to this department.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950/80 text-xs uppercase font-semibold text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">Book ID</th>
                  <th className="py-3.5 px-4">Title</th>
                  <th className="py-3.5 px-4">Author</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4 text-center">Quantity</th>
                  <th className="py-3.5 px-4 text-center">Available</th>
                  <th className="py-3.5 px-4">Shelf</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 font-normal">
                {books.map((book) => (
                  <tr key={book._id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-4 font-mono text-xs font-semibold text-blue-400">
                      {book.bookId}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-white max-w-xs truncate">
                      <div>{book.title}</div>
                      <div className="text-[11px] text-slate-500 font-mono">ISBN: {book.isbn}</div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-300 text-xs">{book.author}</td>
                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-0.5 rounded-lg bg-slate-800 text-[11px] font-medium text-slate-300">
                        {book.category}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center font-semibold text-white">
                      {book.quantity}
                    </td>
                    <td className="py-3.5 px-4 text-center font-semibold text-emerald-400">
                      {book.availableQuantity}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs text-slate-300">
                      {book.shelfNumber}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          book.availableQuantity > 0
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}
                      >
                        {book.availableQuantity > 0 ? 'Available' : 'Out of Stock'}
                      </span>
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

export default DepartmentDetail;
