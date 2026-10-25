import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, BookmarkCheck, RefreshCw, XCircle } from 'lucide-react';
import { reservationService } from '../services/circulationService';

const Reservations = () => {
  const [reservations, setReservations] = useState([]);
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [cancellingId, setCancellingId] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    reservationService.getAll({ status })
      .then((response) => {
        if (active) setReservations(response.data || []);
      })
      .catch((err) => {
        if (active) setError(err.message || 'Unable to load reservations. Please try again.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [status]);

  const filteredReservations = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return reservations;
    return reservations.filter((item) => [
      item.reservationId,
      item.bookId?.title,
      item.bookId?.bookId,
      item.memberId?.name,
      item.memberId?.registerNumber,
      item.memberId?.employeeId,
      item.userId?.name,
      item.userId?.email,
    ].some((value) => String(value || '').toLowerCase().includes(query)));
  }, [reservations, search]);

  const handleCancel = async (item) => {
    setCancellingId(item._id);
    setError('');
    setMessage('');
    try {
      await reservationService.cancel(item._id, 'Cancelled by library staff');
      setMessage(`Reservation ${item.reservationId} cancelled.`);
      const response = await reservationService.getAll({ status });
      setReservations(response.data || []);
    } catch (err) {
      setError(err.message || 'Unable to cancel this reservation.');
    } finally {
      setCancellingId('');
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-400">
            <BookmarkCheck className="h-3.5 w-3.5" /> Circulation Desk
          </div>
          <h1 className="text-2xl font-extrabold text-white sm:text-3xl">Book Reservations</h1>
          <p className="mt-1 text-sm text-slate-400">FIFO queue. Returned copies are offered to the next borrower automatically; pickup reservations expire according to library settings.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <label>
            <span className="sr-only">Search reservations</span>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search book or borrower" className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white sm:w-56" />
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <span className="sr-only">Filter reservations by status</span>
            <select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white">
            <option value="all">All statuses</option>
            <option value="Pending">Pending</option>
            <option value="Ready for Pickup">Ready for Pickup</option>
            <option value="Fulfilled">Fulfilled</option>
            <option value="Cancelled">Cancelled</option>
            <option value="Expired">Expired</option>
          </select>
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
          </label>
        </div>
      </div>

      {error && <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-400"><AlertCircle className="mr-2 inline h-4 w-4" />{error}</div>}
      {message && <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-400">{message}</div>}

      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/90 shadow-xl">
        {loading ? (
          <div className="py-16 text-center text-slate-400">Loading reservation queue...</div>
        ) : filteredReservations.length === 0 ? (
          <div className="p-12 text-center text-slate-400">No reservations match this search and status.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[780px] text-left text-sm text-slate-300">
              <thead className="border-b border-slate-800 bg-slate-950/80 text-xs font-semibold uppercase text-slate-400">
                <tr>
                  <th className="px-4 py-3.5">Queue</th>
                  <th className="px-4 py-3.5">Book</th>
                  <th className="px-4 py-3.5">Member</th>
                  <th className="px-4 py-3.5">Reserved</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5">Availability</th>
                  <th className="px-4 py-3.5">Pickup / expiry</th>
                  <th className="px-4 py-3.5">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {filteredReservations.map((item) => (
                  <tr key={item._id}>
                    <td className="px-4 py-3.5">{item.status === 'Pending' ? item.queuePosition || '-' : '-'}</td>
                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-white">{item.bookId?.title || 'Book unavailable'}</div>
                      <div className="text-xs text-slate-500">{item.bookId?.author || ''} · {item.reservationId}</div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="font-medium text-white">{item.memberId?.name || item.userId?.name || 'Member'}</div>
                      <div className="text-xs text-slate-500">{item.memberId?.registerNumber || item.memberId?.employeeId || item.userId?.email || item.memberType}</div>
                    </td>
                    <td className="px-4 py-3.5 text-xs">{new Date(item.reservedAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3.5">
                      <span className={`rounded-md border px-2 py-1 text-xs font-semibold ${item.status === 'Ready for Pickup' ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400' : item.status === 'Pending' ? 'border-amber-500/20 bg-amber-500/10 text-amber-400' : item.status === 'Fulfilled' ? 'border-blue-500/20 bg-blue-500/10 text-blue-400' : item.status === 'Expired' ? 'border-rose-500/20 bg-rose-500/10 text-rose-400' : 'border-slate-700 bg-slate-800 text-slate-300'}`}>{item.status}</span>
                    </td>
                    <td className="px-4 py-3.5 text-xs">{item.bookId?.availableQuantity ?? 0} / {item.bookId?.quantity ?? 0} copies</td>
                    <td className="px-4 py-3.5 text-xs">
                      {item.readyAt && <div>Ready {new Date(item.readyAt).toLocaleString()}</div>}
                      {item.expiresAt && <div>Expires {new Date(item.expiresAt).toLocaleString()}</div>}
                      {!item.readyAt && '—'}
                    </td>
                    <td className="px-4 py-3.5">
                      {['Pending', 'Ready for Pickup'].includes(item.status) ? (
                        <button
                          type="button"
                          onClick={() => handleCancel(item)}
                          disabled={cancellingId === item._id}
                          className="inline-flex items-center gap-1 rounded-lg border border-rose-500/20 bg-rose-500/10 px-2.5 py-1.5 text-xs font-semibold text-rose-400 disabled:opacity-50"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          {cancellingId === item._id ? 'Cancelling...' : 'Cancel'}
                        </button>
                      ) : '—'}
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

export default Reservations;