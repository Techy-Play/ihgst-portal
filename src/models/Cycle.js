import mongoose from 'mongoose';

const CycleSchema = new mongoose.Schema({
  name: { type: String, required: true },
  goalSettingStart: { type: Date, required: true },
  goalSettingEnd: { type: Date, required: true },
  quarters: [{ label: String, start: Date, end: Date }],
  isActive: { type: Boolean, default: false },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

export default mongoose.models.Cycle || mongoose.model('Cycle', CycleSchema);
