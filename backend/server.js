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

function normalizeProject(project) {
  return {
    id: String(project.id || `temp-${Date.now()}`), // Ensure ID is string, generate if missing
    name: String(project.name || ''),
    description: String(project.description || ''),
    shorts: Array.isArray(project.shorts) ? project.shorts : [],
    driveDocumentId: project.driveDocumentId ? String(project.driveDocumentId) : undefined,
    driveDocumentLink: project.driveDocumentLink ? String(project.driveDocumentLink) : undefined,
    driveLocation: project.driveLocation ? String(project.driveLocation) : undefined,
  };
}

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
import { scheduledTasks, publishVideo, postComment } from './src/api/youtube/youtube.controller.js';
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
      const parsed = JSON.parse(data);
      // Always convert to an array
      const projects = Array.isArray(parsed) ? parsed : [parsed];
      res.send(projects);
    } catch (parseError) {
      console.error('Error parsing projects.json:', parseError);
      res.status(500).send('Error parsing data file');
    }
  });
});

import authenticate from './src/middleware/auth.js';
import { createGoogleDoc, createGoogleDocInRoot } from './src/api/drive/drive.controller.js';
import { initDocumentTemplate } from './src/services/docs/docHelpers.js';
import { getTokensForUser } from './src/api/auth/auth.controller.js';
import { getGoogleClient } from './src/utils/googleClientUtils.js';

// Projects API
app.get('/api/projects', authenticate, async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).send('Unauthorized: User ID not found.');
    }

    const tokens = getTokensForUser(userId);
    if (!tokens) {
      throw new Error('User not authenticated for Google APIs.');
    }

    const drive = getGoogleClient(tokens, 'drive', 'v3');
    const docs = getGoogleClient(tokens, 'docs', 'v1');

    // Search for documents that represent projects
    // For now, let's assume projects are Google Docs with a specific naming convention or in a specific folder
    // We will search for all Google Docs for simplicity, and filter later if needed.
    const driveResponse = await drive.files.list({
      q: 'mimeType = "application/vnd.google-apps.document" and trashed = false',
      fields: 'files(id, name, webViewLink)',
      pageSize: 100, // Adjust as needed
    });

    const projectDocs = driveResponse.data.files || [];
    const projects = [];

    for (const docMetadata of projectDocs) {
      try {
        const docContent = await docs.documents.get({ documentId: docMetadata.id });
        const document = docContent.data;

        // Extract project details from the document
        // Assuming project name is the document title
        const projectName = document.title;
        let projectDescription = '';
        let shorts = [];

        // Find project description (if added by initDocumentTemplate)
        if (document.body && document.body.content) {
          for (const element of document.body.content) {
            if (element.paragraph && element.paragraph.elements) {
              const paragraphText = element.paragraph.elements
                .map(el => (el.textRun && el.textRun.content) || '')
                .join('').trim();
              
              // Assuming description is the first NORMAL_TEXT paragraph after HEADING_1
              if (element.paragraph.paragraphStyle && element.paragraph.paragraphStyle.namedStyleType === 'NORMAL_TEXT') {
                projectDescription = paragraphText;
                break; // Found description, move on
              }
            }
          }

          // Extract shorts data
          let currentShort = null;
          let currentSection = '';

          for (const element of document.body.content) {
            if (element.paragraph && element.paragraph.elements) {
              const paragraphText = element.paragraph.elements
                .map(el => (el.textRun && el.textRun.content) || '')
                .join('').trim();

              if (paragraphText.startsWith('SHORT_ID:')) {
                if (currentShort) {
                  shorts.push(currentShort);
                }
                currentShort = { id: paragraphText.substring('SHORT_ID:'.length).trim(), script: {}, metadata: {} };
                currentSection = ''; // Reset section
              } else if (currentShort) {
                if (paragraphText.startsWith('Status:')) {
                  currentShort.status = paragraphText.substring('Status:'.length).trim();
                } else if (paragraphText.startsWith('---')) {
                  if (paragraphText.includes('Script')) currentSection = 'script';
                  else if (paragraphText.includes('Metadata')) currentSection = 'metadata';
                } else if (currentSection === 'script') {
                  if (paragraphText.startsWith('Idea:')) currentShort.script.idea = paragraphText.substring('Idea:'.length).trim();
                  else if (paragraphText.startsWith('Draft:')) currentShort.script.draft = paragraphText.substring('Draft:'.length).trim();
                  else if (paragraphText.startsWith('Hook:')) currentShort.script.hook = paragraphText.substring('Hook:'.length).trim();
                  else if (paragraphText.startsWith('Body:')) currentShort.script.body = paragraphText.substring('Body:'.length).trim();
                  else if (paragraphText.startsWith('CTA:')) currentShort.script.cta = paragraphText.substring('CTA:'.length).trim();
                } else if (currentSection === 'metadata') {
                  if (paragraphText.startsWith('Tags:')) currentShort.metadata.tags = paragraphText.substring('Tags:'.length).trim();
                  else if (paragraphText.startsWith('CTA:')) currentShort.metadata.cta = paragraphText.substring('CTA:'.length).trim();
                  else if (paragraphText.startsWith('Image / B-Roll Ideas:')) currentShort.metadata.imageIdeas = paragraphText.substring('Image / B-Roll Ideas:'.length).trim();
                  else if (paragraphText.startsWith('Audio / Music Notes:')) currentShort.metadata.audioNotes = paragraphText.substring('Audio / Music Notes:'.length).trim();
                }
              }
            }
          }
          if (currentShort) {
            shorts.push(currentShort);
          }
        }

        projects.push(normalizeProject({
          id: docMetadata.id,
          name: projectName,
          description: projectDescription,
          shorts: shorts,
          driveDocumentId: docMetadata.id,
          driveDocumentLink: docMetadata.webViewLink,
        }));

      } catch (docError) {
        console.error(`Error processing document ${docMetadata.id}:`, docError);
      }
    }

    res.status(200).json(projects);

  } catch (error) {
    console.error('Error listing projects from Google Drive:', error.message);
    res.status(500).send('Failed to list projects from Google Drive.');
  }
});

app.post('/api/projects', authenticate, async (req, res) => {
  let newProject;

  if (Array.isArray(req.body)) {
    newProject = req.body[0];
  } else if (req.body && typeof req.body === 'object') {
    newProject = req.body;
  }

  if (!newProject) {
    return res.status(400).send({ error: 'Invalid project data' });
  }

  newProject = normalizeProject(newProject);

    try {
      const userId = req.userId; 
      if (!userId) {
        return res.status(401).send('Unauthorized: User ID not found.');
      }

      const docTitle = `${newProject.name} - Project Document`;
      let googleDoc = null;

      if (newProject.driveLocation) {
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
          googleDoc = await createGoogleDoc(userId, docTitle, parentFolderId);
          console.log(`Created Google Doc: ${googleDoc.name} (${googleDoc.id}) in specified folder at ${googleDoc.webViewLink}`);
        }
      } else {
        // If no driveLocation is provided, create in root
        googleDoc = await createGoogleDocInRoot(userId, docTitle);
        console.log(`Created Google Doc: ${googleDoc.name} (${googleDoc.id}) in root at ${googleDoc.webViewLink}`);
      }

      if (googleDoc) {
        newProject.id = googleDoc.id;
        newProject.driveDocumentId = googleDoc.id;
        newProject.driveDocumentLink = googleDoc.webViewLink;
        newProject.shorts = []; // Initialize shorts array

        // Initialize the new Google Doc with the template
        try {
          const docsClient = getGoogleClient(tokens, 'docs', 'v1');
          const tokens = getTokensForUser(userId);
          if (!tokens) {
            throw new Error('User not authenticated for Docs API.');
          }
          

          const templateRequests = initDocumentTemplate(newProject.name, newProject.description);
          await docsClient.documents.batchUpdate({
            documentId: googleDoc.id,
            requestBody: {
              requests: templateRequests,
            },
          });
          console.log(`Initialized Google Doc ${googleDoc.id} with template.`);
        } catch (templateError) {
          console.error('Error initializing Google Doc with template:', templateError);
          // Decide how to handle this error: fail project creation or proceed without template
        }
      }

    } catch (error) {
      console.error('Error creating Google Doc for project:', error);
      // Decide how to handle this error: fail project creation or proceed without Drive doc
      // For now, we'll just log and proceed without the Drive doc details
    }

  fs.writeFile(dataFilePath, JSON.stringify([normalizeProject(newProject)], null, 2), 'utf8', (err) => {
    if (err) {
      console.error('Error writing projects.json:', err);
      return res.status(500).send('Error writing data file');
    }
    res.send(normalizeProject(newProject)); // Return the updated newProject object
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

app.put('/api/projects/:projectId', authenticate, async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).send('Unauthorized: User ID not found.');
    }

    const { projectId } = req.params;
    const updatedProject = normalizeProject(req.body); // The updated project object from frontend

    const tokens = getTokensForUser(userId);
    if (!tokens) {
      throw new Error('User not authenticated for Docs API.');
    }

    const docs = getGoogleClient(tokens, 'docs', 'v1');
    const drive = getGoogleClient(tokens, 'drive', 'v3');

    const requests = [];

    // Update project name (document title) using Drive API
    if (updatedProject.name) {
      await drive.files.update({
        fileId: updatedProject.driveDocumentId,
        requestBody: {
          name: updatedProject.name,
        },
      });
    }

    

    // Update project description (find and replace in the document body)
    // This is a simplified approach. A more robust solution would involve
    // identifying the exact range of the description and replacing it.
    // For now, we'll assume the description is a single paragraph and replace its content.
    // This requires reading the current document to find the old description.
    console.log('Attempting to update Google Doc with ID:', updatedProject.driveDocumentId);
    const docContent = await docs.documents.get({ documentId: updatedProject.driveDocumentId });
    const document = docContent.data;
    let oldDescription = '';
    if (document.body && document.body.content) {
      for (const element of document.body.content) {
        if (element.paragraph && element.paragraph.elements && 
            element.paragraph.paragraphStyle && element.paragraph.paragraphStyle.namedStyleType === 'NORMAL_TEXT') {
          oldDescription = element.paragraph.elements
            .map(el => (el.textRun && el.textRun.content) || '')
            .join('').trim();
          break;
        }
      }
    }

    if (oldDescription !== updatedProject.description) {
      requests.push({
        replaceAllText: {
          replaceText: updatedProject.description,
          containsText: {
            text: oldDescription, // This is fragile if oldDescription is not unique
            matchCase: false,
          },
        },
      });
    }

    if (requests.length > 0) {
      await docs.documents.batchUpdate({
        documentId: projectId,
        requestBody: {
          requests,
        },
      });
    }

    // Return the updated project object (which now reflects the Google Doc state)
    res.status(200).json(updatedProject);

  } catch (error) {
    console.error('Error updating project in Google Drive:', error.message);
    res.status(500).send('Failed to update project in Google Drive.');
  }
});

app.delete('/api/projects/:projectId', authenticate, async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).send('Unauthorized: User ID not found.');
    }

    const { projectId } = req.params;

    const tokens = getTokensForUser(userId);
    if (!tokens) {
      throw new Error('User not authenticated for Drive API.');
    }

    const drive = getGoogleClient(tokens, 'drive', 'v3');

    await drive.files.delete({ fileId: projectId });

    res.status(204).send(); // No Content

  } catch (error) {
    console.error('Error deleting project from Google Drive:', error.message);
    res.status(500).send('Failed to delete project from Google Drive.');
  }
});

// Serve static files from the unified-project's public folder
app.use(express.static(path.join(__dirname, '../public'))); // Adjusted path

// Basic route for root
app.get('/', (req, res) => {
  res.send('Unified Backend is running!');
});

app.listen(PORT, () => {
  console.log(`Unified Backend server is running on port ${PORT}`);

  // Start the scheduler for YouTube video publishing
  setInterval(async () => {
    const now = new Date();
    for (let i = 0; i < scheduledTasks.length; i++) {
      const task = scheduledTasks[i];
      if (task.status === 'pending' && now >= task.publishTime) {
        console.log(`Executing scheduled task for video ${task.videoId}`);
        try {
          await publishVideo(task.userId, task.videoId);
          for (const comment of task.comments) {
            await postComment(task.userId, task.videoId, comment);
          }
          task.status = 'completed';
          console.log(`Task for video ${task.videoId} completed.`);
        } catch (error) {
          task.status = 'failed';
          console.error(`Task for video ${task.videoId} failed:`, error);
        }
      }
    }
    // Remove completed or failed tasks from the array to prevent re-processing
    scheduledTasks.splice(0, scheduledTasks.length, ...scheduledTasks.filter(task => task.status === 'pending'));
  }, 60 * 1000); // Run every 1 minute
});
