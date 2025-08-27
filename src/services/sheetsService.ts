import api from './api';

const sheetsService = {
  createSpreadsheet: async (title: string) => {
    const response = await api.post('/api/sheets', { title });
    return response.data;
  },

  getSpreadsheetValues: async (spreadsheetId: string, range: string) => {
    const encodedRange = encodeURIComponent(range);
    const response = await api.get(`/api/sheets/${spreadsheetId}/values/${encodedRange}`);
    return response.data;
  },

  appendSpreadsheetValues: async (spreadsheetId: string, range: string, values: any[][], valueInputOption: string = 'USER_ENTERED') => {
    const encodedRange = encodeURIComponent(range);
    const response = await api.post(`/api/sheets/${spreadsheetId}/values/${encodedRange}/append?valueInputOption=${valueInputOption}`, { values });
    return response.data;
  },

  updateSpreadsheetValues: async (spreadsheetId: string, range: string, values: any[][]) => {
    const encodedRange = encodeURIComponent(range);
    const response = await api.put(`/api/sheets/${spreadsheetId}/values/${encodedRange}`, { values });
    return response.data;
  },

  clearSpreadsheetValues: async (spreadsheetId: string, range: string) => {
    const encodedRange = encodeURIComponent(range);
    const response = await api.post(`/api/sheets/${spreadsheetId}/values/${encodedRange}/clear`);
    return response.data;
  },
};

export default sheetsService;
