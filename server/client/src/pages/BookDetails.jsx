import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Heart,
  LockKeyhole,
  RotateCcw,
  Send,
  Clock,
  BookmarkCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import bookService from '../services/bookService';
import bookRequestService from '../services/bookRequestService';
import { issueService, reservationService, wishlistService } from '../services/circulationService';
import { subscribeToEvents } from '../services/socket';

const formatPrice = (price) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
  }).format(Number(price) || 0);

const availabilityStyles = {
  emerald: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
  amber: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
  rose: 'bg-rose-500/10 border-rose-500/20 text-rose-400',
};

const BookDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [book, setBook] = useState(null);
  const [loan, setLoan] = useState(null);
  const [request, setRequest] = useState(null);
  const [reservation, setReservation] = useState(null);
  const [wishlisted, setWishlisted] = useState(false);

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const isMember = ['student', 'faculty'].includes(user?.role);
  const isStaff = ['admin', 'librarian'].includes(user?.role);

  const loadBook = useCallback(async () => {
    setLoading(true);
    try {
      const response = await bookService.getById(id);
      setBook(response.data);
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to load book details.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  const loadMemberState = useCallback(async () => {
    if (!isMember) return;
    try {
      const [issuesResponse, reqResponse, reservationsResponse, wishlistResponse] =
        await Promise.all([
          issueService.getAll({ status: 'Issued', limit: 100 }),
          bookRequestService.getMine(),
          reservationService.getMine(),
          wishlistService.getMine(),
        ]);

      const activeLoan = (issuesResponse.data || []).find(
        (item) => (item.bookId?._id === id || item.bookId === id) && ['Issued', 'Overdue'].includes(item.status)
      );

      const activeReq = (reqResponse.data || []).find(
        (item) => (item.bookId?._id === id || item.bookId === id) && ['Pending Approval', 'Approved'].includes(item.status)
      );

      const pendingReservation = (reservationsResponse.data || []).find(
        (item) => (item.bookId?._id === id || item.bookId === id) && ['Pending', 'Ready for Pickup'].includes(item.status)
      );

      setLoan(activeLoan || null);
      setRequest(activeReq || null);
      setReservation(pendingReservation || null);
      setWishlisted((wishlistResponse.data || []).some((item) => (item.bookId?._id === id || item.bookId === id)));
    } catch (err) {
      setError(err.message || 'Failed to load your book status.');
    }
  }, [id, isMember]);

  useEffect(() => {
    loadBook();
  }, [loadBook]);

  useEffect(() => {
    loadMemberState();
  }, [loadMemberState]);

  // Real-time socket events
  useEffect(() => {
    const unsubscribe = subscribeToEvents({
      onBookUpdated: () => loadBook(),
      onRequestUpdated: () => {
        loadBook();
        loadMemberState();
      },
      onReservationUpdated: () => {
        loadBook();
        loadMemberState();
      },
      onIssueUpdated: () => {
        loadBook();
        loadMemberState();
      },
    });
    return unsubscribe;
  }, [loadBook, loadMemberState]);

  const availability = useMemo(() => {
    if (!book) return null;
    if (book.availableQuantity <= 0) return { label: 'Currently Unavailable', tone: 'rose' };
    if (book.availableQuantity < book.quantity) return { label: 'Partially Available', tone: 'amber' };
    return { label: 'Available', tone: 'emerald' };
  }, [book]);

  const runAction = async (action, successMessage) => {
    setActionLoading(true);
    setError('');
    setMessage('');
    try {
      await action();
      setMessage(successMessage);
      await Promise.all([loadBook(), loadMemberState()]);
    } catch (err) {
      setError(err.message || 'Unable to complete this action.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRequest = () =>
    runAction(
      () => bookRequestService.create(id),
      'Book request submitted successfully. Awaiting librarian approval.'
    );

  const handleReserve = () =>
    runAction(
      () => reservationService.create(id),
      'Book reserved successfully. Check My Reservations for your queue position.'
    );

  const handleWishlist = () =>
    runAction(async () => {
      if (wishlisted) {
        await wishlistService.remove(id);
        setWishlisted(false);
      } else {
        await wishlistService.add(id);
        setWishlisted(true);
      }
    }, wishlisted ? 'Book removed from wishlist.' : 'Book added to wishlist.');

  if (loading) return <div className="py-24 text-center text-slate-400">Loading book details...</div>;
  if (!book) {
    return (
      <div className="p-8 max-w-xl mx-auto text-center text-rose-400">
        <AlertCircle className="mx-auto mb-3" />
        <p>{error || 'Book not found.'}</p>
      </div>
    );
  }

  const isUnavailable = book.availableQuantity <= 0;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <Link
        to="/books"
        className="inline-flex items-center text-xs font-semibold text-slate-400 hover:text-white transition"
      >
        <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Books Catalog
      </Link>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
          <AlertCircle className="w-4 h-4 inline mr-2" />
          {error}
        </div>
      )}
      {message && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
          <CheckCircle2 className="w-4 h-4 inline mr-2" />
          {message}
        </div>
      )}

      <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col md:flex-row gap-8">
          <div className="w-full md:w-48 h-64 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
            <BookOpen className="w-20 h-20 text-blue-400" />
          </div>
          <div className="flex-1 space-y-5">
            <div>
              <p className="text-xs uppercase tracking-wider font-semibold text-blue-400">{book.category}</p>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-2">{book.title}</h1>
              <p className="text-sm text-slate-400 mt-2">by {book.author}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-slate-500">Book ID:</span>{' '}
                <span className="text-blue-400 font-mono font-semibold">{book.bookId}</span>
              </div>
              <div>
                <span className="text-slate-500">ISBN:</span>{' '}
                <span className="text-slate-200">{book.isbn}</span>
              </div>
              <div>
                <span className="text-slate-500">Department:</span>{' '}
                <span className="text-slate-200 font-semibold">{book.departmentId?.name} ({book.departmentId?.deptCode})</span>
              </div>
              <div>
                <span className="text-slate-500">Publisher:</span>{' '}
                <span className="text-slate-200">{book.publisher}</span>
              </div>
              <div>
                <span className="text-slate-500">Publication Year:</span>{' '}
                <span className="text-slate-200">{book.publicationYear}</span>
              </div>
              <div>
                <span className="text-slate-500">Price:</span>{' '}
                <span className="text-white font-bold">{formatPrice(book.price)}</span>
              </div>
            </div>

            <div className={`p-4 rounded-2xl border ${availabilityStyles[availability.tone]}`}>
              <div className="text-sm font-bold">{availability.label}</div>
              <div className="text-xs text-slate-300 mt-1">
                {book.availableQuantity} of {book.quantity} copies available in stacks
              </div>
            </div>

            {!isStaff && (
              <div className="flex flex-wrap gap-3">
                {user ? (
                  <>
                    {loan ? (
                      <button
                        onClick={() => navigate('/my-reservations')}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-semibold transition"
                      >
                        <BookmarkCheck className="w-4 h-4" /> Currently Borrowed (Due: {new Date(loan.dueDate).toLocaleDateString()})
                      </button>
                    ) : request ? (
                      request.status === 'Approved' ? (
                        <button
                          onClick={() => navigate('/my-reservations')}
                          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition"
                        >
                          <CheckCircle2 className="w-4 h-4" /> Request Approved – Collect Book
                        </button>
                      ) : (
                        <button
                          disabled
                          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm font-semibold cursor-default"
                        >
                          <Clock className="w-4 h-4" /> Request Pending Approval
                        </button>
                      )
                    ) : reservation ? (
                      reservation.status === 'Ready for Pickup' ? (
                        <button
                          onClick={() => navigate('/my-books')}
                          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition animate-pulse"
                        >
                          <CheckCircle2 className="w-4 h-4" /> Ready for Pickup!
                        </button>
                      ) : (
                        <button
                          disabled
                          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 text-sm font-semibold cursor-default"
                        >
                          <LockKeyhole className="w-4 h-4" /> Reservation Active (Queue #{reservation.queuePosition || 1})
                        </button>
                      )
                    ) : !isUnavailable ? (
                      <button
                        onClick={handleRequest}
                        disabled={actionLoading}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold shadow-lg shadow-blue-600/30 transition disabled:opacity-60"
                      >
                        <Send className="w-4 h-4" />
                        {actionLoading ? 'Submitting...' : 'Request Book'}
                      </button>
                    ) : (
                      <button
                        onClick={handleReserve}
                        disabled={actionLoading}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold shadow-lg shadow-purple-600/30 transition disabled:opacity-60"
                      >
                        <RotateCcw className="w-4 h-4" />
                        {actionLoading ? 'Reserving...' : 'Reserve Book'}
                      </button>
                    )}

                    <button
                      onClick={handleWishlist}
                      disabled={actionLoading}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 text-sm font-semibold transition disabled:opacity-60"
                    >
                      <Heart className={`w-4 h-4 ${wishlisted ? 'fill-rose-400 text-rose-400' : ''}`} />
                      {wishlisted ? 'Remove from Wishlist' : 'Add to Wishlist'}
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => navigate('/login')}
                      className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold"
                    >
                      Login to {isUnavailable ? 'Reserve' : 'Request'}
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookDetails;