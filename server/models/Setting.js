import mongoose from 'mongoose';

const settingSchema = new mongoose.Schema(
  {
    libraryName: {
      type: String,
      required: true,
      default: 'College Central Library',
    },
    finePerDay: {
      type: Number,
      required: true,
      default: 5, // INR 5 per day
      min: 0,
    },
    studentBorrowingLimit: {
      type: Number,
      required: true,
      default: 3,
      min: 1,
    },
    facultyBorrowingLimit: {
      type: Number,
      required: true,
      default: 5,
      min: 1,
    },
    maxIssuePeriodDays: {
      type: Number,
      required: true,
      default: 14,
      min: 1,
    },
    reservationExpiryHours: {
      type: Number,
      required: true,
      default: 48, // 48 hours pickup validity
      min: 1,
    },
    contactEmail: {
      type: String,
      default: 'library@college.edu',
    },
    contactPhone: {
      type: String,
      default: '+91 9876543210',
    },
    address: {
      type: String,
      default: 'Central Library Building, Main Campus',
    },
  },
  {
    timestamps: true,
  }
);

const Setting = mongoose.model('Setting', settingSchema);
export default Setting;
