import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import MainLayout from './layouts/MainLayout';

// Pages
import Login from './pages/Login';
import Unauthorized from './pages/Unauthorized';
import Dashboard from './pages/Dashboard';
import Departments from './pages/Departments';
import DepartmentDetail from './pages/DepartmentDetail';
import Books from './pages/Books';
import Students from './pages/Students';
import Faculty from './pages/Faculty';
import Issues from './pages/Issues';
import Returns from './pages/Returns';
import Overdue from './pages/Overdue';
import Fines from './pages/Fines';
import Reports from './pages/Reports';
import AuditLogs from './pages/AuditLogs';
import Settings from './pages/Settings';
import BookDetails from './pages/BookDetails';
import Reservations from './pages/Reservations';
import MyBooks from './pages/MyBooks';
import BookRequests from './pages/BookRequests';
import MyReservations from './pages/MyReservations';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/unauthorized" element={<Unauthorized />} />
          <Route path="/books/:id" element={<BookDetails />} />

          {/* Protected Routes inside Main Shell */}
          <Route
            element={
              <ProtectedRoute>
                <MainLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/departments" element={<Departments />} />
            <Route path="/departments/:id" element={<DepartmentDetail />} />
            <Route path="/books" element={<Books />} />
            <Route
              path="/my-books"
              element={
                <ProtectedRoute allowedRoles={['student', 'faculty']}>
                  <MyBooks />
                </ProtectedRoute>
              }
            />
            <Route
              path="/my-reservations"
              element={
                <ProtectedRoute allowedRoles={['student', 'faculty']}>
                  <MyReservations />
                </ProtectedRoute>
              }
            />

            {/* Admin & Librarian only routes */}
            <Route
              path="/book-requests"
              element={
                <ProtectedRoute allowedRoles={['admin', 'librarian']}>
                  <BookRequests />
                </ProtectedRoute>
              }
            />
            <Route
              path="/students"
              element={
                <ProtectedRoute allowedRoles={['admin', 'librarian']}>
                  <Students />
                </ProtectedRoute>
              }
            />
            <Route
              path="/faculty"
              element={
                <ProtectedRoute allowedRoles={['admin', 'librarian']}>
                  <Faculty />
                </ProtectedRoute>
              }
            />
            <Route
              path="/issues"
              element={
                <ProtectedRoute allowedRoles={['admin', 'librarian']}>
                  <Issues />
                </ProtectedRoute>
              }
            />
            <Route
              path="/returns"
              element={
                <ProtectedRoute allowedRoles={['admin', 'librarian']}>
                  <Returns />
                </ProtectedRoute>
              }
            />
            <Route
              path="/reservations"
              element={
                <ProtectedRoute allowedRoles={['admin', 'librarian']}>
                  <Reservations />
                </ProtectedRoute>
              }
            />
            <Route
              path="/overdue"
              element={
                <ProtectedRoute allowedRoles={['admin', 'librarian']}>
                  <Overdue />
                </ProtectedRoute>
              }
            />
            <Route path="/fines" element={<Fines />} />
            <Route
              path="/reports"
              element={
                <ProtectedRoute allowedRoles={['admin', 'librarian']}>
                  <Reports />
                </ProtectedRoute>
              }
            />

            {/* Admin only routes */}
            <Route
              path="/audit-logs"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AuditLogs />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <Settings />
                </ProtectedRoute>
              }
            />
          </Route>

          {/* Catch-all redirect */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
