import { getTokensForUser, setCredentialsForClient } from '../api/auth/auth.controller.js';

// This is a simplified middleware. In a real app, you'd handle sessions/JWTs
// and retrieve the user ID from the request (e.g., from a session cookie).
const authenticate = (req, res, next) => {
  const userId = 'demoUser'; // This should come from a session or JWT in a real app

  const tokens = getTokensForUser(userId);
  if (!tokens) {
    return res.status(401).send('Unauthorized: Please authenticate first.');
  }

  // Set credentials for the oauth2Client for the current request
  // In a more robust app, you'd manage token expiry and refresh here.
  setCredentialsForClient(userId);

  req.userId = userId; // Attach userId to request for later use
  next();
};

export default authenticate;
