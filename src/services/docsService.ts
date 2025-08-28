import api from './api';

const docsService = {
  createDocument: async (title: string) => {
    const response = await api.post('/api/docs', { title });
    return response.data;
  },

  getDocumentContent: async (documentId: string) => {
    const response = await api.get(`/api/docs/${documentId}`);
    return response.data;
  },

  batchUpdateDocument: async (documentId: string, requests: any[]) => {
    const response = await api.post(`/api/docs/${documentId}/batchUpdate`, { requests });
    return response.data;
  },

  addShortToDocument: async (documentId: string, short: any) => {
    const response = await api.post(`/api/docs/${documentId}/addShort`, { short });
    return response.data;
  },

  getShortContentFromDoc: async (documentId: string, shortId: string) => {
    const response = await api.get(`/api/docs/${documentId}/shorts/${shortId}`);
    return response.data;
  },

  updateShortContentInDoc: async (documentId: string, shortId: string, short: any) => {
    const response = await api.put(`/api/docs/${documentId}/shorts/${shortId}`, { short });
    return response.data;
  },
};

export default docsService;
