import mongoose from 'mongoose';

const AuditLogSchema = new mongoose.Schema({
  entityType: { type: String, required: true },
  entityId: { type: mongoose.Schema.Types.ObjectId, required: true },
  action: { type: String, required: true },
  changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  changedByName: { type: String },
  changes: { type: mongoose.Schema.Types.Mixed },
  description: { type: String },
}, { timestamps: true });

AuditLogSchema.index({ entityType: 1, entityId: 1 });
export default mongoose.models.AuditLog || mongoose.model('AuditLog', AuditLogSchema);
