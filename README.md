# Department-Wise Library Management System

A full-stack, enterprise-grade College Library Management System where cataloging, circulation, quotas, overdue tracking, and reporting are organized strictly around **Academic Departments** (e.g., CSE, IT, ECE, EEE, MECH, CIVIL, AI&DS).

Instead of treating all books as one generic pool, every book belongs to a department, and circulation activities (Issue, Return, Fines, Overdue alerts, Inventory reports) are tracked department-wise.

---

## Technology Stack

- **Frontend**: React.js, React Router v6, Tailwind CSS, Lucide React, Recharts, Axios
- **Backend**: Node.js, Express.js (ES Modules), Mongoose
- **Database**: MongoDB
- **Security**: JWT Authentication, bcryptjs password hashing, Role-Based Access Control (Admin, Librarian, Student, Faculty)

---

## Project Structure

```
department-library-system/
├── client/                      # React frontend
│   ├── src/
│   │   ├── assets/              # Static assets
│   │   ├── components/          # Reusable UI (Navbar, Sidebar, Modals, Badges)
│   │   ├── context/             # AuthContext with token persistence
│   │   ├── hooks/               # Custom React hooks
│   │   ├── layouts/             # MainLayout responsive shell
│   │   ├── pages/               # Dashboard, Departments, Books, Students, Faculty, Issues, Returns, Overdue, Fines, Reports, AuditLogs, Settings, Login
│   │   ├── services/            # Axios API clients (auth, departments, books, members, circulation, dashboard, reports, settings, audit logs)
│   │   ├── utils/               # Helpers & formatters
│   │   ├── App.jsx              # Main router and role guards
│   │   ├── index.css            # Tailwind & custom scrollbars
│   │   └── main.jsx             # React DOM entrypoint
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.js
├── server/                      # Express backend
│   ├── config/                  # MongoDB connection (db.js)
│   ├── controllers/             # Business logic handlers
│   ├── middleware/              # Auth (JWT verification), Role checks, Error handlers
│   ├── models/                  # 11 Mongoose Schemas (User, Department, Book, Student, Faculty, BookIssue, BookReturn, Fine, Setting, AuditLog, Notification)
│   ├── routes/                  # Express REST routes
│   ├── utils/                   # Database seeder (seedData.js), logger helper
│   ├── server.js                # Express app entrypoint
│   └── package.json
├── .env.example
├── .gitignore
└── README.md
```

---

## Key Features & User Roles

### 1. User Roles & RBAC
- **Admin**: Full system management (Departments, Books, Students, Faculty, Issues, Returns, Fines, Reports, Audit Logs, Global Settings).
- **Librarian**: Operational management (Books, Students, Faculty, Issues, Returns, Overdue tracking, Fine collection, Reports).
- **Student & Faculty**: Department-isolated dashboard, book catalog search, live borrowing status, due dates countdown, fine ledger.

### 2. Department-Centric Architecture
- Dedicated **Department Details Page** with real-time stats header (`Total Books`, `Available`, `Issued`, `Students`, `Faculty`) and isolated department book list.
- Quick Department Switcher tabs (CSE, IT, ECE, EEE, MECH, CIVIL, AI&DS).
- Multi-facet global book search with department filtering.

### 3. Circulation & Automated Fines
- **Book Issue**: Validates availability, department membership, and borrowing limits (Student: 3 books, Faculty: 5 books).
- **Book Return**: Quick lookup by Transaction ID, Book ID, Student Register No, or Faculty Employee ID with live fine preview.
- **Automated Fine Calculation**: Dynamic computation based on configurable per-day fine rate (`overdueDays * finePerDay`).
- **Overdue Books Tracker**: Real-time list of all overdue items with department tags.

### Book Reservations
- Students and faculty can reserve a title only when all catalog copies are unavailable. Creating a reservation does not issue a book or change inventory.
- Reservations are served first-in, first-out. A successful return makes an available copy ready for the next borrower, with pickup expiry controlled by `reservationExpiryHours` (48 hours by default).
- Borrowers can view and cancel their own requests at **My Reservations**. Staff can search, filter, and cancel the queue from **Reservations**.
- Lifecycle: `Pending` → `Ready for Pickup` → `Fulfilled` after the existing issue workflow succeeds; pending or pickup-ready reservations may be cancelled, and pickup-ready reservations expire at their configured deadline.
- API: `POST /api/books/:bookId/reserve`, `GET /api/reservations/my`, `GET /api/reservations/:id`, `GET /api/reservations` (staff), and `PATCH /api/reservations/:id/cancel`.

### 4. Visual Analytics & Reports
- Recharts Dashboard Charts: Department Book Inventory, Monthly Circulation Trends, Students by Department, and Collection Share.
- Comprehensive Reports: Department-wise Book Inventory, Department Enrollment, Issue Audit, Return Audit, Overdue Summary, Fine Collections. CSV Export & Print support.

---

## Sample Login Credentials

| Role | Email / Identifier | Password | Access Scope |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@library.edu` | `admin123` | Full administrative control & settings |
| **Librarian** | `librarian@library.edu` | `lib123` | Circulation desk & catalog management |
| **Faculty (CSE)** | `faculty.cse@library.edu` (or `FAC-CSE-101`) | `fac123` | CSE Department faculty account (Limit: 5) |
| **Student (CSE)** | `student.cse@library.edu` (or `REG2024CSE01`) | `stud123` | CSE Department student account (Limit: 3) |
| **Student (AI&DS)** | `student.aids@library.edu` (or `REG2024AI01`) | `stud123` | AI&DS Department student account |

*Note: The login page includes 1-click quick-fill demo buttons for testing all 4 roles instantly.*

---

## Quick Start Guide

### Prerequisites
- Node.js (v18+)
- MongoDB (Running locally on `mongodb://localhost:27017/dept_library_db` or MongoDB Atlas connection string)

### 1. Backend Setup
```bash
cd server
npm install
npm run seed     # Seeds realistic departments, books, users, members & settings
npm run dev      # Starts Express server on http://localhost:5000
```

### 2. Frontend Setup
```bash
cd client
npm install
npm run dev      # Starts React Vite dev server on http://localhost:5173
```

---

## REST API Overview

### Authentication
- `POST /api/auth/login` - Authenticate user (Email/RegNo/EmpID + Password + Role)
- `GET /api/auth/me` - Get currently logged-in user profile
- `POST /api/auth/logout` - User logout & audit trail

### Departments
- `GET /api/departments` - List departments with aggregated live statistics
- `GET /api/departments/:id` - Single department details with metrics
- `POST /api/departments` - Create department (Admin)
- `PUT /api/departments/:id` - Update department (Admin)
- `DELETE /api/departments/:id` - Delete department (Guarded against active books/members)

### Books
- `GET /api/books` - Global search & filter by department, category, availability
- `GET /api/books/categories` - Distinct book categories
- `GET /api/books/:id` - Single book details
- `POST /api/books` - Create book (Admin, Librarian)
- `PUT /api/books/:id` - Update book
- `DELETE /api/books/:id` - Delete book (Guarded against active loans)

### Students & Faculty
- `GET /api/students` / `GET /api/faculty` - Member listings with active loan counters
- `GET /api/students/:id` / `GET /api/faculty/:id` - Member details & borrowing history
- `POST /api/students` / `POST /api/faculty` - Enroll member & generate user account
- `PUT /api/students/:id` / `PUT /api/faculty/:id` - Update member
- `DELETE /api/students/:id` / `DELETE /api/faculty/:id` - Delete member (Guarded)

### Circulation (Issues, Returns, Fines, Overdue)
- `POST /api/issues` - Issue book (Validates quota & availability)
- `GET /api/issues` - List issue records
- `GET /api/issues/overdue` - List overdue loans
- `GET /api/returns/search-loan` - Scan/search active loan with fine preview
- `POST /api/returns` - Process book return & generate fine if overdue
- `GET /api/returns` - List return transactions
- `GET /api/fines` - List fines with revenue summaries
- `PUT /api/fines/:id/pay` - Mark fine as paid

### Reports & Dashboard
- `GET /api/dashboard/stats` - System totals, dept stats, monthly trends
- `GET /api/reports/department-books` - Dept book inventory report
- `GET /api/reports/department-students` - Dept student enrollment report
- `GET /api/reports/issues` - Issue transaction log
- `GET /api/reports/returns` - Return transaction log
- `GET /api/reports/overdue` - Overdue items report
- `GET /api/reports/fines` - Fine collection ledger

### Settings & Audit Logs
- `GET /api/settings` / `PUT /api/settings` - Global library configuration
- `GET /api/audit-logs` - System security audit trail
