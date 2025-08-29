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

    // 1. Create the document
    const createResponse = await docs.documents.create({
      requestBody: {
        title,
      },
    });

    const documentId = createResponse.data.documentId;

    // 2. Initialize it with the TOC template
    const templateRequests = docHelpers.initDocumentTemplate(title);
    await docs.documents.batchUpdate({
      documentId,
      requestBody: {
        requests: templateRequests,
      },
    });

    res.status(200).json(createResponse.data);
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
      suggestionsViewMode: 'PREVIEW_WITHOUT_SUGGESTIONS',
    });

    res.status(200).json(response.data);
  } catch (error) {
    console.error('Error getting document content:', error.message);
    res.status(500).send('Failed to get document content.');
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

    // Get the current document to find the end and the TOC anchor
    const doc = await docs.documents.get({ documentId });
    const document = doc.data;

    // Find the end index of the document body
    const lastElement = document.body.content[document.body.content.length - 1];
    const insertionIndex = lastElement.endIndex - 1;

    // Generate requests for the new short page and for the TOC update
    const shortPageRequests = docHelpers.generateShortPageRequests(short, insertionIndex);
    const tocUpdateRequests = docHelpers.generateTocUpdateRequest(short, document);

    const allRequests = [...shortPageRequests, ...tocUpdateRequests];

    if (allRequests.length === 0) {
        return res.status(400).send('Could not generate requests. TOC anchor might be missing.');
    }

    const response = await docs.documents.batchUpdate({
      documentId,
      requestBody: {
        requests: allRequests,
      },
    });

    res.status(200).json(response.data);
  } catch (error) {
    console.error('Error adding short to document:', error.message);
    res.status(500).send('Failed to add short to document.');
  }
};

// The batchUpdate, getShortContentFromDoc, and updateShortContentInDoc functions
// need significant rework to be compatible with the new table-based structure.
// The logic of finding and replacing text ranges becomes much more complex.
// Below are placeholders or simplified versions.

export const batchUpdateDocument = async (req, res) => {
    // This function remains useful for generic updates but should be used with caution
    // as it can break the structured template.
    try {
        const userId = req.userId;
        if (!userId) {
          return res.status(401).send('Unauthorized: User ID not found.');
        }
    
        const docs = getDocsClient(userId);
        const { documentId } = req.params;
        const { requests } = req.body;
    
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

    // Get the full document content
    const doc = await docs.documents.get({ documentId });
    const documentContent = doc.data;

    // Find the start index of the short's content based on SHORT_ID
    let shortStartIndex = -1;
    for (const element of documentContent.body.content) {
      if (element.paragraph && element.paragraph.elements) {
        const paragraphText = element.paragraph.elements
          .map((el) => (el.textRun && el.textRun.content) || '')
          .join('');

        if (paragraphText.includes(`SHORT_ID: ${shortId}`)) {
          shortStartIndex = element.startIndex;
          break;
        }
      }
    }

    if (shortStartIndex === -1) {
      return res.status(404).send('Short content not found in document.');
    }

    // Extract content from the found short section
    // We need to find the end of this short's section to slice correctly.
    // For simplicity, we'll assume the short content goes until the next SHORT_ID or end of document.
    let shortEndIndex = documentContent.body.content.length; // Default to end of document
    let foundShortSection = false;

    for (let i = 0; i < documentContent.body.content.length; i++) {
        const element = documentContent.body.content[i];
        if (element.paragraph && element.paragraph.elements) {
            const paragraphText = element.paragraph.elements
                .map(el => (el.textRun && el.textRun.content) || '')
                .join('');

            if (paragraphText.includes(`SHORT_ID: ${shortId}`)) {
                foundShortSection = true;
            } else if (foundShortSection && paragraphText.includes('SHORT_ID:')) {
                // Found the start of the next short, so this is the end of the current one
                shortEndIndex = i; // Index of the element that starts the next short
                break;
            }
        }
    }

    const shortContentElements = documentContent.body.content.slice(shortStartIndex, shortEndIndex);

    const shortData = {
        title: '',
        status: '',
        script: { idea: '', draft: '', hook: '', immersion: '', body: '', cta: '' },
        metadata: { tags: '', cta: '', imageIdeas: '', audioNotes: '' },
    };

    let currentSection = '';

    for (const element of shortContentElements) {
        if (element.paragraph && element.paragraph.elements) {
            const paragraphText = element.paragraph.elements
                .map(el => (el.textRun && el.textRun.content) || '')
                .join('').trim();

            if (paragraphText.startsWith(`SHORT_ID: ${shortId}`)) {
                // This is the short ID line, skip
                continue;
            } else if (paragraphText.startsWith('Title:')) {
                shortData.title = paragraphText.substring('Title:'.length).trim();
            } else if (paragraphText.startsWith('Status:')) {
                shortData.status = paragraphText.substring('Status:'.length).trim();
            } else if (paragraphText.startsWith('--- Script ---')) {
                currentSection = 'script';
            } else if (paragraphText.startsWith('--- Metadata ---')) {
                currentSection = 'metadata';
            } else if (currentSection === 'script') {
                if (paragraphText.startsWith('Idea:')) shortData.script.idea = paragraphText.substring('Idea:'.length).trim();
                else if (paragraphText.startsWith('Draft:')) shortData.script.draft = paragraphText.substring('Draft:'.length).trim();
                else if (paragraphText.startsWith('Hook:')) shortData.script.hook = paragraphText.substring('Hook:'.length).trim();
                else if (paragraphText.startsWith('Body:')) shortData.script.body = paragraphText.substring('Body:'.length).trim();
                else if (paragraphText.startsWith('CTA:')) shortData.script.cta = paragraphText.substring('CTA:'.length).trim();
            } else if (currentSection === 'metadata') {
                if (paragraphText.startsWith('Tags:')) shortData.metadata.tags = paragraphText.substring('Tags:'.length).trim();
                // Add other metadata fields if needed
            }
        }
    }

    res.status(200).json(shortData);
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
    const { documentId, shortId } = req.params;
    const { short: updatedShort } = req.body;

    if (!documentId || !shortId || !updatedShort) {
      return res.status(400).send('Document ID, Short ID, and updated short object are required.');
    }

    // 1. Get the full document content
    const doc = await docs.documents.get({ documentId });
    const documentContent = doc.data;

    let shortStartIndex = -1;
    let shortEndIndex = -1;

    // Find the start and end indices of the short's content
    for (let i = 0; i < documentContent.body.content.length; i++) {
      const element = documentContent.body.content[i];
      if (element.paragraph && element.paragraph.elements) {
        const paragraphText = element.paragraph.elements
          .map((el) => (el.textRun && el.textRun.content) || '')
          .join('');

        if (paragraphText.includes(`SHORT_ID: ${shortId}`)) {
          shortStartIndex = element.startIndex;
          // Assume the short content ends before the next SHORT_ID or end of document
          for (let j = i + 1; j < documentContent.body.content.length; j++) {
            const nextElement = documentContent.body.content[j];
            if (nextElement.paragraph && nextElement.paragraph.elements) {
              const nextParagraphText = nextElement.paragraph.elements
                .map((el) => (el.textRun && el.textRun.content) || '')
                .join('');
              if (nextParagraphText.includes('SHORT_ID:')) {
                shortEndIndex = nextElement.startIndex - 1; // End before the next short
                break;
              }
            }
          }
          if (shortEndIndex === -1) {
            shortEndIndex = documentContent.body.content[documentContent.body.content.length - 1].endIndex - 1; // End of document
          }
          break;
        }
      }
    }

    if (shortStartIndex === -1 || shortEndIndex === -1) {
      return res.status(404).send('Short content not found in document.');
    }

    // 2. Generate new content for the short
    // This should mirror the structure created by generateShortPageRequests
    const newContent = 
      `SHORT_ID: ${updatedShort.id}\n` +
      `${updatedShort.title}\n` +
      `--------------------\n` +
      `Status: ${updatedShort.status}\n\n` +
      `--- Script ---\n` +
      `Idea: ${updatedShort.script.idea}\n` +
      `Draft: ${updatedShort.script.draft}\n` +
      `Hook: ${updatedShort.script.hook}\n` +
      `Body: ${updatedShort.script.body}\n` +
      `CTA: ${updatedShort.script.cta}\n\n` +
      `--- Metadata ---\n` +
      `Tags: ${updatedShort.metadata.tags}\n`;

    const requests = [
      // Delete existing content
      {
        deleteContent: {
          range: { startIndex: shortStartIndex, endIndex: shortEndIndex },
        },
      },
      // Insert new content
      {
        insertText: {
          text: newContent,
          location: { index: shortStartIndex },
        },
      },
    ];

    // Re-apply styling for the SHORT_ID and Title
    // This is a simplified approach and might not perfectly replicate all original styling
    // For SHORT_ID (hidden)
    requests.push({
      updateTextStyle: {
        range: { startIndex: shortStartIndex, endIndex: shortStartIndex + `SHORT_ID: ${updatedShort.id}`.length },
        textStyle: {
          fontSize: { magnitude: 1, unit: 'PT' },
          foregroundColor: { color: { rgbColor: { red: 1, green: 1, blue: 1 } } },
        },
        fields: 'fontSize,foregroundColor',
      },
    });

    // For Title (HEADING_2)
    requests.push({
      updateParagraphStyle: {
        range: { startIndex: shortStartIndex + `SHORT_ID: ${updatedShort.id}`.length + 1, endIndex: shortStartIndex + `SHORT_ID: ${updatedShort.id}`.length + 1 + updatedShort.title.length },
        paragraphStyle: { namedStyleType: 'HEADING_2' },
        fields: 'namedStyleType',
      },
    });

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

export const deleteShortFromDocument = async (req, res) => {
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

    // 1. Get the full document content
    const doc = await docs.documents.get({ documentId });
    const documentContent = doc.data;

    let shortStartIndex = -1;
    let shortEndIndex = -1;

    // Find the start and end indices of the short's content
    for (let i = 0; i < documentContent.body.content.length; i++) {
      const element = documentContent.body.content[i];
      if (element.paragraph && element.paragraph.elements) {
        const paragraphText = element.paragraph.elements
          .map((el) => (el.textRun && el.textRun.content) || '')
          .join('');

        if (paragraphText.includes(`SHORT_ID: ${shortId}`)) {
          shortStartIndex = element.startIndex;
          // Assume the short content ends before the next SHORT_ID or end of document
          for (let j = i + 1; j < documentContent.body.content.length; j++) {
            const nextElement = documentContent.body.content[j];
            if (nextElement.paragraph && nextElement.paragraph.elements) {
              const nextParagraphText = nextElement.paragraph.elements
                .map((el) => (el.textRun && el.textRun.content) || '')
                .join('');
              if (nextParagraphText.includes('SHORT_ID:')) {
                shortEndIndex = nextElement.startIndex - 1; // End before the next short
                break;
              }
            }
          }
          if (shortEndIndex === -1) {
            shortEndIndex = documentContent.body.content[documentContent.body.content.length - 1].endIndex - 1; // End of document
          }
          break;
        }
      }
    }

    if (shortStartIndex === -1 || shortEndIndex === -1) {
      return res.status(404).send('Short content not found in document.');
    }

    const requests = [
      {
        deleteContent: {
          range: { startIndex: shortStartIndex, endIndex: shortEndIndex },
        },
      },
    ];

    await docs.documents.batchUpdate({
      documentId,
      requestBody: {
        requests,
      },
    });

    res.status(204).send(); // No Content

  } catch (error) {
    console.error('Error deleting short from document:', error.message);
    res.status(500).send('Failed to delete short from document.');
  }
};
