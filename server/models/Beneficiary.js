const mongoose = require('mongoose');

const BeneficiarySchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, default: 'Anonymous' },
    householdSize: { type: Number, default: 1, min: 1 },
    city: { type: String, trim: true, required: true },
    aidProvided: [{ type: String, trim: true }],
    quantity: { type: String, trim: true, default: '' },
    deliveredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Volunteer', default: null },
    taskRef: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', default: null },
  },
  { timestamps: true }
);

BeneficiarySchema.set('toJSON', {
  transform: (_, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model('Beneficiary', BeneficiarySchema);
