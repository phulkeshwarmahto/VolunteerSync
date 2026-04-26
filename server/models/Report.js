const mongoose = require('mongoose');

const ReportSchema = new mongoose.Schema(
  {
    needs: [{ type: String, trim: true }],
    peopleCount: { type: Number, default: 1, min: 1 },
    urgency: {
      type: String,
      enum: ['can_wait', 'need_soon', 'emergency'],
      default: 'need_soon',
    },
    location: {
      lat: { type: Number },
      lng: { type: Number },
      address: { type: String, trim: true, default: '' },
      city: { type: String, trim: true, default: '' },
    },
    contactPhone: { type: String, trim: true, default: '' },
    details: { type: String, trim: true, default: '' },
    status: {
      type: String,
      enum: ['new', 'acknowledged', 'task_created', 'resolved'],
      default: 'new',
    },
    linkedTask: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', default: null },
  },
  { timestamps: true }
);

ReportSchema.set('toJSON', {
  transform: (_, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model('Report', ReportSchema);
