const express = require('express');
const cors = require('cors');
const { MongoClient, ObjectId } = require('mongodb');

const app = express();

// Increase the body parser limits to handle larger file uploads
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cors());

// Connection URI for MongoDB; adjust if needed
const uri = 'mongodb://localhost:27017';
const client = new MongoClient(uri, { useUnifiedTopology: true });

let db;

// Function to connect to MongoDB and set the global db variable
async function connectDB() {
  try {
    await client.connect();
    db = client.db("notes");
    // Ping the database to confirm connection
    await db.command({ ping: 1 });
    console.log("Connected to MongoDB");
  } catch (error) {
    console.error("MongoDB connection error:", error);
    process.exit(1);
  }
}

// API Endpoint to upload a note
app.post('/api/notes', async (req, res) => {
  try {
    // Expecting the note object in the request body
    const note = req.body;
    // Insert the note into the collection "notesData"
    const result = await db.collection("notesData").insertOne(note);
    res.json({ success: true, insertedId: result.insertedId });
  } catch (error) {
    console.error("Error saving note:", error);
    res.status(500).json({ success: false, message: "Error saving note" });
  }
});

// API Endpoint to fetch notes by subject
app.get('/api/notes', async (req, res) => {
  try {
    const subject = req.query.subject;
    const notes = await db.collection("notesData").find({ subject }).toArray();
    res.json({ success: true, notes });
  } catch (error) {
    console.error("Error retrieving notes:", error);
    res.status(500).json({ success: false, message: "Error retrieving notes" });
  }
});

// API Endpoint to delete a note by its MongoDB _id
app.delete('/api/notes/:id', async (req, res) => {
  try {
    const noteId = req.params.id;
    const result = await db.collection("notesData").deleteOne({ _id: new ObjectId(noteId) });
    res.json({ success: result.deletedCount === 1 });
  } catch (error) {
    console.error("Error deleting note:", error);
    res.status(500).json({ success: false, message: "Error deleting note" });
  }
});

// Define the port to run on (4001 or environment port)
const PORT = process.env.PORT || 4001;

app.get('/api/check-collection', async (req, res) => {
  try {
    const collections = await db.listCollections().toArray();
    const collectionExists = collections.some(col => col.name === 'notesData');
    res.json({ success: true, collectionExists });
  } catch (error) {
    console.error("Error checking collection:", error);
    res.status(500).json({ success: false, message: "Error checking collection" });
  }
});

app.post('/api/create-collection', async (req, res) => {
  try {
    await db.createCollection("notesData");
    res.json({ success: true, message: "Collection 'notesData' created." });
  } catch (error) {
    console.error("Error creating collection:", error);
    res.status(500).json({ success: false, message: "Error creating collection" });
  }
});

// Connect to MongoDB and then start the server
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}).catch(error => {
  console.error("Failed to connect to database.", error);
  process.exit(1);
});
