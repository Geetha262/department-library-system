import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { facultyService } from '../services/memberService';
import departmentService from '../services/departmentService';
import {
  Briefcase,
  Search,
  Plus,
  Building2,
  Phone,
  Mail,
  Edit2,
  Trash2,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  X,
  History,
  Clock,
  ReceiptIndianRupee,
  Award,
} from 'lucide-react';

const Faculty = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [facultyList, setFacultyList] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Filters
  const [search, setSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');

  // Add / Edit Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingFaculty, setEditingFaculty] = useState(null);
  const [formData, setFormData] = useState({
    facultyId: '',
    employeeId: '',
    name: '',
    email: '',
    phone: '',
    departmentId: '',
    designation: 'Assistant Professor',
    status: 'Active',
    password: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  // History Drawer State
  const [historyDrawerOpen, setHistoryDrawerOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [selectedFacultyHistory, setSelectedFacultyHistory] = useState(null);

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

  const fetchFaculty = async () => {
    try {
      setLoading(true);
      const res = await facultyService.getAll({
        search,
        department: selectedDept !== 'all' ? selectedDept : undefined,
        status: selectedStatus !== 'all' ? selectedStatus : undefined,
      });
      setFacultyList(res.data || []);
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to fetch faculty.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchFaculty();
    }, 250);
    return () => clearTimeout(timer);
  }, [search, selectedDept, selectedStatus]);

  const handleOpenAdd = () => {
    setEditingFaculty(null);
    setFormData({
      facultyId: '',
      employeeId: '',
      name: '',
      email: '',
      phone: '',
      departmentId: departments[0]?._id || '',
      designation: 'Assistant Professor',
      status: 'Active',
      password: '',
    });
    setModalOpen(true);
    setError('');
  };

  const handleOpenEdit = (faculty) => {
    setEditingFaculty(faculty);
    setFormData({
      facultyId: faculty.facultyId,
      employeeId: faculty.employeeId,
      name: faculty.name,
      email: faculty.email,
      phone: faculty.phone,
      departmentId: faculty.departmentId?._id || faculty.departmentId,
      designation: faculty.designation || 'Assistant Professor',
      status: faculty.status || 'Active',
      password: '',
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
      if (editingFaculty) {
        await facultyService.update(editingFaculty._id, formData);
        setSuccessMsg(`Faculty member "${formData.name}" updated successfully.`);
      } else {
        await facultyService.create(formData);
        setSuccessMsg(`Faculty member "${formData.name}" registered successfully.`);
      }
      setModalOpen(false);
      fetchFaculty();
    } catch (err) {
      setError(err.message || 'Error saving faculty record.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id, name) => {
    try {
      setError('');
      await facultyService.delete(id);
      setDeleteConfirmId(null);
      setSuccessMsg(`Faculty member "${name}" deleted.`);
      fetchFaculty();
    } catch (err) {
      setError(err.message || 'Cannot delete faculty member.');
      setDeleteConfirmId(null);
    }
  };

  const handleViewHistory = async (facultyId) => {
    try {
      setHistoryLoading(true);
      setHistoryDrawerOpen(true);
      const res = await facultyService.getById(facultyId);
      setSelectedFacultyHistory(res.data);
    } catch (err) {
      setError(err.message || 'Failed to fetch borrowing history.');
    } finally {
      setHistoryLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold mb-2">
            <Briefcase className="w-3.5 h-3.5" />
            <span>Faculty Membership</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Faculty Management
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Department-linked professors and researchers with elevated borrowing allowances (5 books).
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold shadow-lg shadow-blue-600/30 transition"
        >
          <Plus className="w-4 h-4" />
          <span>Add Faculty Member</span>
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

      {/* Department Tabs */}
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

      {/* Search & Filters */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Employee ID, Name, Designation, Email..."
            className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
          />
        </div>

        {/* Status Filter */}
        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Statuses</option>
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
          <option value="On Leave">On Leave</option>
        </select>
      </div>

      {/* Faculty Table */}
      <div className="rounded-2xl bg-slate-900/90 border border-slate-800 overflow-hidden shadow-xl">
        {loading ? (
          <div className="py-16 text-center text-slate-400">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-xs font-medium">Fetching faculty list...</p>
          </div>
        ) : facultyList.length === 0 ? (
          <div className="p-12 text-center">
            <Briefcase className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-white">No faculty members found</h3>
            <p className="text-xs text-slate-400 mt-1">Try adjusting search query or filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950/80 text-xs uppercase font-semibold text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">Faculty ID / Emp ID</th>
                  <th className="py-3.5 px-4">Name</th>
                  <th className="py-3.5 px-4">Department</th>
                  <th className="py-3.5 px-4">Designation</th>
                  <th className="py-3.5 px-4">Contact Info</th>
                  <th className="py-3.5 px-4 text-center">Active Loans</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {facultyList.map((faculty) => (
                  <tr key={faculty._id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-4">
                      <div className="font-mono text-xs font-bold text-blue-400">
                        {faculty.employeeId}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono">{faculty.facultyId}</div>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-white">{faculty.name}</td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-semibold">
                        <Building2 className="w-3 h-3" />
                        <span>{faculty.departmentId?.deptCode || 'DEPT'}</span>
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-xs">
                      <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-medium">
                        {faculty.designation}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-xs space-y-0.5">
                      <div className="flex items-center space-x-1 text-slate-300">
                        <Mail className="w-3 h-3 text-slate-500" />
                        <span>{faculty.email}</span>
                      </div>
                      <div className="flex items-center space-x-1 text-slate-400">
                        <Phone className="w-3 h-3 text-slate-500" />
                        <span>{faculty.phone}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          faculty.activeLoansCount > 0
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {faculty.activeLoansCount} / 5 Books
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          faculty.status === 'Active'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : faculty.status === 'On Leave'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}
                      >
                        {faculty.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end space-x-1">
                        <button
                          onClick={() => handleViewHistory(faculty._id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-400 hover:bg-slate-800 transition"
                          title="Borrowing History"
                        >
                          <History className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(faculty)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                          title="Edit Faculty"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {isAdmin && (
                          <button
                            onClick={() => setDeleteConfirmId(faculty._id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
                            title="Delete Faculty"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
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
              <h3 className="text-lg font-bold text-white">Delete Faculty Record</h3>
            </div>
            <p className="text-sm text-slate-300">
              Are you sure you want to delete this faculty member? The system will ensure that the faculty member has 0 active book issues and 0 pending fines.
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
                  const target = facultyList.find((f) => f._id === deleteConfirmId);
                  handleDelete(deleteConfirmId, target?.name || '');
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-sm font-medium transition"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Faculty Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 max-w-xl w-full rounded-3xl p-6 sm:p-8 shadow-2xl my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <h2 className="text-xl font-bold text-white">
                {editingFaculty ? `Edit Faculty (${editingFaculty.employeeId})` : 'Register New Faculty Member'}
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
                    Employee ID *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.employeeId}
                    onChange={(e) => setFormData({ ...formData, employeeId: e.target.value.toUpperCase() })}
                    placeholder="e.g. FAC-CSE-102"
                    className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Faculty ID
                  </label>
                  <input
                    type="text"
                    value={formData.facultyId}
                    onChange={(e) => setFormData({ ...formData, facultyId: e.target.value.toUpperCase() })}
                    placeholder="Auto-generated if empty"
                    className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Full Name & Title *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Dr. Kavitha Sundaram"
                  className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Official Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="faculty@college.edu"
                    className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Phone Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+91 9845012345"
                    className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Department *
                  </label>
                  <select
                    required
                    value={formData.departmentId}
                    onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    Designation *
                  </label>
                  <select
                    value={formData.designation}
                    onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Professor & HOD">Professor & HOD</option>
                    <option value="Professor">Professor</option>
                    <option value="Associate Professor">Associate Professor</option>
                    <option value="Assistant Professor">Assistant Professor</option>
                    <option value="Visiting Faculty">Visiting Faculty</option>
                    <option value="Research Scholar">Research Scholar</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="On Leave">On Leave</option>
                </select>
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
                  {submitting ? 'Saving...' : editingFaculty ? 'Update Record' : 'Register Faculty'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Borrowing History Drawer / Modal */}
      {historyDrawerOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 max-w-3xl w-full rounded-3xl p-6 sm:p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center space-x-2">
                  <span>Borrowing History</span>
                  {selectedFacultyHistory && (
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 font-normal">
                      {selectedFacultyHistory.name} ({selectedFacultyHistory.employeeId})
                    </span>
                  )}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Complete faculty loan records, active issues, and fine tracking.
                </p>
              </div>
              <button
                onClick={() => setHistoryDrawerOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {historyLoading || !selectedFacultyHistory ? (
              <div className="py-16 text-center text-slate-400">
                <div className="w-7 h-7 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                <p className="text-xs">Loading history...</p>
              </div>
            ) : (
              <div className="space-y-6 mt-6">
                {/* Active Issues Section */}
                <div>
                  <h3 className="text-xs font-semibold uppercase text-slate-400 tracking-wider mb-3 flex items-center space-x-2">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    <span>Currently Borrowed Books ({selectedFacultyHistory.activeIssues?.length || 0} / 5)</span>
                  </h3>

                  {selectedFacultyHistory.activeIssues?.length === 0 ? (
                    <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-500 text-center">
                      No books currently issued to this faculty member.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {selectedFacultyHistory.activeIssues.map((issue) => (
                        <div
                          key={issue._id}
                          className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                          <div>
                            <div className="font-semibold text-white text-sm">
                              {issue.bookId?.title || 'Book'}
                            </div>
                            <div className="text-xs text-slate-400 mt-0.5">
                              ID: <span className="font-mono text-blue-400">{issue.bookId?.bookId}</span> &bull; Dept: {issue.departmentId?.deptCode}
                            </div>
                          </div>
                          <div className="text-right text-xs">
                            <div className="text-slate-400">
                              Due Date: <span className="font-semibold text-white">{new Date(issue.dueDate).toLocaleDateString()}</span>
                            </div>
                            <span
                              className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                                new Date() > new Date(issue.dueDate)
                                  ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                  : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              }`}
                            >
                              {new Date() > new Date(issue.dueDate) ? 'Overdue' : 'On Loan'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Returned Books Section */}
                <div>
                  <h3 className="text-xs font-semibold uppercase text-slate-400 tracking-wider mb-3 flex items-center space-x-2">
                    <BookOpen className="w-3.5 h-3.5 text-blue-400" />
                    <span>Past Returned Books ({selectedFacultyHistory.returnedIssues?.length || 0})</span>
                  </h3>

                  {selectedFacultyHistory.returnedIssues?.length === 0 ? (
                    <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-500 text-center">
                      No previous return history.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-56 overflow-y-auto">
                      {selectedFacultyHistory.returnedIssues.map((issue) => (
                        <div
                          key={issue._id}
                          className="p-3 rounded-xl bg-slate-950/50 border border-slate-800/80 flex items-center justify-between text-xs"
                        >
                          <div>
                            <div className="font-medium text-slate-200">{issue.bookId?.title}</div>
                            <div className="text-[11px] text-slate-500">
                              Issued: {new Date(issue.issueDate).toLocaleDateString()}
                            </div>
                          </div>
                          <span className="px-2 py-0.5 rounded-md bg-slate-800 text-emerald-400 font-medium text-[11px]">
                            Returned
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Fine Summary */}
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <ReceiptIndianRupee className="w-5 h-5 text-amber-400" />
                    <span className="text-xs font-semibold text-white">Pending Fine Dues:</span>
                  </div>
                  <div className="text-sm font-bold text-amber-400">
                    ₹{selectedFacultyHistory.totalPendingFine || 0}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Faculty;
