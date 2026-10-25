import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Building2,
  BookOpen,
  GraduationCap,
  Briefcase,
  BookDown,
  BookUp,
  ClockAlert,
  ReceiptIndianRupee,
  BarChart3,
  ShieldCheck,
  Settings,
  X,
  LogOut,
  BookmarkCheck,
  FileText,
} from 'lucide-react';

const Sidebar = ({ isOpen, onClose }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const role = user?.role || 'student';

  const navLinks = [
    {
      label: 'Dashboard',
      path: '/dashboard',
      icon: LayoutDashboard,
      roles: ['admin', 'librarian', 'faculty', 'student'],
    },
    {
      label: 'Departments',
      path: '/departments',
      icon: Building2,
      roles: ['admin', 'librarian', 'faculty', 'student'],
    },
    {
      label: 'Books Catalog',
      path: '/books',
      icon: BookOpen,
      roles: ['admin', 'librarian', 'faculty', 'student'],
    },
    {
      label: 'My Books',
      path: '/my-books',
      icon: BookmarkCheck,
      roles: ['faculty', 'student'],
    },
    {
      label: 'My Reservations',
      path: '/my-reservations',
      icon: BookmarkCheck,
      roles: ['faculty', 'student'],
    },
    {
      label: 'Students',
      path: '/students',
      icon: GraduationCap,
      roles: ['admin', 'librarian'],
    },
    {
      label: 'Faculty Members',
      path: '/faculty',
      icon: Briefcase,
      roles: ['admin', 'librarian'],
    },
    {
      label: 'Book Requests',
      path: '/book-requests',
      icon: FileText,
      roles: ['admin', 'librarian'],
    },
    {
      label: 'Issue Book',
      path: '/issues',
      icon: BookDown,
      roles: ['admin', 'librarian'],
    },
    {
      label: 'Return Book',
      path: '/returns',
      icon: BookUp,
      roles: ['admin', 'librarian'],
    },
    {
      label: 'Reservations',
      path: '/reservations',
      icon: BookmarkCheck,
      roles: ['admin', 'librarian'],
    },
    {
      label: 'Overdue Books',
      path: '/overdue',
      icon: ClockAlert,
      roles: ['admin', 'librarian'],
    },
    {
      label: 'Fines Management',
      path: '/fines',
      icon: ReceiptIndianRupee,
      roles: ['admin', 'librarian', 'faculty', 'student'],
    },
    {
      label: 'Reports & Analytics',
      path: '/reports',
      icon: BarChart3,
      roles: ['admin', 'librarian'],
    },
    {
      label: 'Audit Logs',
      path: '/audit-logs',
      icon: ShieldCheck,
      roles: ['admin'],
    },
    {
      label: 'System Settings',
      path: '/settings',
      icon: Settings,
      roles: ['admin'],
    },
  ];

  const visibleLinks = navLinks.filter((item) => item.roles.includes(role));

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-40 lg:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 left-0 z-50 h-screen w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div>
          <div className="h-16 flex items-center justify-between px-5 border-b border-slate-800">
            <div className="flex items-center space-x-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <h1 className="font-bold text-base text-white tracking-tight">
                  Dept<span className="text-blue-400">Library</span>
                </h1>
                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                  College System
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1 overflow-y-auto max-h-[calc(100vh-8rem)]">
            {visibleLinks.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
                    }`
                  }
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Footer Actions */}
        <div className="p-3 border-t border-slate-800">
          <button
            onClick={() => {
              logout();
              navigate('/login');
            }}
            className="w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
