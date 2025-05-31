// server.js
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');

const saltRounds = 10;
const app = express();

// Connect to the "connect" DB
mongoose.connect('mongodb://localhost:27017/connect', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('Connected to MongoDB (connect DB)'))
.catch(err => console.error('MongoDB connection error:', err));

app.use(cors());
app.use(express.json());

// Define the user schema and model
const userSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  collegeName: { type: String } // <-- Field to store the user's college
});
const User = mongoose.model('User', userSchema);

/**
 * Registration Route
 * ------------------
 * Expects: { username: string, password: string, collegeName: string }
 */
app.post('/register', async (req, res) => {
  try {
    const { username, password, collegeName } = req.body;
    
    // 1. Check if user already exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // 2. Hash the password
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // 3. Store the new user in MongoDB
    const newUser = new User({ username, password: hashedPassword, collegeName });
    await newUser.save();

    return res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ message: 'Server error during registration' });
  }
});

/**
 * Login Route
 * -----------
 * Expects: { username: string, password: string, collegeName?: string }
 */
app.post('/login', async (req, res) => {
  try {
    const { username, password, collegeName } = req.body;
    
    // 1. Find the user in MongoDB by username
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).json({ message: 'User does not exist' });
    }

    // 2. Compare the provided password with the stored hashed password
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // 3. Compare the provided collegeName with the one in the database
    if (user.collegeName !== collegeName) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // If username, password, and collegeName are correct, login is successful
    // 4. Return user info including collegeName
    return res.status(200).json({
      message: 'Login successful',
      user: {
        username: user.username,
        collegeName: user.collegeName
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ message: 'Server error during login' });
  }
});

// Optional route to see all users (for testing):
// DO NOT USE in production, as it exposes all user data (even if hashed).

app.get('/users', async (req, res) => {
  try {
    const users = await User.find({});
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Error fetching users' });
  }
});

// Start the server
const port = 3000;
app.listen(port, () => {
  console.log(`Auth server running on port ${port}`);
});

