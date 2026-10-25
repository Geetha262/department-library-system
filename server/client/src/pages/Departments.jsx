import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import departmentService from '../services/departmentService';
import {
  Building2,
  BookOpen,
  Users,
  Plus,
  Search,
  ArrowRight,
  Edit2,
  Trash2,
  GraduationCap,
  Briefcase,
  AlertCircle,
  CheckCircle2,
  X,
  Layers,
} from 'lucide-react';

const DEPT_COLORS = {
  CSE: 'from-blue-600 to-indigo-600 border-blue-500/30 text-blue-400',
  IT: 'from-cyan-600 to-blue-600 border-cyan-500/30 text-cyan-400',
  ECE: 'from-purple-600 to-indigo-600 border-purple-500/30 text-purple-400',
  EEE: 'from-amber-600 to-orange-600 border-amber-500/30 text-amber-400',
  MECH: 'from-rose-600 to-red-600 border-rose-500/30 text-rose-400',
  CIVIL: 'from-emerald-600 to-teal-600 border-emerald-500/30 text-emerald-400',
  'AI&DS': 'from-pink-600 to-purple-600 border-pink-500/30 text-pink-400',
};

const Departments = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [search, setSearch] = useState('');

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState(null);
  const [formData, setFormData] = useState({
    deptCode: '',
    name: '',
    hodName: '',
    description: '',
    status: 'Active',
  });
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  const fetchDepartments = async () => {
    try {
      setLoading(true);
      const res = await departmentService.getAll({ search });
      setDepartments(res.data || []);
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to fetch departments.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchDepartments();
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const handleOpenAdd = () => {
    setEditingDept(null);
    setFormData({
      deptCode: '',
      name: '',
      hodName: '',
      description: '',
      status: 'Active',
    });
    setModalOpen(true);
    setError('');
  };

  const handleOpenEdit = (dept) => {
    setEditingDept(dept);
    setFormData({
      deptCode: dept.deptCode,
      name: dept.name,
      hodName: dept.hodName,
      description: dept.description || '',
      status: dept.status || 'Active',
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
      if (editingDept) {
        await departmentService.update(editingDept._id, formData);
        setSuccessMsg(`Department "${formData.deptCode}" updated successfully.`);
      } else {
        await departmentService.create(formData);
        setSuccessMsg(`Department "${formData.deptCode}" created successfully.`);
      }
      setModalOpen(false);
      fetchDepartments();
    } catch (err) {
      setError(err.message || 'Error saving department.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id, code) => {
    try {
      setError('');
      await departmentService.delete(id);
      setDeleteConfirmId(null);
      setSuccessMsg(`Department "${code}" deleted successfully.`);
      fetchDepartments();
    } catch (err) {
      setError(err.message || 'Cannot delete department.');
      setDeleteConfirmId(null);
    }
  };

  // Aggregated totals
  const totalBooksAll = departments.reduce((acc, d) => acc + (d.stats?.totalBooks || 0), 0);
  const availableBooksAll = departments.reduce((acc, d) => acc + (d.stats?.availableBooks || 0), 0);
  const issuedBooksAll = departments.reduce((acc, d) => acc + (d.stats?.issuedBooks || 0), 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold mb-2">
            <Building2 className="w-3.5 h-3.5" />
            <span>Academic Infrastructure</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Department Management
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            College library organized department-wise. Every book and member belongs to a specific department.
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold shadow-lg shadow-blue-600/30 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add Department</span>
          </button>
        )}
      </div>

      {/* Global Alerts */}
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

      {/* System Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
          <div className="text-xs text-slate-400 uppercase font-semibold">Total Departments</div>
          <div className="text-2xl font-bold text-white mt-1">{departments.length}</div>
          <div className="text-[11px] text-slate-500 mt-1">Active academic branches</div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
          <div className="text-xs text-slate-400 uppercase font-semibold">Total Collection</div>
          <div className="text-2xl font-bold text-blue-400 mt-1">{totalBooksAll}</div>
          <div className="text-[11px] text-slate-500 mt-1">Across all departments</div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
          <div className="text-xs text-slate-400 uppercase font-semibold">Available Copies</div>
          <div className="text-2xl font-bold text-emerald-400 mt-1">{availableBooksAll}</div>
          <div className="text-[11px] text-slate-500 mt-1">Ready for issuance</div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
          <div className="text-xs text-slate-400 uppercase font-semibold">Currently Issued</div>
          <div className="text-2xl font-bold text-amber-400 mt-1">{issuedBooksAll}</div>
          <div className="text-[11px] text-slate-500 mt-1">In active circulation</div>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
          <Search className="w-4 h-4" />
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by department code (CSE, IT), name, or HOD..."
          className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
        />
      </div>

      {/* Department Cards Grid */}
      {loading ? (
        <div className="py-16 text-center text-slate-400">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-sm font-medium">Loading departments and live metrics...</p>
        </div>
      ) : departments.length === 0 ? (
        <div className="p-12 text-center bg-slate-900/50 rounded-3xl border border-slate-800">
          <Building2 className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-white">No departments found</h3>
          <p className="text-xs text-slate-400 mt-1">Try adjusting your search query or add a new department.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {departments.map((dept) => {
            const colorClass = DEPT_COLORS[dept.deptCode] || 'from-blue-600 to-indigo-600 border-blue-500/30 text-blue-400';

            return (
              <div
                key={dept._id}
                className="rounded-3xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 p-6 flex flex-col justify-between shadow-xl transition relative group"
              >
                <div>
                  {/* Top Bar with Code & Actions */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      <span className="px-3 py-1 rounded-xl bg-slate-800 border border-slate-700 text-sm font-bold text-white tracking-wide">
                        {dept.deptCode}
                      </span>
                      <span
                        className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                          dept.status === 'Active'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-slate-700 text-slate-400'
                        }`}
                      >
                        {dept.status}
                      </span>
                    </div>

                    {isAdmin && (
                      <div className="flex items-center space-x-1 opacity-90 group-hover:opacity-100 transition">
                        <button
                          onClick={() => handleOpenEdit(dept)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                          title="Edit Department"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(dept._id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
                          title="Delete Department"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Department Name & HOD */}
                  <h3 className="text-lg font-bold text-white group-hover:text-blue-400 transition leading-snug">
                    {dept.name}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    <span className="text-slate-500">HOD:</span> {dept.hodName}
                  </p>

                  {dept.description && (
                    <p className="text-xs text-slate-400/90 mt-2 line-clamp-2 leading-relaxed">
                      {dept.description}
                    </p>
                  )}

                  {/* Department Statistics Grid */}
                  <div className="mt-5 grid grid-cols-3 gap-2 p-3 bg-slate-950/70 rounded-2xl border border-slate-800/80 text-center">
                    <div>
                      <div className="text-[10px] text-slate-500 uppercase font-semibold">Total</div>
                      <div className="text-sm font-bold text-white mt-0.5">{dept.stats?.totalBooks || 0}</div>
                      <div className="text-[9px] text-slate-400">Books</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-emerald-400/90 uppercase font-semibold">Available</div>
                      <div className="text-sm font-bold text-emerald-400 mt-0.5">{dept.stats?.availableBooks || 0}</div>
                      <div className="text-[9px] text-slate-400">Ready</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-amber-400/90 uppercase font-semibold">Issued</div>
                      <div className="text-sm font-bold text-amber-400 mt-0.5">{dept.stats?.issuedBooks || 0}</div>
                      <div className="text-[9px] text-slate-400">On Loan</div>
                    </div>
                  </div>

                  {/* Members Stats */}
                  <div className="mt-3 flex items-center justify-between text-xs text-slate-400 px-1">
                    <span className="flex items-center space-x-1">
                      <GraduationCap className="w-3.5 h-3.5 text-blue-400" />
                      <span>{dept.stats?.studentCount || 0} Students</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <Briefcase className="w-3.5 h-3.5 text-indigo-400" />
                      <span>{dept.stats?.facultyCount || 0} Faculty</span>
                    </span>
                  </div>
                </div>

                {/* Direct Link to Department Books */}
                <div className="mt-6 pt-4 border-t border-slate-800/80">
                  <Link
                    to={`/departments/${dept._id}`}
                    className="w-full flex items-center justify-between px-4 py-2 rounded-xl bg-slate-800/60 hover:bg-blue-600/20 hover:border-blue-500/30 border border-slate-700/50 text-xs font-semibold text-blue-400 transition group/btn"
                  >
                    <span>View Books in {dept.deptCode}</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover/btn:translate-x-1 transition" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 max-w-md w-full rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center space-x-3 text-rose-400">
              <AlertCircle className="w-6 h-6 flex-shrink-0" />
              <h3 className="text-lg font-bold text-white">Delete Department</h3>
            </div>
            <p className="text-sm text-slate-300">
              Are you sure you want to delete this department? The system will verify that no books, students, or faculty are linked to it before deletion.
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
                  const target = departments.find((d) => d._id === deleteConfirmId);
                  handleDelete(deleteConfirmId, target?.deptCode || '');
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-sm font-medium transition"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Department Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 max-w-lg w-full rounded-3xl p-6 sm:p-8 shadow-2xl relative">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <h2 className="text-xl font-bold text-white">
                {editingDept ? `Edit Department (${editingDept.deptCode})` : 'Add New Department'}
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-4 mt-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Department Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.deptCode}
                    onChange={(e) => setFormData({ ...formData, deptCode: e.target.value.toUpperCase() })}
                    placeholder="e.g. CSE"
                    className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Department Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Computer Science and Engineering"
                  className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  HOD Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.hodName}
                  onChange={(e) => setFormData({ ...formData, hodName: e.target.value })}
                  placeholder="e.g. Dr. Arvind Ramanathan"
                  className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Description
                </label>
                <textarea
                  rows="3"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Overview of syllabus, labs, and academic focus..."
                  className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold shadow-lg shadow-blue-600/30 transition disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : editingDept ? 'Update Department' : 'Create Department'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Departments;
