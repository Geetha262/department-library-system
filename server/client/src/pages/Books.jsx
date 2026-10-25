import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useSearchParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import bookService from '../services/bookService';
import departmentService from '../services/departmentService';
import bookRequestService from '../services/bookRequestService';
import { reservationService, issueService } from '../services/circulationService';
import { subscribeToEvents } from '../services/socket';
import {
  BookOpen,
  Search,
  Plus,
  Edit2,
  Trash2,
  Building2,
  CheckCircle2,
  AlertCircle,
  X,
  BookmarkCheck,
  Send,
  Clock,
  RotateCcw,
} from 'lucide-react';

const Books = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isStaff = ['admin', 'librarian'].includes(user?.role);
  const isAdmin = user?.role === 'admin';
  const isMember = ['student', 'faculty'].includes(user?.role);

  const [searchParams] = useSearchParams();
  const queryDept = searchParams.get('newDept') || searchParams.get('dept') || 'all';

  const [books, setBooks] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Member states for dynamic button tracking
  const [myRequests, setMyRequests] = useState([]);
  const [myReservations, setMyReservations] = useState([]);
  const [myLoans, setMyLoans] = useState([]);
  const [actionBookId, setActionBookId] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState(queryDept);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedAvailability, setSelectedAvailability] = useState('all');

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBook, setEditingBook] = useState(null);
  const [formData, setFormData] = useState({
    bookId: '',
    isbn: '',
    title: '',
    author: '',
    publisher: '',
    category: '',
    departmentId: '',
    edition: '1st Edition',
    publicationYear: new Date().getFullYear(),
    quantity: 5,
    shelfNumber: '',
    price: 500,
  });
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  // Fetch initial metadata
  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const [deptRes, catRes] = await Promise.all([
          departmentService.getAll(),
          bookService.getCategories(),
        ]);
        setDepartments(deptRes.data || []);
        setCategories(catRes.data || []);

        if (searchParams.get('newDept')) {
          setFormData((prev) => ({ ...prev, departmentId: searchParams.get('newDept') }));
          setModalOpen(true);
        }
      } catch (err) {
        console.error('Failed to load initial metadata:', err);
      }
    };
    fetchMetadata();
  }, []);

  // Fetch catalog books
  const fetchBooks = useCallback(async () => {
    try {
      setLoading(true);
      const res = await bookService.getAll({
        search,
        department: selectedDept !== 'all' ? selectedDept : undefined,
        category: selectedCategory !== 'all' ? selectedCategory : undefined,
        availability: selectedAvailability !== 'all' ? selectedAvailability : undefined,
      });
      setBooks(res.data || []);
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to fetch books.');
    } finally {
      setLoading(false);
    }
  }, [search, selectedDept, selectedCategory, selectedAvailability]);

  // Fetch member specific active requests, reservations, and loans
  const loadMemberState = useCallback(async () => {
    if (!isMember) return;
    try {
      const [reqRes, resRes, issueRes] = await Promise.all([
        bookRequestService.getMine(),
        reservationService.getMine(),
        issueService.getAll({ limit: 100 }),
      ]);
      setMyRequests(reqRes.data || []);
      setMyReservations(resRes.data || []);
      setMyLoans(issueRes.data || []);
    } catch (err) {
      console.warn('Could not refresh member activity:', err.message);
    }
  }, [isMember]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchBooks();
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchBooks]);

  useEffect(() => {
    loadMemberState();
  }, [loadMemberState]);

  // Subscribe to real-time events via Socket.IO
  useEffect(() => {
    const unsubscribe = subscribeToEvents({
      onBookUpdated: () => fetchBooks(),
      onRequestUpdated: () => {
        fetchBooks();
        loadMemberState();
      },
      onReservationUpdated: () => {
        fetchBooks();
        loadMemberState();
      },
      onIssueUpdated: () => {
        fetchBooks();
        loadMemberState();
      },
    });
    return unsubscribe;
  }, [fetchBooks, loadMemberState]);

  const handleOpenAdd = () => {
    setEditingBook(null);
    setFormData({
      bookId: '',
      isbn: '',
      title: '',
      author: '',
      publisher: '',
      category: '',
      departmentId: departments[0]?._id || '',
      edition: '1st Edition',
      publicationYear: new Date().getFullYear(),
      quantity: 5,
      shelfNumber: '',
      price: 500,
    });
    setModalOpen(true);
    setError('');
  };

  const handleOpenEdit = (book) => {
    setEditingBook(book);
    setFormData({
      bookId: book.bookId,
      isbn: book.isbn,
      title: book.title,
      author: book.author,
      publisher: book.publisher,
      category: book.category,
      departmentId: book.departmentId?._id || book.departmentId,
      edition: book.edition || '1st Edition',
      publicationYear: book.publicationYear || new Date().getFullYear(),
      quantity: book.quantity,
      shelfNumber: book.shelfNumber,
      price: book.price || 0,
    });
    setModalOpen(true);
    setError('');
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccessMsg('');

    try {
      if (editingBook) {
        await bookService.update(editingBook._id, formData);
        setSuccessMsg(`Book "${formData.title}" updated successfully.`);
      } else {
        await bookService.create(formData);
        setSuccessMsg(`Book "${formData.title}" added to catalog.`);
      }
      setModalOpen(false);
      fetchBooks();
    } catch (err) {
      setError(err.message || 'Error saving book.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id, title) => {
    try {
      setError('');
      await bookService.delete(id);
      setDeleteConfirmId(null);
      setSuccessMsg(`Book "${title}" removed from catalog.`);
      fetchBooks();
    } catch (err) {
      setError(err.message || 'Cannot delete book.');
      setDeleteConfirmId(null);
    }
  };

  // Student Actions
  const handleRequestBook = async (book) => {
    setActionBookId(book._id);
    setError('');
    setSuccessMsg('');
    try {
      const res = await bookRequestService.create(book._id);
      setSuccessMsg(res.message || `Request for "${book.title}" submitted. Awaiting approval.`);
      await Promise.all([fetchBooks(), loadMemberState()]);
    } catch (err) {
      setError(err.message || 'Failed to submit book request.');
    } finally {
      setActionBookId(null);
    }
  };

  const handleReserveBook = async (book) => {
    setActionBookId(book._id);
    setError('');
    setSuccessMsg('');
    try {
      const res = await reservationService.create(book._id);
      setSuccessMsg(res.message || `Book "${book.title}" reserved successfully.`);
      await Promise.all([fetchBooks(), loadMemberState()]);
    } catch (err) {
      setError(err.message || 'Failed to reserve book.');
    } finally {
      setActionBookId(null);
    }
  };

  const renderActionButton = (book) => {
    if (isStaff) {
      return (
        <div className="flex items-center justify-end space-x-1">
          <button
            onClick={() => handleOpenEdit(book)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            title="Edit Book"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          {isAdmin && (
            <button
              onClick={() => setDeleteConfirmId(book._id)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
              title="Delete Book"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      );
    }

    if (!user) {
      return (
        <Link
          to="/login"
          className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
        >
          Login to Request
        </Link>
      );
    }

    const activeLoan = myLoans.find(
      (l) => (l.bookId?._id === book._id || l.bookId === book._id) && ['Issued', 'Overdue'].includes(l.status)
    );
    if (activeLoan) {
      return (
        <span className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold">
          <BookmarkCheck className="w-3.5 h-3.5" />
          <span>Currently Borrowed</span>
        </span>
      );
    }

    const activeReq = myRequests.find(
      (r) => (r.bookId?._id === book._id || r.bookId === book._id) && ['Pending Approval', 'Approved'].includes(r.status)
    );
    if (activeReq) {
      if (activeReq.status === 'Approved') {
        return (
          <button
            onClick={() => navigate('/my-books')}
            className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Approved – Collect Book</span>
          </button>
        );
      }
      return (
        <span className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold">
          <Clock className="w-3.5 h-3.5" />
          <span>Request Pending</span>
        </span>
      );
    }

    const activeRes = myReservations.find(
      (r) => (r.bookId?._id === book._id || r.bookId === book._id) && ['Pending', 'Ready for Pickup'].includes(r.status)
    );
    if (activeRes) {
      if (activeRes.status === 'Ready for Pickup') {
        return (
          <button
            onClick={() => navigate('/my-reservations')}
            className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition animate-pulse"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Ready for Pickup!</span>
          </button>
        );
      }
      return (
        <span className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-semibold">
          <BookmarkCheck className="w-3.5 h-3.5" />
          <span>Reservation Active (#{activeRes.queuePosition || 1})</span>
        </span>
      );
    }

    if (book.availableQuantity > 0) {
      return (
        <button
          onClick={() => handleRequestBook(book)}
          disabled={actionBookId === book._id}
          className="inline-flex items-center space-x-1 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-600/20 transition disabled:opacity-50"
        >
          <Send className="w-3.5 h-3.5" />
          <span>{actionBookId === book._id ? 'Requesting...' : 'Request Book'}</span>
        </button>
      );
    }

    return (
      <button
        onClick={() => handleReserveBook(book)}
        disabled={actionBookId === book._id}
        className="inline-flex items-center space-x-1 px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-md shadow-purple-600/20 transition disabled:opacity-50"
      >
        <RotateCcw className="w-3.5 h-3.5" />
        <span>{actionBookId === book._id ? 'Reserving...' : 'Reserve Book'}</span>
      </button>
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold mb-2">
            <BookOpen className="w-3.5 h-3.5" />
            <span>Central Catalog</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Department-Wise Books Catalog
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Search, filter, request available books, or reserve currently issued titles across departments.
          </p>
        </div>

        {isStaff && (
          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold shadow-lg shadow-blue-600/30 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Book</span>
          </button>
        )}
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

      {/* Department Filter Tabs */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-none">
        <button
          onClick={() => setSelectedDept('all')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition border ${
            selectedDept === 'all'
              ? 'bg-blue-600 border-blue-500 text-white shadow-md shadow-blue-500/20'
              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          All Departments
        </button>
        {departments.map((dept) => (
          <button
            key={dept._id}
            onClick={() => setSelectedDept(dept._id)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition border ${
              selectedDept === dept._id
                ? 'bg-blue-600 border-blue-500 text-white shadow-md shadow-blue-500/20'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            {dept.deptCode}
          </button>
        ))}
      </div>

      {/* Search & Multi-Facet Filters Bar */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title, author, ISBN, Book ID, category..."
            className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
          />
        </div>

        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <select
          value={selectedAvailability}
          onChange={(e) => setSelectedAvailability(e.target.value)}
          className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Availability</option>
          <option value="available">Available in Stacks</option>
          <option value="unavailable">Out of Stock</option>
        </select>
      </div>

      {/* Books Table */}
      <div className="rounded-2xl bg-slate-900/90 border border-slate-800 overflow-hidden shadow-xl">
        {loading ? (
          <div className="py-16 text-center text-slate-400">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-xs font-medium">Querying books catalog...</p>
          </div>
        ) : books.length === 0 ? (
          <div className="p-12 text-center">
            <BookOpen className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-white">No books match your filters</h3>
            <p className="text-xs text-slate-400 mt-1">Try clearing filters or search for another title.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950/80 text-xs uppercase font-semibold text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">Book ID</th>
                  <th className="py-3.5 px-4">Title & ISBN</th>
                  <th className="py-3.5 px-4">Author</th>
                  <th className="py-3.5 px-4">Department</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4 text-center">Total</th>
                  <th className="py-3.5 px-4 text-center">Available</th>
                  <th className="py-3.5 px-4 text-right">Price</th>
                  <th className="py-3.5 px-4">Shelf</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {books.map((book) => (
                  <tr key={book._id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-4 font-mono text-xs font-semibold text-blue-400">
                      {book.bookId}
                    </td>
                    <td className="py-3.5 px-4">
                      <Link
                        to={`/books/${book._id}`}
                        className="font-medium text-white max-w-xs truncate hover:text-blue-400 transition block"
                      >
                        {book.title}
                      </Link>
                      <div className="text-[11px] text-slate-500 font-mono">ISBN: {book.isbn}</div>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-300">{book.author}</td>
                    <td className="py-3.5 px-4">
                      <Link
                        to={`/departments/${book.departmentId?._id}`}
                        className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 text-xs font-semibold transition"
                      >
                        <Building2 className="w-3 h-3" />
                        <span>{book.departmentId?.deptCode || 'DEPT'}</span>
                      </Link>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded-md bg-slate-800 text-[11px] font-medium text-slate-300">
                        {book.category}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center font-semibold text-white">
                      {book.quantity}
                    </td>
                    <td className="py-3.5 px-4 text-center font-semibold text-emerald-400">
                      {book.availableQuantity}
                    </td>
                    <td className="py-3.5 px-4 text-right font-semibold text-slate-200">
                      {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(
                        book.price || 0
                      )}
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
                    <td className="py-3.5 px-4 text-right">{renderActionButton(book)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 max-w-md w-full rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center space-x-3 text-rose-400">
              <AlertCircle className="w-6 h-6 flex-shrink-0" />
              <h3 className="text-lg font-bold text-white">Delete Book</h3>
            </div>
            <p className="text-sm text-slate-300">
              Are you sure you want to delete this book from catalog? The system will ensure that no active loan records exist.
            </p>
            <div className="flex justify-end space-x-3 pt-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-sm font-medium hover:bg-slate-700 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const target = books.find((b) => b._id === deleteConfirmId);
                  handleDelete(deleteConfirmId, target?.title || '');
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-sm font-medium transition"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Book Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 max-w-2xl w-full rounded-3xl p-6 sm:p-8 shadow-2xl my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <h2 className="text-xl font-bold text-white">
                {editingBook ? `Edit Book (${editingBook.bookId})` : 'Add New Book to Catalog'}
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-4 mt-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Book ID / Accession No *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.bookId}
                    onChange={(e) => setFormData({ ...formData, bookId: e.target.value.toUpperCase() })}
                    placeholder="e.g. BK-CSE-005"
                    className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    ISBN *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.isbn}
                    onChange={(e) => setFormData({ ...formData, isbn: e.target.value })}
                    placeholder="e.g. 978-0131103627"
                    className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Book Title *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. The C Programming Language"
                  className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Author(s) *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.author}
                    onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                    placeholder="e.g. Brian W. Kernighan, Dennis M. Ritchie"
                    className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Publisher *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.publisher}
                    onChange={(e) => setFormData({ ...formData, publisher: e.target.value })}
                    placeholder="e.g. Prentice Hall"
                    className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Department (Strict Association) *
                  </label>
                  <select
                    required
                    value={formData.departmentId}
                    onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- Select Department --</option>
                    {departments.map((d) => (
                      <option key={d._id} value={d._id}>
                        {d.deptCode} - {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Category *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    placeholder="e.g. Programming, Algorithms, Circuits"
                    className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Edition
                  </label>
                  <input
                    type="text"
                    value={formData.edition}
                    onChange={(e) => setFormData({ ...formData, edition: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Year
                  </label>
                  <input
                    type="number"
                    value={formData.publicationYear}
                    onChange={(e) => setFormData({ ...formData, publicationYear: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Quantity *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Price (INR) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Shelf Location *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.shelfNumber}
                    onChange={(e) => setFormData({ ...formData, shelfNumber: e.target.value })}
                    placeholder="e.g. CSE-A1-05"
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
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/30 transition disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : editingBook ? 'Update Book' : 'Add Book'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Books;
