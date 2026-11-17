require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const LostFoundItem = require('./models/LostFoundItem');
const { extractAiKeywords, calculateMatchScore } = require('./utils/aiMatcher');

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB for Lost & Found seeding');

  // Find a student and a teacher/admin to assign reports
  const student = await User.findOne({ role: 'student' }) || await User.findOne();
  const admin = await User.findOne({ role: 'admin' }) || student;

  if (!student) {
    console.log('No user found to assign items. Please register a user first.');
    await mongoose.disconnect();
    return;
  }

  // Clear existing lost-found items to prevent duplicate clutter
  await LostFoundItem.deleteMany({});

  const sampleItems = [
    // PAIR 1 (Strong AI Match): Casio Scientific Calculator
    {
      title: 'Casio Scientific Calculator fx-991ES',
      type: 'lost',
      category: 'Electronics',
      description: 'Grey and silver Casio fx-991ES Plus calculator. Has a small yellow smiley sticker on the protective sliding cover.',
      location: 'CS Lab 2 (Table 14)',
      date: new Date(Date.now() - 24 * 60 * 60 * 1000), // yesterday
      contactPhone: '9876543210',
      secretQuestion: 'What sticker is on the back cover of the calculator?',
      secretAnswer: 'Yellow smiley sticker',
      reportedBy: student._id,
      reporterName: student.name,
      reporterEmail: student.email,
    },
    {
      title: 'Found Casio Calculator in CS Block',
      type: 'found',
      category: 'Electronics',
      description: 'Found a scientific calculator in CS Lab 2 under table 14. Grey color, Casio brand. Currently kept with Lab In-charge Mr. Ramesh.',
      location: 'CS Lab 2',
      date: new Date(Date.now() - 18 * 60 * 60 * 1000),
      contactPhone: 'CS Dept Ext 204',
      secretQuestion: 'Describe any stickers or distinguishing marks on the cover.',
      secretAnswer: 'Smiley sticker on cover',
      reportedBy: admin._id,
      reporterName: admin.name,
      reporterEmail: admin.email,
    },

    // PAIR 2 (Strong AI Match): Fastrack Water Bottle
    {
      title: 'Blue Fastrack Stainless Steel Bottle',
      type: 'lost',
      category: 'Bottles & Lunchboxes',
      description: '750ml matte blue metallic Fastrack bottle with black cap and silver steel carabiner ring. Slightly dented at the bottom base.',
      location: 'Central Library 1st Floor Reading Hall',
      date: new Date(Date.now() - 12 * 60 * 60 * 1000),
      contactPhone: '9123456789',
      secretQuestion: 'Where is the bottle dented?',
      secretAnswer: 'Bottom base dent',
      reportedBy: student._id,
      reporterName: student.name,
      reporterEmail: student.email,
    },
    {
      title: 'Blue Steel Bottle left at Library',
      type: 'found',
      category: 'Bottles & Lunchboxes',
      description: 'Found a blue metallic Fastrack water bottle on desk 8 in the library reading room. Deposited at Library Issue Counter.',
      location: 'Central Library Issue Counter',
      date: new Date(Date.now() - 6 * 60 * 60 * 1000),
      contactPhone: 'Library Desk',
      secretQuestion: 'What brand and capacity is the bottle?',
      secretAnswer: 'Fastrack 750ml',
      reportedBy: admin._id,
      reporterName: admin.name,
      reporterEmail: admin.email,
    },

    // ITEM 3: College ID Card
    {
      title: 'Student ID Card - CSE 3rd Year',
      type: 'found',
      category: 'ID & Cards',
      description: 'Found college smart card ID badge near Canteen Table 3 with blue college lanyard. Handed over to Campus Security Gate 1.',
      location: 'Main Canteen / Campus Security Gate 1',
      date: new Date(Date.now() - 4 * 60 * 60 * 1000),
      contactPhone: 'Security Gate 1',
      secretQuestion: 'What is the student name and USN on the card?',
      secretAnswer: 'Verify via college portal',
      reportedBy: admin._id,
      reporterName: admin.name,
      reporterEmail: admin.email,
    },

    // ITEM 4: Boat Earphones
    {
      title: 'Boat Airdopes 141 (Black Case)',
      type: 'lost',
      category: 'Electronics',
      description: 'Matte black wireless earbuds case with one earphone inside. Lost during lunch hour near Sports Ground basketball court.',
      location: 'Sports Ground Basketball Court',
      date: new Date(Date.now() - 48 * 60 * 60 * 1000),
      contactPhone: '9988776655',
      secretQuestion: 'Which earphone is missing from the case?',
      secretAnswer: 'Left earbud missing',
      reportedBy: student._id,
      reporterName: student.name,
      reporterEmail: student.email,
    },

    // ITEM 5: Keys Bunch
    {
      title: 'Bike Keys with Honda Keychain',
      type: 'found',
      category: 'Keys',
      description: 'Set of 2 keys with a red Honda rubber keychain and a small silver mini-torch. Found in Student Two-Wheeler Parking.',
      location: 'Student Two-Wheeler Parking Lot B',
      date: new Date(Date.now() - 10 * 60 * 60 * 1000),
      contactPhone: 'Parking Attendant',
      secretQuestion: 'What color is the keychain and what extra item is attached?',
      secretAnswer: 'Red Honda keychain with mini torch',
      reportedBy: admin._id,
      reporterName: admin.name,
      reporterEmail: admin.email,
    },
  ];

  for (const raw of sampleItems) {
    const aiKeywords = extractAiKeywords(raw.title, raw.description, raw.category, raw.location);
    const item = await LostFoundItem.create({ ...raw, aiKeywords });
    console.log(`Created [${item.type.toUpperCase()}]: ${item.title}`);
  }

  // Run AI Matchmaker across seeded items to link high matches automatically
  const lostItems = await LostFoundItem.find({ type: 'lost' });
  const foundItems = await LostFoundItem.find({ type: 'found' });

  for (const lost of lostItems) {
    for (const found of foundItems) {
      const match = calculateMatchScore(lost, found);
      if (match.score >= 70) {
        lost.status = 'matched';
        lost.matchedItem = found._id;
        await lost.save();

        found.status = 'matched';
        found.matchedItem = lost._id;
        await found.save();

        console.log(`⚡ AI Match Linked (${match.score}%): "${lost.title}" <--> "${found.title}"`);
      }
    }
  }

  console.log('Seeding finished successfully!');
  await mongoose.disconnect();
}

seed().catch(console.error);
