import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Department from '../models/Department.js';
import Book from '../models/Book.js';
import User from '../models/User.js';
import Student from '../models/Student.js';
import Faculty from '../models/Faculty.js';
import Setting from '../models/Setting.js';
import AuditLog from '../models/AuditLog.js';
import BookIssue from '../models/BookIssue.js';
import BookReturn from '../models/BookReturn.js';
import Fine from '../models/Fine.js';
import Notification from '../models/Notification.js';

dotenv.config();

const departmentsData = [
  {
    deptCode: 'CSE',
    name: 'Computer Science and Engineering',
    hodName: 'Dr. Arvind Ramanathan',
    description: 'Core computing, algorithms, systems engineering, and software architectures.',
    status: 'Active',
  },
  {
    deptCode: 'IT',
    name: 'Information Technology',
    hodName: 'Dr. Priya Sundaram',
    description: 'Cloud systems, web technologies, distributed applications, and network security.',
    status: 'Active',
  },
  {
    deptCode: 'ECE',
    name: 'Electronics and Communication Engineering',
    hodName: 'Dr. K. Venkataraman',
    description: 'VLSI, embedded systems, signal processing, and communication networks.',
    status: 'Active',
  },
  {
    deptCode: 'EEE',
    name: 'Electrical and Electronics Engineering',
    hodName: 'Dr. Meenakshi Sundaram',
    description: 'Power systems, smart grids, control engineering, and electrical machines.',
    status: 'Active',
  },
  {
    deptCode: 'MECH',
    name: 'Mechanical Engineering',
    hodName: 'Dr. Suresh Babu',
    description: 'Thermodynamics, fluid mechanics, CAD/CAM, and robotic manufacturing.',
    status: 'Active',
  },
  {
    deptCode: 'CIVIL',
    name: 'Civil Engineering',
    hodName: 'Dr. Rajeshwari Nair',
    description: 'Structural analysis, geotechnical engineering, surveying, and environmental tech.',
    status: 'Active',
  },
  {
    deptCode: 'AI&DS',
    name: 'Artificial Intelligence and Data Science',
    hodName: 'Dr. Vikram Malhotra',
    description: 'Machine learning, deep neural nets, computer vision, and big data intelligence.',
    status: 'Active',
  },
];

export const seedDatabase = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/dept_library_db';
    console.log(`[Seeder] Connecting to MongoDB: ${mongoUri}`);
    await mongoose.connect(mongoUri);

    console.log('[Seeder] Clearing existing data...');
    await Promise.all([
      Department.deleteMany({}),
      Book.deleteMany({}),
      User.deleteMany({}),
      Student.deleteMany({}),
      Faculty.deleteMany({}),
      Setting.deleteMany({}),
      AuditLog.deleteMany({}),
      BookIssue.deleteMany({}),
      BookReturn.deleteMany({}),
      Fine.deleteMany({}),
      Notification.deleteMany({}),
    ]);

    console.log('[Seeder] Seeding Departments...');
    const createdDepartments = await Department.insertMany(departmentsData);
    const deptMap = {};
    createdDepartments.forEach((d) => {
      deptMap[d.deptCode] = d._id;
    });

    console.log('[Seeder] Seeding System Settings...');
    await Setting.create({
      libraryName: 'Apex Institute of Technology Central Library',
      finePerDay: 2,
      studentBorrowingLimit: 3,
      facultyBorrowingLimit: 5,
      maxIssuePeriodDays: 14,
      contactEmail: 'library@apexinstitute.edu',
      contactPhone: '+91 98765 43210',
      address: 'Academic Complex A, Central Library Hall, Bangalore',
    });

    console.log('[Seeder] Seeding Books for all departments...');
    const booksData = [
      // CSE
      {
        bookId: 'BK-CSE-001',
        isbn: '978-0262033848',
        title: 'Introduction to Algorithms (CLRS)',
        author: 'Thomas H. Cormen, Charles E. Leiserson',
        publisher: 'MIT Press',
        category: 'Algorithms',
        departmentId: deptMap['CSE'],
        edition: '3rd Edition',
        publicationYear: 2009,
        quantity: 15,
        availableQuantity: 15,
        shelfNumber: 'CSE-A1-04',
        price: 950,
      },
      {
        bookId: 'BK-CSE-002',
        isbn: '978-1118063330',
        title: 'Operating System Concepts',
        author: 'Abraham Silberschatz, Peter B. Galvin',
        publisher: 'Wiley',
        category: 'Operating Systems',
        departmentId: deptMap['CSE'],
        edition: '9th Edition',
        publicationYear: 2012,
        quantity: 12,
        availableQuantity: 12,
        shelfNumber: 'CSE-B2-10',
        price: 820,
      },
      {
        bookId: 'BK-CSE-003',
        isbn: '978-0078022159',
        title: 'Database System Concepts',
        author: 'Abraham Silberschatz, Henry F. Korth',
        publisher: 'McGraw-Hill',
        category: 'Databases',
        departmentId: deptMap['CSE'],
        edition: '7th Edition',
        publicationYear: 2019,
        quantity: 10,
        availableQuantity: 10,
        shelfNumber: 'CSE-C1-02',
        price: 890,
      },
      {
        bookId: 'BK-CSE-004',
        isbn: '978-0132126953',
        title: 'Computer Networks',
        author: 'Andrew S. Tanenbaum, David J. Wetherall',
        publisher: 'Pearson',
        category: 'Networking',
        departmentId: deptMap['CSE'],
        edition: '5th Edition',
        publicationYear: 2010,
        quantity: 10,
        availableQuantity: 10,
        shelfNumber: 'CSE-D3-08',
        price: 780,
      },

      // IT
      {
        bookId: 'BK-IT-001',
        isbn: '978-0131856936',
        title: 'Web Technologies: A Computer Science Perspective',
        author: 'Jeffrey C. Jackson',
        publisher: 'Pearson',
        category: 'Web Technologies',
        departmentId: deptMap['IT'],
        edition: '1st Edition',
        publicationYear: 2006,
        quantity: 8,
        availableQuantity: 8,
        shelfNumber: 'IT-A2-05',
        price: 650,
      },
      {
        bookId: 'BK-IT-002',
        isbn: '978-0133387520',
        title: 'Cloud Computing: Concepts, Technology & Architecture',
        author: 'Thomas Erl, Ricardo Puttini',
        publisher: 'Prentice Hall',
        category: 'Cloud Computing',
        departmentId: deptMap['IT'],
        edition: '1st Edition',
        publicationYear: 2013,
        quantity: 8,
        availableQuantity: 8,
        shelfNumber: 'IT-B1-03',
        price: 900,
      },

      // ECE
      {
        bookId: 'BK-ECE-001',
        isbn: '978-8126514663',
        title: 'Digital Electronics: Principles and Integrated Circuits',
        author: 'Anil K. Maini',
        publisher: 'Wiley India',
        category: 'Digital Electronics',
        departmentId: deptMap['ECE'],
        edition: '2nd Edition',
        publicationYear: 2014,
        quantity: 10,
        availableQuantity: 10,
        shelfNumber: 'ECE-R1-07',
        price: 720,
      },
      {
        bookId: 'BK-ECE-002',
        isbn: '978-0138147570',
        title: 'Signals and Systems',
        author: 'Alan V. Oppenheim, Alan S. Willsky',
        publisher: 'Prentice Hall',
        category: 'Signals & Systems',
        departmentId: deptMap['ECE'],
        edition: '2nd Edition',
        publicationYear: 1996,
        quantity: 12,
        availableQuantity: 12,
        shelfNumber: 'ECE-R2-04',
        price: 850,
      },

      // EEE
      {
        bookId: 'BK-EEE-001',
        isbn: '978-0073529547',
        title: 'Electric Machinery Fundamentals',
        author: 'Stephen J. Chapman',
        publisher: 'McGraw-Hill',
        category: 'Electrical Machines',
        departmentId: deptMap['EEE'],
        edition: '5th Edition',
        publicationYear: 2011,
        quantity: 10,
        availableQuantity: 10,
        shelfNumber: 'EEE-S1-02',
        price: 810,
      },
      {
        bookId: 'BK-EEE-002',
        isbn: '978-1305636187',
        title: 'Power System Analysis and Design',
        author: 'J. Duncan Glover, Thomas Overbye',
        publisher: 'Cengage',
        category: 'Power Systems',
        departmentId: deptMap['EEE'],
        edition: '6th Edition',
        publicationYear: 2016,
        quantity: 8,
        availableQuantity: 8,
        shelfNumber: 'EEE-S2-09',
        price: 940,
      },

      // MECH
      {
        bookId: 'BK-MECH-001',
        isbn: '978-0073398174',
        title: 'Thermodynamics: An Engineering Approach',
        author: 'Yunus A. Cengel, Michael A. Boles',
        publisher: 'McGraw-Hill',
        category: 'Thermodynamics',
        departmentId: deptMap['MECH'],
        edition: '8th Edition',
        publicationYear: 2014,
        quantity: 10,
        availableQuantity: 10,
        shelfNumber: 'MECH-M1-01',
        price: 890,
      },

      // CIVIL
      {
        bookId: 'BK-CIVIL-001',
        isbn: '978-8187433293',
        title: 'Design of Reinforced Concrete Structures',
        author: 'S. Ramamrutham',
        publisher: 'Dhanpat Rai',
        category: 'Structural Engineering',
        departmentId: deptMap['CIVIL'],
        edition: '17th Edition',
        publicationYear: 2015,
        quantity: 12,
        availableQuantity: 12,
        shelfNumber: 'CIV-C1-06',
        price: 680,
      },

      // AI&DS
      {
        bookId: 'BK-AIDS-001',
        isbn: '978-0134610993',
        title: 'Artificial Intelligence: A Modern Approach',
        author: 'Stuart Russell, Peter Norvig',
        publisher: 'Pearson',
        category: 'Artificial Intelligence',
        departmentId: deptMap['AI&DS'],
        edition: '4th Edition',
        publicationYear: 2020,
        quantity: 14,
        availableQuantity: 14,
        shelfNumber: 'AIDS-AI-01',
        price: 1100,
      },
      {
        bookId: 'BK-AIDS-002',
        isbn: '978-1492032649',
        title: 'Hands-On Machine Learning with Scikit-Learn and TensorFlow',
        author: 'Aurélien Géron',
        publisher: "O'Reilly Media",
        category: 'Machine Learning',
        departmentId: deptMap['AI&DS'],
        edition: '2nd Edition',
        publicationYear: 2019,
        quantity: 12,
        availableQuantity: 12,
        shelfNumber: 'AIDS-ML-05',
        price: 1250,
      },
    ];

    await Book.insertMany(booksData);

    console.log('[Seeder] Seeding Users and Member records across all 4 roles...');

    // 1. Admin User
    const adminUser = new User({
      name: 'System Administrator',
      email: 'admin@library.edu',
      password: 'admin123',
      role: 'admin',
      departmentId: null,
      status: 'Active',
    });
    await adminUser.save();

    // 2. Librarian User
    const librarianUser = new User({
      name: 'Chief Librarian',
      email: 'librarian@library.edu',
      password: 'lib123',
      role: 'librarian',
      departmentId: null,
      status: 'Active',
    });
    await librarianUser.save();

    // 3. Faculty Member + Faculty User (CSE)
    const facultyMember = new Faculty({
      facultyId: 'FAC-001',
      employeeId: 'FAC-CSE-101',
      name: 'Dr. Rajesh Sharma',
      email: 'faculty.cse@library.edu',
      phone: '+91 98450 12345',
      departmentId: deptMap['CSE'],
      designation: 'Associate Professor',
      status: 'Active',
    });
    await facultyMember.save();

    const facultyUser = new User({
      name: 'Dr. Rajesh Sharma',
      email: 'faculty.cse@library.edu',
      password: 'fac123',
      role: 'faculty',
      departmentId: deptMap['CSE'],
      memberRefId: facultyMember._id,
      memberModel: 'Faculty',
      status: 'Active',
    });
    await facultyUser.save();
    facultyMember.userId = facultyUser._id;
    await facultyMember.save();

    // 4. Student Member + Student User (CSE)
    const studentMember = new Student({
      studentId: 'STU-001',
      registerNumber: 'REG2024CSE01',
      name: 'Rahul Verma',
      email: 'student.cse@library.edu',
      phone: '+91 91234 56789',
      departmentId: deptMap['CSE'],
      year: 3,
      section: 'A',
      address: 'Hostel Block 4, Room 204, Campus',
      status: 'Active',
    });
    await studentMember.save();

    const studentUser = new User({
      name: 'Rahul Verma',
      email: 'student.cse@library.edu',
      password: 'stud123',
      role: 'student',
      departmentId: deptMap['CSE'],
      memberRefId: studentMember._id,
      memberModel: 'Student',
      status: 'Active',
    });
    await studentUser.save();
    studentMember.userId = studentUser._id;
    await studentMember.save();

    // 5. Additional Student (AI&DS) for department isolation testing
    const studentAids = new Student({
      studentId: 'STU-002',
      registerNumber: 'REG2024AI01',
      name: 'Ananya Sen',
      email: 'student.aids@library.edu',
      phone: '+91 99887 76655',
      departmentId: deptMap['AI&DS'],
      year: 2,
      section: 'B',
      address: 'Bangalore City',
      status: 'Active',
    });
    await studentAids.save();

    const studentAidsUser = new User({
      name: 'Ananya Sen',
      email: 'student.aids@library.edu',
      password: 'stud123',
      role: 'student',
      departmentId: deptMap['AI&DS'],
      memberRefId: studentAids._id,
      memberModel: 'Student',
      status: 'Active',
    });
    await studentAidsUser.save();
    studentAids.userId = studentAidsUser._id;
    await studentAids.save();

    // Initial Audit Log
    await AuditLog.create({
      userName: 'System Administrator',
      userRole: 'admin',
      action: 'System Seeded',
      description: 'System seeded with default departments, books, sample members, and user credentials.',
    });

    console.log('------------------------------------------------------------');
    console.log('✓ Database seeded successfully!');
    console.log('Sample Logins:');
    console.log('1. Admin:     admin@library.edu       | pass: admin123');
    console.log('2. Librarian: librarian@library.edu   | pass: lib123');
    console.log('3. Faculty:   faculty.cse@library.edu | pass: fac123');
    console.log('4. Student:   student.cse@library.edu | pass: stud123');
    console.log('------------------------------------------------------------');

    if (process.argv[1].includes('seedData.js')) {
      process.exit(0);
    }
  } catch (error) {
    console.error('[Seeder Error]', error);
    if (process.argv[1].includes('seedData.js')) {
      process.exit(1);
    }
  }
};

// If run directly via `node utils/seedData.js`
if (process.argv[1] && process.argv[1].endsWith('seedData.js')) {
  seedDatabase();
}
