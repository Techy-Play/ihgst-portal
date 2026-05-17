import mongoose from 'mongoose';

const DiscussionSchema = new mongoose.Schema({
  goalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Goal', required: true, index: true },
  text: { type: String, required: true },
  by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  byName: { type: String, required: true },
  role: { type: String, enum: ['Manager', 'Admin', 'Employee'], required: true },
}, { timestamps: true });

DiscussionSchema.index({ goalId: 1, createdAt: 1 });

export default mongoose.models.Discussion || mongoose.model('Discussion', DiscussionSchema);
