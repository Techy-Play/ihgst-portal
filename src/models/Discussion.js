import mongoose from 'mongoose';

const DiscussionSchema = new mongoose.Schema({
  goalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Goal', required: true, index: true },
  parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Discussion', default: null, index: true },
  replyingTo: { type: String, default: null },
  text: { type: String, required: true },
  by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  byName: { type: String, required: true },
  role: { type: String, enum: ['Manager', 'Admin', 'Employee'], required: true },
}, { timestamps: true });

DiscussionSchema.index({ goalId: 1, createdAt: 1 });

// Delete cached model to ensure schema updates are applied (HMR fix)
if (mongoose.models.Discussion) {
  delete mongoose.models.Discussion;
}

export default mongoose.model('Discussion', DiscussionSchema);
