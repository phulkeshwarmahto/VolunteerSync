const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();
const Volunteer = require('./models/Volunteer');

// Sample skills for volunteers
const SKILLS = [
  'Teaching',
  'Healthcare',
  'Construction',
  'Plumbing',
  'Electrical',
  'Carpentry',
  'Mentoring',
  'Counseling',
  'Event Planning',
  'Data Analysis',
  'Web Development',
  'Graphic Design',
  'Writing',
  'Social Media',
  'Photography',
  'Cooking',
  'Cleaning',
  'Gardening',
  'Animal Care',
  'First Aid',
  'Leadership',
  'Project Management',
  'Communication',
  'Problem Solving',
  'Customer Service',
  'IT Support',
  'Finance',
  'Marketing',
  'Legal Advice',
  'Translation',
  'Coding',
  'Database Management',
  'Video Editing',
  'Public Speaking',
  'Training',
];

// Sample zones
const ZONES = [
  'North Zone',
  'South Zone',
  'East Zone',
  'West Zone',
  'Central Zone',
  'Downtown',
  'Uptown',
  'Midtown',
];

// Sample organizations
const ORGANIZATIONS = [
  'Red Cross',
  'Habitat for Humanity',
  'Local Food Bank',
  'Community Center',
  'Senior Care Facility',
  'Youth Organization',
  'Animal Shelter',
  'Environmental Group',
  'Education Initiative',
  'Healthcare Alliance',
];

// Sample bios
const BIO_TEMPLATES = [
  'Passionate about helping the community',
  'Dedicated volunteer with 5+ years of experience',
  'Love making a difference in people\'s lives',
  'Committed to sustainable development',
  'Enthusiastic about community service',
  'Always eager to learn and contribute',
  'Focused on creating positive change',
  'Volunteer with a heart for service',
  'Dedicated to social impact',
  'Passionate about community development',
];

const EXPERIENCES = ['Beginner', 'Intermediate', 'Expert'];

async function generateRandomEmail(index) {
  const firstNames = ['alex', 'jordan', 'casey', 'taylor', 'morgan', 'riley', 'avery', 'quinn', 'robin', 'sam'];
  const lastNames = ['smith', 'johnson', 'williams', 'brown', 'jones', 'garcia', 'miller', 'davis', 'rodriguez', 'martinez'];
  
  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
  const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
  
  return `${firstName}${lastName}${index}@volunteer.com`;
}

function getRandomElements(arr, count) {
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, Math.min(count, arr.length));
}

async function generateDummyVolunteers() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/smart_volunteer_allocation';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // Check if volunteers already exist
    const existingCount = await Volunteer.countDocuments();
    if (existingCount > 0) {
      console.log(`Found ${existingCount} existing volunteers. Clearing database...`);
      await Volunteer.deleteMany({});
      console.log('Database cleared');
    }

    // Generate 100 dummy volunteers
    const volunteers = [];
    const firstNames = [
      'Alex', 'Jordan', 'Casey', 'Taylor', 'Morgan', 'Riley', 'Avery', 'Quinn', 'Robin', 'Sam',
      'Jamie', 'Drew', 'Pat', 'Blake', 'Cameron', 'Dakota', 'Devon', 'Evan', 'Flynn', 'Gray',
      'Harper', 'India', 'Jade', 'Kerry', 'Lee', 'Max', 'Noel', 'Paris', 'Quinn', 'Reed',
      'Sage', 'Tatum', 'Utah', 'Vale', 'Winter', 'Xander', 'Yale', 'Zephyr', 'Austin', 'Bailey'
    ];

    const lastNames = [
      'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez',
      'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin',
      'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson',
      'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Peterson', 'Phillips', 'Campbell', 'Parker'
    ];

    for (let i = 0; i < 100; i++) {
      const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
      const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
      const name = `${firstName} ${lastName}`;
      const email = `volunteer${i + 1}@example.com`;

      // Hash password
      const hashedPassword = await bcrypt.hash('password123', 10);

      // Random skills (2-5 skills per volunteer)
      const skillCount = Math.floor(Math.random() * 4) + 2;
      const skills = getRandomElements(SKILLS, skillCount);

      // Random location with lat/lng (city coordinates as example)
      const zone = ZONES[Math.floor(Math.random() * ZONES.length)];
      const baseLat = 40.7128 + (Math.random() - 0.5) * 0.5; // Random around NYC
      const baseLng = -74.0060 + (Math.random() - 0.5) * 0.5;

      const volunteer = {
        name,
        email,
        password: hashedPassword,
        role: 'volunteer',
        organization: ORGANIZATIONS[Math.floor(Math.random() * ORGANIZATIONS.length)],
        bio: BIO_TEMPLATES[Math.floor(Math.random() * BIO_TEMPLATES.length)],
        skills,
        location: {
          zone,
          lat: baseLat,
          lng: baseLng,
        },
        availability: Math.random() > 0.2, // 80% available
        experience: EXPERIENCES[Math.floor(Math.random() * EXPERIENCES.length)],
        totalTasks: Math.floor(Math.random() * 50),
      };

      volunteers.push(volunteer);
    }

    // Insert volunteers into database
    const result = await Volunteer.insertMany(volunteers);
    console.log(`✅ Successfully created ${result.length} dummy volunteers!`);

    // Print sample volunteers
    console.log('\n📋 Sample volunteers created:');
    result.slice(0, 5).forEach((vol, index) => {
      console.log(`${index + 1}. ${vol.name} - Skills: ${vol.skills.join(', ')} - Experience: ${vol.experience}`);
    });

    console.log('\n✨ Database seeding completed!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

// Run the seed function
generateDummyVolunteers();
