import React, { useCallback, useEffect, useState } from 'react';
import {
  BookOpen,
  AlertCircle,
  CheckCircle2,
  RotateCcw,
  Clock,
  Send,
  FileText,
  BookmarkCheck,
  X,
} from 'lucide-react';
import {
  issueService,
  reservationService,
  returnService,
  bookRequestService,
} from '../services/circulationService';
import { subscribeToEvents } from '../services/socket';

const MyBooks = () => {
  const [borrowedBooks, setBorrowedBooks] = useState([]);
  const [requests, setRequests] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);

  const [returningId, setReturningId] = useState('');
  const [cancellingResId, setCancellingResId] = useState('');
  const [cancellingReqId, setCancellingReqId] = useState('');

  const [confirmReturnId, setConfirmReturnId] = useState('');
  const [confirmCancelResId, setConfirmCancelResId] = useState('');
  const [confirmCancelReqId, setConfirmCancelReqId] = useState('');

  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const loadLibraryData = useCallback(async () => {
    try {
      const [issuesResponse, requestsResponse, reservationsResponse] = await Promise.all([
        issueService.getAll({ limit: 100 }),
        bookRequestService.getMine(),
        reservationService.getMine(),
      ]);
      setBorrowedBooks(issuesResponse.data || []);
      setRequests(requestsResponse.data || []);
      setReservations(reservationsResponse.data || []);
    } catch (err) {
      setError(err.message || 'Unable to load your library records.');
    }
  }, []);

  useEffect(() => {
    loadLibraryData().finally(() => setLoading(false));
  }, [loadLibraryData]);

  // Real-time updates
  useEffect(() => {
    const unsubscribe = subscribeToEvents({
      onRequestUpdated: () => loadLibraryData(),
      onReservationUpdated: () => loadLibraryData(),
      onIssueUpdated: () => loadLibraryData(),
      onBookUpdated: () => loadLibraryData(),
    });
    return unsubscribe;
  }, [loadLibraryData]);

  const handleReturn = async () => {
    setReturningId(confirmReturnId);
    setError('');
    setMessage('');
    try {
      const response = await returnService.create({ issueId: confirmReturnId });
      setMessage(response.message || 'Book returned successfully.');
      setConfirmReturnId('');
      await loadLibraryData();
    } catch (err) {
      setError(err.message || 'Unable to return the book.');
    } finally {
      setReturningId('');
    }
  };

  const handleCancelReservation = async () => {
    setCancellingResId(confirmCancelResId);
    setError('');
    setMessage('');
    try {
      const response = await reservationService.cancel(confirmCancelResId);
      setMessage(response.message || 'Reservation cancelled successfully.');
      setConfirmCancelResId('');
      await loadLibraryData();
    } catch (err) {
      setError(err.message || 'Unable to cancel reservation.');
    } finally {
      setCancellingResId('');
    }
  };

  const handleCancelRequest = async () => {
    setCancellingReqId(confirmCancelReqId);
    setError('');
    setMessage('');
    try {
      const response = await bookRequestService.cancel(confirmCancelReqId);
      setMessage(response.message || 'Book request cancelled successfully.');
      setConfirmCancelReqId('');
      await loadLibraryData();
    } catch (err) {
      setError(err.message || 'Unable to cancel request.');
    } finally {
      setCancellingReqId('');
    }
  };

  // Build unified "My Book Activity" timeline
  const activityList = [
    ...requests.map((r) => ({
      id: r._id,
      bookTitle: r.bookId?.title || 'Book',
      isbn: r.bookId?.isbn || '',
      action: 'Requested',
      date: r.requestedAt || r.createdAt,
      status: r.status,
      badgeColor:
        r.status === 'Approved'
          ? 'text-emerald-400 border-emerald-500/20 bg-emerald-500/10'
          : r.status === 'Pending Approval'
          ? 'text-amber-400 border-amber-500/20 bg-amber-500/10'
          : r.status === 'Issued'
          ? 'text-blue-400 border-blue-500/20 bg-blue-500/10'
          : 'text-rose-400 border-rose-500/20 bg-rose-500/10',
    })),
    ...reservations.map((r) => ({
      id: r._id,
      bookTitle: r.bookId?.title || 'Book',
      isbn: r.bookId?.isbn || '',
      action: 'Reserved',
      date: r.reservedAt || r.createdAt,
      status:
        r.status === 'Ready for Pickup'
          ? 'Ready for Pickup'
          : `Pending (Queue #${r.queuePosition || 1})`,
      badgeColor:
        r.status === 'Ready for Pickup'
          ? 'text-emerald-400 border-emerald-500/20 bg-emerald-500/10'
          : 'text-purple-400 border-purple-500/20 bg-purple-500/10',
    })),
    ...borrowedBooks.map((b) => ({
      id: b._id,
      bookTitle: b.bookId?.title || 'Book',
      isbn: b.bookId?.isbn || '',
      action: b.status === 'Returned' ? 'Returned' : 'Issued',
      date: b.issueDate,
      status: b.status === 'Returned' ? 'Returned' : 'Borrowed',
      badgeColor:
        b.status === 'Returned'
          ? 'text-emerald-400 border-emerald-500/20 bg-emerald-500/10'
          : 'text-blue-400 border-blue-500/20 bg-blue-500/10',
    })),
  ].sort((a, b) => new Date(b.date) - new Date(a.date));

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div>
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold mb-2">
          <BookOpen className="w-3.5 h-3.5" />
          <span>My Library Desk</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">My Books</h1>
        <p className="text-slate-400 text-sm mt-1">
          Track your book requests, active reservations, borrowed books, and transaction activity.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError('')} className="text-rose-400/80 hover:text-rose-300">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {message && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{message}</span>
          </div>
          <button onClick={() => setMessage('')} className="text-emerald-400/80 hover:text-emerald-300">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 1. Real-time Book Activity Tracking */}
      <section className="space-y-3">
        <div className="flex items-center space-x-2">
          <Clock className="w-5 h-5 text-blue-400" />
          <h2 className="text-lg font-bold text-white">My Book Activity (Real-time Tracking)</h2>
        </div>
        <div className="rounded-2xl bg-slate-900/90 border border-slate-800 overflow-hidden shadow-xl">
          {loading ? (
            <div className="py-12 text-center text-slate-400">Loading activity...</div>
          ) : activityList.length === 0 ? (
            <div className="p-8 text-center text-slate-400">No activity logged yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-950/80 text-xs uppercase font-semibold text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-3.5 px-4">Book Title</th>
                    <th className="py-3.5 px-4">Action</th>
                    <th className="py-3.5 px-4">Date</th>
                    <th className="py-3.5 px-4">Current Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {activityList.slice(0, 10).map((act, idx) => (
                    <tr key={`${act.id}-${idx}`} className="hover:bg-slate-800/40 transition">
                      <td className="py-3.5 px-4 font-semibold text-white">
                        {act.bookTitle}
                        <span className="block text-xs font-normal text-slate-500 font-mono">
                          {act.isbn}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-300">{act.action}</td>
                      <td className="py-3.5 px-4 text-xs text-slate-400">
                        {new Date(act.date).toLocaleDateString()}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${act.badgeColor}`}
                        >
                          {act.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* 2. My Book Requests */}
      <section className="space-y-3">
        <div className="flex items-center space-x-2">
          <Send className="w-5 h-5 text-amber-400" />
          <h2 className="text-lg font-bold text-white">My Requests</h2>
        </div>
        <div className="rounded-2xl bg-slate-900/90 border border-slate-800 overflow-hidden shadow-xl">
          {loading ? (
            <div className="py-12 text-center text-slate-400">Loading requests...</div>
          ) : requests.length === 0 ? (
            <div className="p-8 text-center text-slate-400">You have no active book requests.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-950/80 text-xs uppercase font-semibold text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-3.5 px-4">Request ID</th>
                    <th className="py-3.5 px-4">Book</th>
                    <th className="py-3.5 px-4">Requested Date</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {requests.map((item) => (
                    <tr key={item._id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3.5 px-4 font-mono text-xs text-blue-400 font-semibold">
                        {item.requestId}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-white">{item.bookId?.title}</div>
                        <div className="text-xs text-slate-500">{item.bookId?.author}</div>
                      </td>
                      <td className="py-3.5 px-4 text-xs">
                        {new Date(item.requestedAt || item.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3.5 px-4 text-xs font-semibold">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                            item.status === 'Approved'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : item.status === 'Pending Approval'
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                              : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        {['Pending Approval', 'Approved'].includes(item.status) && (
                          <button
                            type="button"
                            onClick={() => setConfirmCancelReqId(item._id)}
                            className="px-3 py-1 rounded-lg border border-slate-700 text-xs font-semibold text-slate-300 hover:bg-slate-800 transition"
                          >
                            Cancel Request
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* 3. My Reservations */}
      <section className="space-y-3">
        <div className="flex items-center space-x-2">
          <BookmarkCheck className="w-5 h-5 text-purple-400" />
          <h2 className="text-lg font-bold text-white">My Advance Reservations</h2>
        </div>
        <div className="rounded-2xl bg-slate-900/90 border border-slate-800 overflow-hidden shadow-xl">
          {loading ? (
            <div className="py-12 text-center text-slate-400">Loading reservations...</div>
          ) : reservations.length === 0 ? (
            <div className="p-8 text-center text-slate-400">You have no advance reservations.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-950/80 text-xs uppercase font-semibold text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-3.5 px-4">Book Title</th>
                    <th className="py-3.5 px-4">Reserved Date</th>
                    <th className="py-3.5 px-4">Queue Position</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {reservations.map((item) => (
                    <tr key={item._id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-white">
                          {item.bookId?.title || 'Book'}
                        </div>
                        <div className="text-xs text-slate-500">{item.bookId?.author}</div>
                      </td>
                      <td className="py-3.5 px-4 text-xs">
                        {new Date(item.reservedAt).toLocaleDateString()}
                      </td>
                      <td className="py-3.5 px-4 text-xs font-semibold text-purple-400">
                        {item.status === 'Ready for Pickup' ? 'Position #1 (Pickup Ready)' : `Position #${item.queuePosition || 1}`}
                      </td>
                      <td className="py-3.5 px-4 text-xs">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                            item.status === 'Ready for Pickup'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 animate-pulse'
                              : 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        {['Pending', 'Approved', 'Ready for Pickup', 'Available'].includes(item.status) && (
                          <button
                            type="button"
                            onClick={() => setConfirmCancelResId(item._id)}
                            className="px-3 py-1 rounded-lg border border-slate-700 text-xs font-semibold text-slate-300 hover:bg-slate-800 transition"
                          >
                            Cancel Reservation
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* 4. My Borrowed Books */}
      <section className="space-y-3">
        <div className="flex items-center space-x-2">
          <BookOpen className="w-5 h-5 text-blue-400" />
          <h2 className="text-lg font-bold text-white">My Borrowed Books</h2>
        </div>
        <div className="rounded-2xl bg-slate-900/90 border border-slate-800 overflow-hidden shadow-xl">
          {loading ? (
            <div className="py-12 text-center text-slate-400">Loading borrowed books...</div>
          ) : borrowedBooks.length === 0 ? (
            <div className="p-8 text-center text-slate-400">No active or returned book loans.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-950/80 text-xs uppercase font-semibold text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-3.5 px-4">Book Title</th>
                    <th className="py-3.5 px-4">Issue Date</th>
                    <th className="py-3.5 px-4">Due Date</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Fine</th>
                    <th className="py-3.5 px-4">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {borrowedBooks.map((item) => (
                    <tr key={item._id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-white">{item.bookId?.title}</div>
                        <div className="text-xs text-slate-500">ISBN: {item.bookId?.isbn}</div>
                      </td>
                      <td className="py-3.5 px-4 text-xs">
                        {new Date(item.issueDate).toLocaleDateString()}
                      </td>
                      <td className="py-3.5 px-4 text-xs">
                        {new Date(item.dueDate).toLocaleDateString()}
                      </td>
                      <td className="py-3.5 px-4 text-xs">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                            item.status === 'Returned'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : item.isOverdue || item.status === 'Overdue'
                              ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                              : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-xs">
                        ₹
                        {item.status === 'Returned'
                          ? item.returnDetails?.fineAmount || 0
                          : item.currentFine || 0}
                      </td>
                      <td className="py-3.5 px-4">
                        {['Issued', 'Overdue'].includes(item.status) ? (
                          <button
                            type="button"
                            onClick={() => setConfirmReturnId(item._id)}
                            disabled={Boolean(returningId)}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-500 transition disabled:opacity-60"
                          >
                            <RotateCcw className="h-3.5 w-3.5" /> Return Book
                          </button>
                        ) : (
                          <span className="text-slate-500">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* Confirmation Modals */}
      {confirmReturnId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-white">Return Book</h2>
            <p className="mt-2 text-sm text-slate-400">
              Confirm return for this book loan. The copy will be restored to catalog inventory or assigned to the next reservation queue position.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmReturnId('')}
                disabled={Boolean(returningId)}
                className="rounded-lg border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReturn}
                disabled={Boolean(returningId)}
                className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-60"
              >
                {returningId ? 'Returning...' : 'Confirm Return'}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmCancelResId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-white">Cancel Reservation?</h2>
            <p className="mt-2 text-sm text-slate-400">
              Your position in the reservation queue will be released.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmCancelResId('')}
                disabled={Boolean(cancellingResId)}
                className="rounded-lg border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800"
              >
                Keep Reservation
              </button>
              <button
                type="button"
                onClick={handleCancelReservation}
                disabled={Boolean(cancellingResId)}
                className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-500 disabled:opacity-60"
              >
                {cancellingResId ? 'Cancelling...' : 'Confirm Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmCancelReqId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-white">Cancel Book Request?</h2>
            <p className="mt-2 text-sm text-slate-400">
              Are you sure you want to cancel your pending book request?
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmCancelReqId('')}
                disabled={Boolean(cancellingReqId)}
                className="rounded-lg border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800"
              >
                Keep Request
              </button>
              <button
                type="button"
                onClick={handleCancelRequest}
                disabled={Boolean(cancellingReqId)}
                className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-500 disabled:opacity-60"
              >
                {cancellingReqId ? 'Cancelling...' : 'Confirm Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyBooks;
