import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['Employee', 'Manager', 'Admin'], default: 'Employee' },
  department: { type: String },
  managerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  employeeId: { type: String, unique: true },
}, { timestamps: true });

export default mongoose.models.User || mongoose.model('User', UserSchema);
