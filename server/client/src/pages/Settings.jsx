import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import settingService from '../services/settingService';
import {
  Settings as SettingsIcon,
  Save,
  CheckCircle2,
  AlertCircle,
  X,
  Building2,
  ReceiptIndianRupee,
  BookOpen,
  Mail,
  Phone,
  MapPin,
  Clock,
  ShieldAlert,
} from 'lucide-react';

const Settings = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [formData, setFormData] = useState({
    libraryName: 'Apex Institute of Technology Central Library',
    finePerDay: 2,
    studentBorrowingLimit: 3,
    facultyBorrowingLimit: 5,
    maxIssuePeriodDays: 14,
    contactEmail: 'library@apexinstitute.edu',
    contactPhone: '+91 98765 43210',
    address: 'Academic Complex A, Central Library Hall, Bangalore',
  });

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true);
        const res = await settingService.get();
        if (res.data) {
          setFormData({
            libraryName: res.data.libraryName || '',
            finePerDay: res.data.finePerDay || 2,
            studentBorrowingLimit: res.data.studentBorrowingLimit || 3,
            facultyBorrowingLimit: res.data.facultyBorrowingLimit || 5,
            maxIssuePeriodDays: res.data.maxIssuePeriodDays || 14,
            contactEmail: res.data.contactEmail || '',
            contactPhone: res.data.contactPhone || '',
            address: res.data.address || '',
          });
        }
      } catch (err) {
        setError(err.message || 'Failed to load system settings.');
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isAdmin) {
      setError('Only administrators can modify system settings.');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      setSuccessMsg('');
      const res = await settingService.update(formData);
      setSuccessMsg(res.message || 'System settings saved successfully!');
    } catch (err) {
      setError(err.message || 'Failed to update settings.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center text-slate-400">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <p className="text-sm font-medium">Loading system configurations...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold mb-2">
          <SettingsIcon className="w-3.5 h-3.5" />
          <span>System Configuration</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Library Policies & Global Settings
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Configure circulation parameters, borrowing limits, daily overdue penalty rates, and institution details.
        </p>
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

      {/* Settings Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Library Identity */}
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center space-x-2 pb-3 border-b border-slate-800">
            <Building2 className="w-5 h-5 text-blue-400" />
            <h2 className="text-base font-bold text-white">Library Identity & Branding</h2>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Institution / Library Name *
            </label>
            <input
              type="text"
              required
              disabled={!isAdmin}
              value={formData.libraryName}
              onChange={(e) => setFormData({ ...formData, libraryName: e.target.value })}
              className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Official Contact Email
              </label>
              <input
                type="email"
                disabled={!isAdmin}
                value={formData.contactEmail}
                onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Support Phone Number
              </label>
              <input
                type="text"
                disabled={!isAdmin}
                value={formData.contactPhone}
                onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Campus Address / Location
            </label>
            <input
              type="text"
              disabled={!isAdmin}
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
            />
          </div>
        </div>

        {/* Section 2: Circulation Rules & Fines */}
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center space-x-2 pb-3 border-b border-slate-800">
            <ReceiptIndianRupee className="w-5 h-5 text-amber-400" />
            <h2 className="text-base font-bold text-white">Circulation Policy & Overdue Fines</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Fine Rate per Overdue Day (₹) *
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  required
                  disabled={!isAdmin}
                  value={formData.finePerDay}
                  onChange={(e) => setFormData({ ...formData, finePerDay: parseFloat(e.target.value) })}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Applied dynamically per day for overdue returns. Default: ₹5/day.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Maximum Loan Period (Days) *
              </label>
              <input
                type="number"
                min="1"
                required
                disabled={!isAdmin}
                value={formData.maxIssuePeriodDays}
                onChange={(e) => setFormData({ ...formData, maxIssuePeriodDays: parseInt(e.target.value, 10) })}
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Standard duration before a loan is flagged overdue. Default: 14 days.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Student Borrowing Limit (Books) *
              </label>
              <input
                type="number"
                min="1"
                required
                disabled={!isAdmin}
                value={formData.studentBorrowingLimit}
                onChange={(e) => setFormData({ ...formData, studentBorrowingLimit: parseInt(e.target.value, 10) })}
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Maximum simultaneous active book loans for student members. Default: 3.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Faculty Borrowing Limit (Books) *
              </label>
              <input
                type="number"
                min="1"
                required
                disabled={!isAdmin}
                value={formData.facultyBorrowingLimit}
                onChange={(e) => setFormData({ ...formData, facultyBorrowingLimit: parseInt(e.target.value, 10) })}
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Maximum simultaneous active book loans for faculty members. Default: 5.
              </p>
            </div>
          </div>
        </div>

        {/* Save Button for Admin */}
        {isAdmin && (
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-semibold shadow-lg shadow-blue-600/30 transition disabled:opacity-50 flex items-center space-x-2"
            >
              {submitting ? (
                <span>Saving Settings...</span>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Configuration</span>
                </>
              )}
            </button>
          </div>
        )}
      </form>
    </div>
  );
};

export default Settings;
