import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, BookmarkCheck, CalendarClock, CheckCircle2, XCircle } from 'lucide-react';
import { issueService, reservationService } from '../services/circulationService';
import { subscribeToEvents } from '../services/socket';

const statusStyles = {
  Pending: 'border-amber-500/20 bg-amber-500/10 text-amber-400',
  'Ready for Pickup': 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400',
  Fulfilled: 'border-blue-500/20 bg-blue-500/10 text-blue-400',
  Cancelled: 'border-slate-700 bg-slate-800 text-slate-400',
  Expired: 'border-rose-500/20 bg-rose-500/10 text-rose-400',
};

const MyReservations = () => {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [cancellingId, setCancellingId] = useState('');
  const [collectingId, setCollectingId] = useState('');

  const loadReservations = useCallback(async () => {
    try {
      const response = await reservationService.getMine();
      setReservations(response.data || []);
      setError('');
    } catch (err) {
      setError(err.message || 'Unable to load your reservations.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReservations();
  }, [loadReservations]);

  useEffect(() => subscribeToEvents({
    onReservationUpdated: loadReservations,
    onBookUpdated: loadReservations,
  }), [loadReservations]);

  const handleCancel = async (reservation) => {
    setCancellingId(reservation._id);
    setError('');
    setMessage('');
    try {
      const response = await reservationService.cancel(reservation._id);
      setMessage(response.message || 'Reservation cancelled.');
      await loadReservations();
    } catch (err) {
      setError(err.message || 'Unable to cancel this reservation.');
    } finally {
      setCancellingId('');
    }
  };

  const handleCollect = async (reservation) => {
    setCollectingId(reservation._id);
    setError('');
    setMessage('');
    try {
      const response = await issueService.request(reservation.bookId._id);
      setMessage(response.message || 'Book issued successfully.');
      await loadReservations();
    } catch (err) {
      setError(err.message || 'Unable to issue this reservation. It remains available for pickup if the issue was not completed.');
    } finally {
      setCollectingId('');
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-purple-500/20 bg-purple-500/10 px-3 py-1 text-xs font-semibold text-purple-400">
          <BookmarkCheck className="h-3.5 w-3.5" /> My Library
        </div>
        <h1 className="text-2xl font-extrabold text-white sm:text-3xl">My Reservations</h1>
        <p className="mt-1 text-sm text-slate-400">Review your place in the reservation queue and pickup deadline.</p>
      </div>

      {error && (
        <div role="alert" className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-400">
          <AlertCircle className="mr-2 inline h-4 w-4" />{error}
        </div>
      )}
      {message && (
        <div role="status" className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-400">
          <CheckCircle2 className="mr-2 inline h-4 w-4" />{message}
        </div>
      )}

      <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/90 shadow-xl">
        {loading ? (
          <div className="py-16 text-center text-slate-400">Loading your reservations...</div>
        ) : reservations.length === 0 ? (
          <div className="p-12 text-center">
            <BookmarkCheck className="mx-auto mb-3 h-8 w-8 text-slate-600" />
            <p className="font-semibold text-white">No reservations yet</p>
            <p className="mt-1 text-sm text-slate-400">Reserve a book from the catalog when all copies are unavailable.</p>
            <Link to="/books" className="mt-4 inline-flex rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500">
              Browse Books
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm text-slate-300">
              <thead className="border-b border-slate-800 bg-slate-950/80 text-xs font-semibold uppercase text-slate-400">
                <tr>
                  <th className="px-4 py-3.5">Book</th>
                  <th className="px-4 py-3.5">Reservation</th>
                  <th className="px-4 py-3.5">Reserved</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5">Pickup / expiry</th>
                  <th className="px-4 py-3.5">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {reservations.map((reservation) => (
                  <tr key={reservation._id}>
                    <td className="px-4 py-4">
                      {reservation.bookId?._id ? (
                        <Link to={`/books/${reservation.bookId._id}`} className="font-semibold text-white hover:text-blue-400">
                          {reservation.bookId.title}
                        </Link>
                      ) : (
                        <div className="font-semibold text-white">Book unavailable</div>
                      )}
                      <div className="text-xs text-slate-500">
                        {reservation.bookId?.author || ''}
                        {reservation.bookId?.bookId ? ` · ${reservation.bookId.bookId}` : ''}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="font-mono text-xs text-slate-200">{reservation.reservationId}</div>
                      {reservation.status === 'Pending' && (
                        <div className="mt-1 text-xs text-slate-500">Queue position #{reservation.queuePosition || '—'}</div>
                      )}
                    </td>
                    <td className="px-4 py-4 text-xs">{new Date(reservation.reservedAt || reservation.createdAt).toLocaleString()}</td>
                    <td className="px-4 py-4">
                      <span className={`rounded-md border px-2 py-1 text-xs font-semibold ${statusStyles[reservation.status] || statusStyles.Pending}`}>
                        {reservation.status}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-xs">
                      {reservation.readyAt ? (
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-emerald-400"><CalendarClock className="h-3.5 w-3.5" />Ready {new Date(reservation.readyAt).toLocaleString()}</div>
                          {reservation.expiresAt && <div className="text-slate-400">Collect by {new Date(reservation.expiresAt).toLocaleString()}</div>}
                        </div>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-2">
                        {reservation.status === 'Ready for Pickup' && reservation.bookId?._id && (
                          <button
                            type="button"
                            onClick={() => handleCollect(reservation)}
                            disabled={collectingId === reservation._id || cancellingId === reservation._id}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
                          >
                            {collectingId === reservation._id ? 'Issuing...' : 'Collect / Borrow'}
                          </button>
                        )}
                        {['Pending', 'Ready for Pickup'].includes(reservation.status) && (
                          <button
                            type="button"
                            onClick={() => handleCancel(reservation)}
                            disabled={cancellingId === reservation._id || collectingId === reservation._id}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-400 hover:bg-rose-500/20 disabled:opacity-50"
                          >
                            <XCircle className="h-3.5 w-3.5" />
                            {cancellingId === reservation._id ? 'Cancelling...' : 'Cancel'}
                          </button>
                        )}
                        {!['Pending', 'Ready for Pickup'].includes(reservation.status) && '—'}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};

export default MyReservations;
