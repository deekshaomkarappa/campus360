require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

async function run() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    console.log('Please add ADMIN_EMAIL and ADMIN_PASSWORD to the .env file');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    console.log('An account with this email already exists. Nothing changed.');
  } else {
    const passwordHash = await bcrypt.hash(password, 10);
    await User.create({ name: 'Canteen Admin', email, passwordHash, role: 'admin' });
    console.log('Admin account created:', email);
  }

  await mongoose.disconnect();
}

run();