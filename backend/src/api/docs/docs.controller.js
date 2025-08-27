import { google } from 'googleapis';
import oauth2Client from '../../config/googleClient.js';
import { getTokensForUser } from '../auth/auth.controller.js';
import * as docHelpers from '../../services/docs/docHelpers.js';

// Helper to get a configured Docs API client for a user
const getDocsClient = (userId) => {
  const tokens = getTokensForUser(userId);
  if (!tokens) {
    throw new Error('User not authenticated.');
  }
  oauth2Client.setCredentials(tokens);
  return google.docs({ version: 'v1', auth: oauth2Client });
};

export const createDocument = async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).send('Unauthorized: User ID not found.');
    }

    const docs = getDocsClient(userId);
    const { title } = req.body;

    if (!title) {
      return res.status(400).send('Document title is required.');
    }

    const response = await docs.documents.create({
      requestBody: {
        title,
      },
    });

    res.status(200).json(response.data);
  } catch (error) {
    console.error('Error creating document:', error.message);
    res.status(500).send('Failed to create document.');
  }
};

export const getDocumentContent = async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).send('Unauthorized: User ID not found.');
    }

    const docs = getDocsClient(userId);
    const { documentId } = req.params;

    if (!documentId) {
      return res.status(400).send('Document ID is required.');
    }

    const response = await docs.documents.get({
      documentId,
    });

    res.status(200).json(response.data);
  } catch (error) {
    console.error('Error getting document content:', error.message);
    res.status(500).send('Failed to get document content.');
  }
};

export const batchUpdateDocument = async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).send('Unauthorized: User ID not found.');
    }

    const docs = getDocsClient(userId);
    const { documentId } = req.params;
    const { requests } = req.body; // Array of requests for batchUpdate

    if (!documentId || !requests || !Array.isArray(requests)) {
      return res.status(400).send('Document ID and an array of requests are required.');
    }

    const response = await docs.documents.batchUpdate({
      documentId,
      requestBody: {
        requests,
      },
    });

    res.status(200).json(response.data);
  } catch (error) {
    console.error('Error batch updating document:', error.message);
    res.status(500).send('Failed to batch update document.');
  }
};
