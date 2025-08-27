// For the application to work correctly, you need to provide a Google Client ID.
// Follow the instructions at https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid to get one.
// Once you have the Client ID, replace the placeholder text below with your actual ID.
// This file is intended for local development. In a production environment,
// these variables should be set through a proper build process or environment configuration.

window.process = window.process || {};
window.process.env = window.process.env || {};

window.process.env.REACT_APP_API_URL = 'http://localhost:3001'; // Backend API URL

// PASTE YOUR GOOGLE CLIENT ID HERE
// window.process.env.GOOGLE_CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID_HERE'; // Managed by Vite .env
// The Gemini API Key is assumed to be provided by the execution environment.
// If you are running locally and need to provide it manually, you can uncomment the following line:
// window.process.env.API_KEY = 'YOUR_GEMINI_API_KEY_HERE'; // Gemini API Key removed
