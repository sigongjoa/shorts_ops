const express = require('express');
const multer  = require('multer');
const path = require('path');
const fs = require('fs'); // Added fs for directory check

const app = express();

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'public/uploads/images');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir); // Use uploadsDir
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage });

//  문제 되는 부분 최소화
app.post('/api/upload/multiple-images', upload.array('images', 10), (req, res) => {
  console.log('files:', req.files?.map(f => f.originalname));
  res.json({ success: true, count: req.files.length });
});

app.listen(3001, () => console.log('Backend server listening at http://localhost:3001'));