const mongoose = require('mongoose');

const VolunteerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: ['volunteer', 'coordinator'], default: 'volunteer' },
    organization: { type: String, trim: true, default: '' },
    bio: { type: String, trim: true, default: '' },
    skills: [{ type: String, trim: true }],
    location: {
      zone: { type: String, trim: true, default: '' },
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
    },
    availability: { type: Boolean, default: true },
    experience: {
      type: String,
      enum: ['Beginner', 'Intermediate', 'Expert'],
      default: 'Beginner',
    },
    totalTasks: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

VolunteerSchema.index({ role: 1, availability: 1 });
VolunteerSchema.index({ 'location.zone': 1 });

VolunteerSchema.set('toJSON', {
  transform: (_, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    delete ret.password;
    return ret;
  },
});

module.exports = mongoose.model('Volunteer', VolunteerSchema);
