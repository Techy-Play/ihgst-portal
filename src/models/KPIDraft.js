import mongoose from 'mongoose';

/**
 * KPIDraft — a saved KPI template that has not yet been assigned to any user.
 * When the admin/manager is ready, they pick users and the draft is converted
 * into assigned Goal records via POST /api/kpi (the existing assignment flow).
 */
const KPIDraftSchema = new mongoose.Schema({
  title:        { type: String, required: true, trim: true },
  description:  { type: String, required: true, trim: true },
  thrustArea:   { type: String, required: true },
  uom:          { type: String, enum: ['Numeric', 'Percentage', 'Timeline', 'Zero'], required: true },
  uomDirection: { type: String, enum: ['Min', 'Max'], default: 'Min' },
  target:       { type: mongoose.Schema.Types.Mixed, required: true },
  defaultWeightage: { type: Number, default: 20, min: 10, max: 100 },
  createdBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdByName:{ type: String },
  cycleId:      { type: mongoose.Schema.Types.ObjectId, ref: 'Cycle' }, // cycle it was drafted for
  cycleName:    { type: String },
}, { timestamps: true });

KPIDraftSchema.index({ createdBy: 1, createdAt: -1 });

export default mongoose.models.KPIDraft || mongoose.model('KPIDraft', KPIDraftSchema);
