import oauth2Client from '../../config/googleClient.js';
import { google } from 'googleapis';

// In a real application, you would store tokens securely (e.g., in a database)
// For this example, we'll use a simple in-memory store for demonstration purposes.
const tokensStore = {}; // userId: { access_token, refresh_token, expiry_date }

export const googleAuth = (req, res) => {
  const defaultScopes = [
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile',
    'https://www.googleapis.com/auth/drive',
    'https://www.googleapis.com/auth/youtube.force-ssl',
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/documents',
    'https://www.googleapis.com/auth/yt-analytics.readonly',
  ];

  // Get scopes from query parameter, e.g., ?scopes=drive.file,sheets.readonly
  const requestedScopes = req.query.scopes ? req.query.scopes.split(',').map(s => `https://www.googleapis.com/auth/${s.trim()}`) : [];

  const scopes = [...new Set([...defaultScopes, ...requestedScopes])];

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent', // Always ask for consent to ensure refresh token is granted
  });

  res.redirect(authUrl);
};

export const googleAuthCallback = async (req, res) => {
  const { code } = req.query;
  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // In a real app, you'd identify the user and store these tokens securely.
    // For simplicity, we'll just store them in a global object for now.
    // You might want to associate these tokens with a session or user ID.
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();
    const userId = userInfo.data.id; // Use Google ID as unique identifier
    tokensStore[userId] = tokens;

    // Store user info in session
    req.session.user = { id: userId, email: userInfo.data.email, name: userInfo.data.name }; // Store a simple user object

    console.log('Tokens received and stored for user:', userId);
    console.log('User stored in session:', req.session.user);

    // Redirect to the frontend application's base URL
    res.redirect('http://localhost:5174');
  } catch (error) {
    console.error('Error retrieving access token:', error.message);
    res.status(500).send('Authentication failed');
  }
};

// Helper to get tokens for a user (for middleware or other API calls)
export const getTokensForUser = (userId) => {
  return tokensStore[userId];
};

// Helper to set credentials for a specific API call
export const setCredentialsForClient = (userId) => {
  const tokens = tokensStore[userId];
  if (tokens) {
    oauth2Client.setCredentials(tokens);
    return true;
  }
  return false;
};

export const checkAuthStatus = (req, res) => {
  if (req.session.user) {
    res.status(200).json({ authenticated: true, user: req.session.user });
  } else {
    res.status(401).send('Unauthorized: Please authenticate first.');
  }
};

export const getMe = async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId || !tokensStore[userId]) {
      return res.status(401).send('Unauthorized');
    }

    oauth2Client.setCredentials(tokensStore[userId]);

    const youtube = google.youtube({ version: 'v3', auth: oauth2Client });
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });

    // Fetch YouTube Channel Info
    const channelResponse = await youtube.channels.list({
      mine: true,
      part: 'id,snippet',
    });

    // Fetch Google User Info
    const userInfoResponse = await oauth2.userinfo.get();

    if (!channelResponse.data.items || channelResponse.data.items.length === 0) {
      // This can happen if the user has a Google account but no YouTube channel.
      // We can still return the basic user info.
      return res.status(200).json(userInfoResponse.data);
    }

    const userProfile = {
      ...userInfoResponse.data,
      channelId: channelResponse.data.items[0].id,
      channelTitle: channelResponse.data.items[0].snippet.title,
      channelThumbnail: channelResponse.data.items[0].snippet.thumbnails.default.url,
    };

    res.status(200).json(userProfile);
  } catch (error) {
    console.error('Error fetching user profile:', error.message);
    res.status(500).send('Failed to fetch user profile.');
  }
};

