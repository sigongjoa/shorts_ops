import 'dotenv/config'; // Load environment variables at the very top
import express from 'express';
import cors from 'cors';
import session from 'express-session';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';

// ES Module equivalent of __dirname and __filename
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3002; // Use 3001 for unified backend

// --- CORS Configuration (from gcp_test, updated for unified-project frontend) ---
const whitelist = ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:5174']; // Add unified-project frontend URL
const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (whitelist.includes(origin)) {
      callback(null, origin); // Pass the specific origin back
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
};
app.use(cors(corsOptions));

// --- Common Middleware ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: process.env.SESSION_SECRET || 'keyboard cat', // Use a strong secret from .env
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // true in production (https), false in development (http)
    sameSite: 'lax'      // 'lax' for redirect logins, 'none' if cross-site cookies are needed with secure: true
  }
}));

// --- GCP Test Routes (from gcp_test/server.js) ---
// Note: These routes expect modules in ./src/api/
import authRoutes from './src/api/auth/auth.routes.js';
app.use('/auth', authRoutes);

import driveRoutes from './src/api/drive/drive.routes.js';
app.use('/api/drive', driveRoutes);

import sheetsRoutes from './src/api/sheets/sheets.routes.js';
app.use('/api/sheets', sheetsRoutes);

import docsRoutes from './src/api/docs/docs.routes.js';
app.use('/api/docs', docsRoutes);

import youtubeRoutes from './src/api/youtube/youtube.routes.js';
app.use('/api/youtube', youtubeRoutes);

// --- Unified Project Routes (from unified-project/server.js) ---

// Ensure uploads directory exists (relative to unified-project/backend)
const uploadsDir = path.join(__dirname, '../public', 'uploads', 'images'); // Adjusted path
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage: storage });

// Adjusted paths for data files (relative to unified-project/backend)
const dataFilePath = path.join(__dirname, '../public', 'data', 'projects.json');
const topicsFilePath = path.join(__dirname, '../public', 'data', 'topics.json');
const scriptFilePath = path.join(__dirname, '../public', 'data', 'script.json');

// Custom route to serve images with explicit CORS headers (now handled by global corsOptions)
app.get('/uploads/images/:filename', (req, res) => {
  const filename = req.params.filename;
  const imagePath = path.join(uploadsDir, filename); // Use uploadsDir directly

  fs.readFile(imagePath, (err, data) => {
    if (err) {
      console.error('Error reading image:', err);
      return res.status(404).send('Image not found');
    }
    res.setHeader('Content-Type', 'image/png');
    res.send(data);
  });
});

// Multiple image upload endpoint
app.post('/api/upload/multiple-images', upload.array('images', 20), (req, res) => {
  console.log('--- Request Received for /api/upload/multiple-images ---');
  console.log('files:', req.files?.map(f => f.originalname));

  if (!req.files || req.files.length === 0) {
    return res.status(400).send('No files uploaded.');
  }

  const imageUrls = req.files.map(file => {
    return `${req.protocol}://${req.get('host')}/uploads/images/${file.filename}`;
  });

  res.json(imageUrls);
});

// Single image upload endpoint
app.post('/api/upload/image', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).send('No file uploaded.');
  }
  const imageUrl = `${req.protocol}://${req.get('host')}/uploads/images/${req.file.filename}`;
  res.json({ imageUrl });
});

// Projects API
app.get('/api/projects', (req, res) => {
  fs.readFile(dataFilePath, 'utf8', (err, data) => {
    if (err) {
      if (err.code === 'ENOENT') {
        return res.send([]);
      }
      console.error('Error reading projects.json:', err);
      return res.status(500).send('Error reading data file');
    }
    if (data.trim() === '') {
      return res.send([]);
    }
    try {
      res.send(JSON.parse(data));
    } catch (parseError) {
      console.error('Error parsing projects.json:', parseError);
      res.status(500).send('Error parsing data file');
    }
  });
});

import authenticate from './src/middleware/auth.js';
import { createGoogleDoc } from './src/api/drive/drive.controller.js';

// Projects API
app.get('/api/projects', authenticate, (req, res) => {
  fs.readFile(dataFilePath, 'utf8', (err, data) => {
    if (err) {
      if (err.code === 'ENOENT') {
        return res.send([]);
      }
      console.error('Error reading projects.json:', err);
      return res.status(500).send('Error reading data file');
    }
    if (data.trim() === '') {
      return res.send([]);
    }
    try {
      res.send(JSON.parse(data));
    } catch (parseError) {
      console.error('Error parsing projects.json:', parseError);
      res.status(500).send('Error parsing data file');
    }
  });
});

app.post('/api/projects', authenticate, async (req, res) => {
  let newProjects = req.body;
  const newProject = newProjects[0]; // Assuming the new project is the first one in the array

  if (newProject && newProject.driveLocation) {
    const driveUrl = newProject.driveLocation;
    const folderIdMatch = driveUrl.match(/folders\/([a-zA-Z0-9_-]+)/);
    let parentFolderId = null;

    if (folderIdMatch && folderIdMatch[1]) {
      parentFolderId = folderIdMatch[1];
    } else {
      // If it's not a folder URL, try to use it directly as an ID
      parentFolderId = driveUrl;
    }

    if (parentFolderId) {
      try {
        // Assuming userId is available from authentication middleware
        const userId = req.userId; 
        if (!userId) {
          return res.status(401).send('Unauthorized: User ID not found.');
        }

        const docTitle = `${newProject.name} - Project Document`;
        const googleDoc = await createGoogleDoc(userId, docTitle, parentFolderId);
        newProject.driveDocumentId = googleDoc.id;
        newProject.driveDocumentLink = googleDoc.webViewLink;
        console.log(`Created Google Doc: ${googleDoc.name} (${googleDoc.id}) at ${googleDoc.webViewLink}`);
      } catch (error) {
        console.error('Error creating Google Doc for project:', error);
        // Decide how to handle this error: fail project creation or proceed without Drive doc
        // For now, we'll just log and proceed without the Drive doc details
      }
    }
  }

  fs.writeFile(dataFilePath, JSON.stringify(newProjects, null, 2), 'utf8', (err) => {
    if (err) {
      console.error('Error writing projects.json:', err);
      return res.status(500).send('Error writing data file');
    }
    res.send({ message: 'Data saved successfully' });
  });
});

// Topics API
app.get('/api/topics', (req, res) => {
  fs.readFile(topicsFilePath, 'utf8', (err, data) => {
    if (err) {
      if (err.code === 'ENOENT') {
        return res.send([]);
      }
      console.error('Error reading topics.json:', err);
      return res.status(500).send('Error reading data file');
    }
    if (data.trim() === '') {
      return res.send([]);
    }
    try {
      res.send(JSON.parse(data));
    } catch (parseError) {
      console.error('Error parsing topics.json:', parseError);
      res.status(500).send('Error parsing data file');
    }
  });
});

app.post('/api/topics', (req, res) => {
  const newData = req.body;
  fs.writeFile(topicsFilePath, JSON.stringify(newData, null, 2), 'utf8', (err) => {
    if (err) {
      console.error('Error writing topics.json:', err);
      return res.status(500).send('Error writing data file');
    }
    res.send({ message: 'Data saved successfully' });
  });
});

// Script API
app.get('/api/script', (req, res) => {
  fs.readFile(scriptFilePath, 'utf8', (err, data) => {
    if (err) {
      if (err.code === 'ENOENT') {
        return res.send({});
      }
      console.error('Error reading script.json:', err);
      return res.status(500).send('Error reading data file');
    }
    if (data.trim() === '') {
      return res.send({});
    }
    try {
      res.send(JSON.parse(data));
    } catch (parseError) {
      console.error('Error parsing script.json:', parseError);
      res.status(500).send('Error parsing data file');
    }
  });
});

app.post('/api/script', (req, res) => {
  const newData = req.body;
  fs.writeFile(scriptFilePath, JSON.stringify(newData, null, 2), 'utf8', (err) => {
    if (err) {
      console.error('Error writing script.json:', err);
      return res.status(500).send('Error writing data file');
    }
    res.send({ message: 'Data saved successfully' });
  });
});

// Serve static files from the unified-project's public folder
app.use(express.static(path.join(__dirname, '../public'))); // Adjusted path

// Basic route for root
app.get('/', (req, res) => {
  res.send('Unified Backend is running!');
});

app.listen(PORT, () => {
  console.log(`Unified Backend server is running on port ${PORT}`);
});