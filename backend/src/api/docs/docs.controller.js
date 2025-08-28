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


const extractShortContent = (documentContent, shortId) => {
  const shortData = {
    title: '',
    script: { idea: '', draft: '', hook: '', immersion: '', body: '', cta: '' },
    metadata: { tags: '', cta: '', imageIdeas: '', audioNotes: '' },
  };
  let inShortSection = false;
  let currentField = '';

  // Regex to find SHORT_ID and field labels
  const shortIdRegex = new RegExp(`SHORT_ID: ${shortId}`);
  const fieldLabels = {
    'Title': 'title',
    'Idea': 'script.idea',
    'Draft': 'script.draft',
    'Hook': 'script.hook',
    'Immersion': 'script.immersion',
    'Body': 'script.body',
    'CTA': 'script.cta', // This CTA is for script
    'Tags': 'metadata.tags',
    'Image Ideas': 'metadata.imageIdeas',
    'Audio Notes': 'metadata.audioNotes',
  };

  if (!documentContent || !documentContent.body || !documentContent.body.content) {
    return null;
  }

  for (const element of documentContent.body.content) {
    if (element.paragraph && element.paragraph.elements) {
      for (const textRun of element.paragraph.elements) {
        if (textRun.textRun && textRun.textRun.content) {
          const content = textRun.textRun.content;

          if (shortIdRegex.test(content)) {
            inShortSection = true;
            continue;
          }

          if (inShortSection) {
            let foundField = false;
            for (const label in fieldLabels) {
              if (content.startsWith(`${label}:`)) {
                currentField = fieldLabels[label];
                const value = content.substring(`${label}:`.length).trim();
                if (currentField.startsWith('script.')) {
                  shortData.script[currentField.split('.')[1]] = value;
                } else if (currentField.startsWith('metadata.')) {
                  shortData.metadata[currentField.split('.')[1]] = value;
                } else {
                  shortData[currentField] = value;
                }
                foundField = true;
                break;
              }
            }
            if (!foundField && currentField) {
              // Append to current field if it's a continuation (multiline)
              if (currentField.startsWith('script.')) {
                shortData.script[currentField.split('.')[1]] += '\n' + content.trim();
              } else if (currentField.startsWith('metadata.')) {
                shortData.metadata[currentField.split('.')[1]] += '\n' + content.trim();
              } else {
                shortData[currentField] += '\n' + content.trim();
              }
            }
          }
        }
      }
    }
  }
  return shortData;
};

export const getShortContentFromDoc = async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).send('Unauthorized: User ID not found.');
    }

    const docs = getDocsClient(userId);
    const { documentId, shortId } = req.params;

    if (!documentId || !shortId) {
      return res.status(400).send('Document ID and Short ID are required.');
    }

    const doc = await docs.documents.get({ documentId });
    const shortContent = extractShortContent(doc.data, shortId);

    if (!shortContent) {
      return res.status(404).send('Short content not found in document.');
    }

    res.status(200).json(shortContent);
  } catch (error) {
    console.error('Error getting short content from document:', error.message);
    res.status(500).send('Failed to get short content from document.');
  }
};

export const updateShortContentInDoc = async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).send('Unauthorized: User ID not found.');
    }

    const docs = getDocsClient(userId);
    const { documentId } = req.params;
    const { short } = req.body;

    if (!documentId || !short || !short.id) {
      return res.status(400).send('Document ID and short object with ID are required.');
    }

    const doc = await docs.documents.get({ documentId });
    const content = doc.data.body.content;

    let shortStartIndex = -1;
    let shortEndIndex = -1;

    // Find the start and end index of the short's content based on SHORT_ID
    for (let i = 0; i < content.length; i++) {
      const element = content[i];
      if (element.paragraph && element.paragraph.elements) {
        const paragraphText = element.paragraph.elements
          .map((el) => (el.textRun && el.textRun.content) || '')
          .join('');

        if (paragraphText.includes(`SHORT_ID: ${short.id}`)) {
          shortStartIndex = element.startIndex;
          // Now find the end of this short's section
          for (let j = i + 1; j < content.length; j++) {
            const nextElement = content[j];
            if (nextElement.paragraph && nextElement.paragraph.elements) {
              const nextParagraphText = nextElement.paragraph.elements
                .map((el) => (el.textRun && el.textRun.content) || '')
                .join('');
              if (nextParagraphText.includes('SHORT_ID:')) {
                shortEndIndex = nextElement.startIndex;
                break;
              }
            }
          }
          break; // Found the start, so break from the main loop
        }
      }
    }

    if (shortStartIndex !== -1 && shortEndIndex === -1) {
      // If no next SHORT_ID found, it's the last short in the document
      const lastElement = doc.data.body.content[doc.data.body.content.length - 1];
      shortEndIndex = lastElement.endIndex - 1;
    }

    if (shortStartIndex === -1 || shortEndIndex === -1) {
      return res.status(404).send('Short content not found for update.');
    }

    console.log(`DEBUG: Updating shortId: ${short.id}`);
    console.log(`DEBUG: Calculated shortStartIndex: ${shortStartIndex}`);
    console.log(`DEBUG: Calculated shortEndIndex: ${shortEndIndex}`);

    const requests = [];

    // 1. Delete existing content for the short
    requests.push({
      deleteContentRange: {
        range: {
          startIndex: shortStartIndex,
          endIndex: shortEndIndex,
        },
      },
    });

    // 2. Insert updated content for the short at the original start index
    const insertRequests = docHelpers.generateShortContentRequests(short, shortStartIndex);
    requests.push(...insertRequests);

    console.log('DEBUG: Generated batchUpdate requests:', JSON.stringify(requests, null, 2));

    const response = await docs.documents.batchUpdate({
      documentId,
      requestBody: {
        requests,
      },
    });

    res.status(200).json(response.data);
  } catch (error) {
    console.error('Error updating short content in document:', error.message);
    res.status(500).send('Failed to update short content in document.');
  }
};

export const addShortToDocument = async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).send('Unauthorized: User ID not found.');
    }

    const docs = getDocsClient(userId);
    const { documentId } = req.params;
    const { short } = req.body;

    if (!documentId || !short) {
      return res.status(400).send('Document ID and short object are required.');
    }

    // Get the current document content to find the end index
    const doc = await docs.documents.get({ documentId });
    const endIndex = doc.data.body.content[doc.data.body.content.length - 1].endIndex - 1;

    const requests = docHelpers.generateShortContentRequests(short, endIndex);

    const response = await docs.documents.batchUpdate({
      documentId,
      requestBody: {
        requests,
      },
    });

    res.status(200).json(response.data);
  } catch (error) {
    console.error('Error adding short to document:', error.message);
    res.status(500).send('Failed to add short to document.');
  }
};
