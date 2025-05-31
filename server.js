// server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const path = require('path');

const app = express();
const PORT = 5500;

// ─── 1) MIDDLEWARE ────────────────────────────────────
app.use(cors());                                  // allow calls from your static server (eg http://localhost:5500)
app.use(express.json());                          // parse JSON bodies
app.use(express.urlencoded({ extended: true }));  // parse URL‑encoded bodies (not strictly needed here)
app.use('/uploads', express.static(path.join(__dirname, 'uploads'))); // serve uploads

// ─── 2) MONGODB CONNECTION ───────────────────────────
mongoose.connect('mongodb://localhost:27017/postDB', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('✅ MongoDB connected'))
.catch(err => console.error('❌ MongoDB connection error:', err));

// ─── 3) SCHEMA & MODEL ───────────────────────────────
const postSchema = new mongoose.Schema({
  username:      String,
  caption:       String,
  tags:          String,
  mediaURL:      String,
  mediaType:     String,
  privacy:       String,
  disableComments: Boolean,
  disableLikes:    Boolean,
  liked:         Boolean,
  likes:         Number,
  comments:      [String],
  createdAt:     { type: Date, default: Date.now }
});
const Post = mongoose.model('Post', postSchema);

// ─── 4) MULTER FOR FILE UPLOADS ──────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename:    (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({
  storage,
  limits: { fileSize: 300 * 1024 * 1024 }  // up to 300 MB
});

// ─── 5) ROUTES ───────────────────────────────────────

// GET all posts
app.get('/posts', async (req, res) => {
  try {
    const posts = await Post.find().sort({ createdAt: -1 });
    res.json(posts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST a new post (with a single file field named "media")
app.post('/posts', upload.single('media'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded.' });
  }
  try {
    const { username, caption, tags, privacy, disableComments, disableLikes } = req.body;
    const newPost = new Post({
      username,
      caption,
      tags,
      mediaURL: `/uploads/${req.file.filename}`,
      mediaType: req.file.mimetype,
      privacy,
      disableComments: disableComments === 'true',
      disableLikes:    disableLikes  === 'true',
      liked:      false,
      likes:      0,
      comments:   []
    });
    const saved = await newPost.save();
    res.status(201).json(saved);
  } catch (err) {
    console.error('Error saving post:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// DELETE a post by ID
app.delete('/posts/:id', async (req, res) => {
  try {
    await Post.findByIdAndDelete(req.params.id);
    res.json({ message: 'Post deleted.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET user info (simulated)
app.get('/user/:username', (req, res) => {
  let u = req.params.username.replace(/^@/, '');
  res.json({ username: u });
});

// ─── 6) START SERVER ─────────────────────────────────
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
