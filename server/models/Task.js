const mongoose = require('mongoose');

const AISuggestionSchema = new mongoose.Schema(
  {
    volunteerId: { type: String, required: true },
    name: { type: String, required: true },
    score: { type: Number, min: 0, max: 100, default: 0 },
    reason: { type: String, required: true },
  },
  { _id: false }
);

const TaskSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: '' },
    requiredSkills: [{ type: String, trim: true }],
    urgency: {
      type: String,
      enum: ['Low', 'Medium', 'Critical'],
      default: 'Medium',
    },
    zone: { type: String, required: true, trim: true },
    location: {
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
    },
    status: {
      type: String,
      enum: ['Open', 'Assigned', 'In Progress', 'Completed'],
      default: 'Open',
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Volunteer', required: true },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Volunteer', default: null },
    aiSuggestions: [AISuggestionSchema],
    completedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

TaskSchema.index({ status: 1, zone: 1, urgency: 1 });
TaskSchema.index({ createdBy: 1 });
TaskSchema.index({ assignedTo: 1 });

TaskSchema.set('toJSON', {
  transform: (_, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model('Task', TaskSchema);
