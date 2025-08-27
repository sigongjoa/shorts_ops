import React, { useState, useEffect } from 'react';
import sheetsService from '../services/sheetsService';
import { useAuth } from '../context/AuthContext';

function SheetsPage() {
  const { isAuthenticated, login } = useAuth();
  const [spreadsheetId, setSpreadsheetId] = useState<string>('');
  const [range, setRange] = useState<string>('시트1!A1');
  const [values, setValues] = useState<string>(''); // JSON string for input
  const [output, setOutput] = useState<any>(null);
  const [message, setMessage] = useState<string>('');

  const requiredScope = 'spreadsheets'; // Corresponds to https://www.googleapis.com/auth/spreadsheets

  useEffect(() => {
    if (!isAuthenticated) {
      setMessage('Please log in with Google Sheets access.');
      login([requiredScope]);
    }
  }, [isAuthenticated, login]);

  const handleCreateSpreadsheet = async () => {
    try {
      setMessage('Creating spreadsheet...');
      const response = await sheetsService.createSpreadsheet('Gemini Test Spreadsheet');
      setSpreadsheetId(response.spreadsheetId);
      setOutput(response);
      setMessage(`Spreadsheet created: ${response.spreadsheetUrl}`);
    } catch (error: any) {
      console.error('Error creating spreadsheet:', error);
      setMessage(`Failed to create spreadsheet: ${error.response?.data || error.message}`);
    }
  };

  const handleGetValues = async () => {
    if (!spreadsheetId || !range) {
      setMessage('Please provide Spreadsheet ID and Range.');
      return;
    }
    try {
      setMessage('Getting values...');
      const response = await sheetsService.getSpreadsheetValues(spreadsheetId, range);
      setOutput(response);
      setMessage('Values fetched.');
    } catch (error: any) {
      console.error('Error getting values:', error);
      setMessage(`Failed to get values: ${error.response?.data || error.message}`);
    }
  };

  const handleAppendValues = async () => {
    if (!spreadsheetId || !range || !values) {
      setMessage('Please provide Spreadsheet ID, Range, and Values.');
      return;
    }
    try {
      const parsedValues = JSON.parse(values);
      setMessage('Appending values...');
      const response = await sheetsService.appendSpreadsheetValues(spreadsheetId, range, parsedValues);
      setOutput(response);
      setMessage('Values appended.');
    } catch (error: any) {
      console.error('Error appending values:', error);
      setMessage(`Failed to append values: ${error.response?.data || error.message}`);
    }
  };

  const handleUpdateValues = async () => {
    if (!spreadsheetId || !range || !values) {
      setMessage('Please provide Spreadsheet ID, Range, and Values.');
      return;
    }
    try {
      const parsedValues = JSON.parse(values);
      setMessage('Updating values...');
      const response = await sheetsService.updateSpreadsheetValues(spreadsheetId, range, parsedValues);
      setOutput(response);
      setMessage('Values updated.');
    } catch (error: any) {
      console.error('Error updating values:', error);
      setMessage(`Failed to update values: ${error.response?.data || error.message}`);
    }
  };

  const handleClearValues = async () => {
    if (!spreadsheetId || !range) {
      setMessage('Please provide Spreadsheet ID and Range.');
      return;
    }
    try {
      setMessage('Clearing values...');
      const response = await sheetsService.clearSpreadsheetValues(spreadsheetId, range);
      setOutput(response);
      setMessage('Values cleared.');
    } catch (error: any) {
      console.error('Error clearing values:', error);
      setMessage(`Failed to clear values: ${error.response?.data || error.message}`);
    }
  };

  return (
    <div>
      <h1>Google Sheets Integration</h1>
      <p>{message}</p>

      {isAuthenticated && (
        <>
          <h2>Create Spreadsheet</h2>
          <button onClick={handleCreateSpreadsheet}>Create New Spreadsheet</button>

          <h2>Manage Spreadsheet</h2>
          <div>
            <label>Spreadsheet ID:</label>
            <input type="text" value={spreadsheetId} onChange={(e) => setSpreadsheetId(e.target.value)} placeholder="Enter Spreadsheet ID" style={{ width: '300px' }} />
          </div>
          <div>
            <label>Range (e.g., 시트1!A1:B3):</label>
            <input type="text" value={range} onChange={(e) => setRange(e.target.value)} placeholder="Enter Range" />
          </div>
          <div>
            <label>Values (JSON Array of Arrays):</label>
            <textarea value={values} onChange={(e) => setValues(e.target.value)} placeholder={'e.g., [["Header1","Header2"]]'} rows={5} style={{ width: '100%' }}></textarea>
          </div>
          <div>
            <button onClick={handleGetValues}>Get Values</button>
            <button onClick={handleAppendValues}>Append Values</button>
            <button onClick={handleUpdateValues}>Update Values</button>
            <button onClick={handleClearValues}>Clear Values</button>
          </div>

          {output && (
            <div>
              <h2>Output</h2>
              <pre>{JSON.stringify(output, null, 2)}</pre>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default SheetsPage;