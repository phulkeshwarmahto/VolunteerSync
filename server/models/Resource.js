const mongoose = require('mongoose');

const ResourceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: ['Food', 'Medicine', 'Vehicles', 'Equipment', 'Shelter', 'Water', 'Other'],
      required: true,
    },
    quantity: { type: Number, required: true, min: 0, default: 0 },
    unit: { type: String, trim: true, default: 'units' },
    zone: { type: String, required: true, trim: true },
    threshold: { type: Number, default: 10, min: 0 }, // low-stock warning level
    notes: { type: String, trim: true, default: '' },
    lastUpdatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Volunteer', default: null },
  },
  { timestamps: true }
);

ResourceSchema.index({ zone: 1, category: 1 });
ResourceSchema.index({ quantity: 1 });

ResourceSchema.virtual('isLow').get(function () {
  return this.quantity <= this.threshold;
});

ResourceSchema.set('toJSON', {
  virtuals: true,
  transform: (_, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model('Resource', ResourceSchema);
