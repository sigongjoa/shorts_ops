import React, { useState, useEffect } from 'react';
import docsService from '../services/docsService';
import { useAuth } from '../context/AuthContext';

function DocsPage() {
  const { isAuthenticated, login } = useAuth();
  const [documentId, setDocumentId] = useState<string>('');
  const [documentTitle, setDocumentTitle] = useState<string>('Gemini Test Document');
  const [documentContent, setDocumentContent] = useState<any>(null);
  const [batchRequests, setBatchRequests] = useState<string>(''); // JSON string for requests
  const [message, setMessage] = useState<string>('');

  const requiredScope = 'documents'; // Corresponds to https://www.googleapis.com/auth/documents

  useEffect(() => {
    if (!isAuthenticated) {
      setMessage('Please log in with Google Docs access.');
      login([requiredScope]);
    }
  }, [isAuthenticated, login]);

  const handleCreateDocument = async () => {
    try {
      setMessage('Creating document...');
      const response = await docsService.createDocument(documentTitle);
      setDocumentId(response.documentId);
      setDocumentContent(response);
      setMessage(`Document created: ${response.title} (ID: ${response.documentId})`);
    } catch (error: any) {
      console.error('Error creating document:', error);
      setMessage(`Failed to create document: ${error.response?.data || error.message}`);
    }
  };

  const handleGetDocumentContent = async () => {
    if (!documentId) {
      setMessage('Please provide Document ID.');
      return;
    }
    try {
      setMessage('Getting document content...');
      const response = await docsService.getDocumentContent(documentId);
      setDocumentContent(response);
      setMessage('Document content fetched.');
    } catch (error: any) {
      console.error('Error getting document content:', error);
      setMessage(`Failed to get document content: ${error.response?.data || error.message}`);
    }
  };

  const handleBatchUpdate = async () => {
    if (!documentId || !batchRequests) {
      setMessage('Please provide Document ID and Batch Requests.');
      return;
    }
    try {
      const parsedRequests = JSON.parse(batchRequests);
      setMessage('Applying batch update...');
      const response = await docsService.batchUpdateDocument(documentId, parsedRequests);
      setDocumentContent(response); // Update content after batch update
      setMessage('Batch update applied.');
    } catch (error: any) {
      console.error('Error applying batch update:', error);
      setMessage(`Failed to apply batch update: ${error.response?.data || error.message}`);
    }
  };

  return (
    <div>
      <h1>Google Docs Integration</h1>
      <p>{message}</p>

      {isAuthenticated && (
        <>
          <h2>Create Document</h2>
          <div>
            <label>Document Title:</label>
            <input type="text" value={documentTitle} onChange={(e) => setDocumentTitle(e.target.value)} />
            <button onClick={handleCreateDocument}>Create New Document</button>
          </div>

          <h2>Manage Document</h2>
          <div>
            <label>Document ID:</label>
            <input type="text" value={documentId} onChange={(e) => setDocumentId(e.target.value)} placeholder="Enter Document ID" style={{ width: '300px' }} />
          </div>
          <div>
            <button onClick={handleGetDocumentContent}>Get Document Content</button>
          </div>

          <h3>Batch Update (JSON Requests)</h3>
          <textarea
            value={batchRequests}
            onChange={(e) => setBatchRequests(e.target.value)}
            placeholder={`e.g., [
  {
    "insertText": {
      "text": "Hello, World!",
      "location": {
        "index": 1
      }
    }
  }
]`}
            rows={10}
            style={{ width: '100%' }}
          ></textarea>
          <button onClick={handleBatchUpdate}>Apply Batch Update</button>

          {documentContent && (
            <div>
              <h2>Document Details</h2>
              <pre>{JSON.stringify(documentContent, null, 2)}</pre>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default DocsPage;