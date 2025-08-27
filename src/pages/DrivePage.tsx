import React, { useState, useEffect } from 'react';
import driveService from '../services/driveService';
import { useAuth } from '../context/AuthContext';

function DrivePage() {
  const { isAuthenticated, login } = useAuth();
  const [files, setFiles] = useState<any[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState<string>('');
  const [message, setMessage] = useState<string>('');

  const requiredScope = 'drive'; // Corresponds to https://www.googleapis.com/auth/drive

  useEffect(() => {
    if (isAuthenticated) {
      // In a real app, you'd check if the specific scope is granted.
      // For simplicity, we assume if authenticated, the necessary scope is available.
      // If not, the API call will fail, and we'd handle it.
      fetchFiles();
    } else {
      // If not authenticated, prompt for login with specific scope
      setMessage('Please log in with Google Drive access.');
      login([requiredScope]);
    }
  }, [isAuthenticated, login]);

  const fetchFiles = async () => {
    try {
      setMessage('Fetching files...');
      const fetchedFiles = await driveService.listFiles();
      setFiles(fetchedFiles);
      setMessage('Files loaded.');
    } catch (error: any) {
      console.error('Error fetching files:', error);
      setMessage(`Failed to fetch files: ${error.response?.data || error.message}`);
      // If 403 (insufficient scope), prompt for re-auth with correct scope
      if (error.response && error.response.status === 403) {
        setMessage('Insufficient Drive scope. Please re-authenticate.');
        login([requiredScope]);
      }
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setSelectedFile(event.target.files[0]);
      setUploadTitle(event.target.files[0].name); // Default title to file name
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !uploadTitle) {
      setMessage('Please select a file and enter a title.');
      return;
    }
    try {
      setMessage('Uploading file...');
      const uploadedFile = await driveService.uploadFile(selectedFile, uploadTitle);
      setMessage(`File uploaded: ${uploadedFile.name} (ID: ${uploadedFile.id})`);
      fetchFiles(); // Refresh list
    } catch (error: any) {
      console.error('Error uploading file:', error);
      setMessage(`Failed to upload file: ${error.response?.data || error.message}`);
    }
  };

  const handleDownload = async (fileId: string, fileName: string) => {
    try {
      setMessage(`Downloading ${fileName}...`);
      const blob = await driveService.downloadFile(fileId);
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      setMessage(`${fileName} downloaded.`);
    } catch (error: any) {
      console.error('Error downloading file:', error);
      setMessage(`Failed to download ${fileName}: ${error.response?.data || error.message}`);
    }
  };

  const handleDelete = async (fileId: string, fileName: string) => {
    if (window.confirm(`Are you sure you want to delete ${fileName}?`)) {
      try {
        setMessage(`Deleting ${fileName}...`);
        await driveService.deleteFile(fileId);
        setMessage(`${fileName} deleted.`);
        fetchFiles(); // Refresh list
      } catch (error: any) {
        console.error('Error deleting file:', error);
        setMessage(`Failed to delete ${fileName}: ${error.response?.data || error.message}`);
      }
    }
  };

  return (
    <div>
      <h1>Google Drive Integration</h1>
      <p>{message}</p>

      {isAuthenticated && (
        <>
          <h2>Upload File</h2>
          <input type="file" onChange={handleFileChange} />
          <input
            type="text"
            placeholder="File Title"
            value={uploadTitle}
            onChange={(e) => setUploadTitle(e.target.value)}
          />
          <button onClick={handleUpload} disabled={!selectedFile || !uploadTitle}>Upload</button>

          <h2>Your Drive Files</h2>
          {files.length === 0 ? (
            <p>No files found or still loading...</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {files.map((file) => (
                  <tr key={file.id}>
                    <td>{file.name}</td>
                    <td>{file.mimeType}</td>
                    <td>
                      <button onClick={() => handleDownload(file.id, file.name)}>Download</button>
                      <button onClick={() => handleDelete(file.id, file.name)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </div>
  );
}

export default DrivePage;