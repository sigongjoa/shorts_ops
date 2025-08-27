import api from './api';

const youtubeService = {
  listVideos: async (mine: boolean = true, part: string = 'snippet', maxResults: number = 10, pageToken?: string) => {
    const response = await api.get('/api/youtube/videos', {
      params: {
        mine: mine ? 'true' : 'false',
        part,
        maxResults,
        pageToken,
      },
    });
    return response.data;
  },

  uploadVideo: async (videoFile: File, title: string, description: string, privacyStatus: string) => {
    const formData = new FormData();
    formData.append('video', videoFile);
    formData.append('title', title);
    formData.append('description', description);
    formData.append('privacyStatus', privacyStatus);

    const response = await api.post('/api/youtube/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  updateVideo: async (videoId: string, title: string, description: string, privacyStatus: string) => {
    const response = await api.put(`/api/youtube/videos/${videoId}`, {
      title,
      description,
      privacyStatus,
    });
    return response.data;
  },

  deleteVideo: async (videoId: string) => {
    const response = await api.delete(`/api/youtube/videos/${videoId}`);
    return response.data;
  },

  // New function for video analysis
  getVideoAnalysis: async (videoId: string) => {
    const response = await api.get(`/api/youtube/videos/${videoId}/analyze`);
    return response.data;
  },

  // New function for video analytics metrics
  getVideoAnalyticsMetrics: async (videoId: string, startDate: string, endDate: string) => {
    const response = await api.get(`/api/youtube/videos/${videoId}/analytics`, {
      params: {
        startDate,
        endDate,
      },
    });
    return response.data;
  },

  getComments: async (videoId: string) => {
    const response = await api.get('/api/youtube/comments', {
      params: { videoId },
    });
    return response.data;
  },

  updateComment: async (commentId: string, textOriginal: string) => {
    const response = await api.put(`/api/youtube/comments/${commentId}`, {
      textOriginal,
    });
    return response.data;
  },
};

export default youtubeService;
