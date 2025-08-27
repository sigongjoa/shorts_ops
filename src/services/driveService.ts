import api from './api';

const driveService = {
  listFiles: async () => {
    const response = await api.get('/api/drive/files');
    return response.data;
  },

  uploadFile: async (file: File, title: string) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', title);
    const response = await api.post('/api/drive/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  downloadFile: async (fileId: string) => {
    const response = await api.get(`/api/drive/files/${fileId}/download`, {
      responseType: 'blob', // Important for file downloads
    });
    return response.data;
  },

  deleteFile: async (fileId: string) => {
    const response = await api.delete(`/api/drive/files/${fileId}`);
    return response.data;
  },
};

export default driveService;
