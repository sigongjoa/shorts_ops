import { google } from 'googleapis';
import oauth2Client from '../../config/googleClient.js';
import { getTokensForUser } from '../auth/auth.controller.js';
import multer from 'multer';
import stream from 'stream';

// Configure Multer for file uploads
const upload = multer({ storage: multer.memoryStorage() });

// Simple in-memory rate limiter for demonstration
const rateLimitStore = {}; // { userId: { lastRequestTime: timestamp, requestCount: number } }
const MAX_REQUESTS_PER_MINUTE = 5; // Example limit
const WINDOW_SIZE_MS = 60 * 1000; // 1 minute

const checkRateLimit = (userId) => {
  const now = Date.now();
  if (!rateLimitStore[userId]) {
    rateLimitStore[userId] = { lastRequestTime: now, requestCount: 0 };
  }

  const userStats = rateLimitStore[userId];

  if (now - userStats.lastRequestTime > WINDOW_SIZE_MS) {
    // Reset window
    userStats.lastRequestTime = now;
    userStats.requestCount = 0;
  }

  if (userStats.requestCount >= MAX_REQUESTS_PER_MINUTE) {
    return false; // Rate limited
  }

  userStats.requestCount++;
  return true; // Request allowed
};

// Helper to get a configured YouTube API client for a user
const getYouTubeClient = (userId) => {
  const tokens = getTokensForUser(userId);
  if (!tokens) {
    throw new Error('User not authenticated.');
  }
  oauth2Client.setCredentials(tokens);
  return google.youtube({ version: 'v3', auth: oauth2Client });
};

// Helper to get a configured YouTube Analytics API client for a user
const getYouTubeAnalyticsClient = (userId) => {
  const tokens = getTokensForUser(userId);
  if (!tokens) {
    throw new Error('User not authenticated.');
  }
  oauth2Client.setCredentials(tokens);
  return google.youtubeAnalytics({ version: 'v2', auth: oauth2Client });
};

export const uploadVideo = [upload.single('video'), async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).send('Unauthorized: User ID not found.');
    }

    if (!checkRateLimit(userId)) {
      return res.status(429).send('Too Many Requests: Rate limit exceeded.');
    }

    const youtube = getYouTubeClient(userId);
    const { title, description, tags, privacyStatus } = req.body;

    if (!req.file) {
      return res.status(400).send('Video file is required.');
    }
    if (!title || !description || !privacyStatus) {
      return res.status(400).send('Title, description, and privacyStatus are required.');
    }

    const videoMetadata = {
      snippet: {
        title,
        description,
        tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
        categoryId: '22', // Example: People & Blogs
      },
      status: {
        privacyStatus,
      },
    };

    const bufferStream = new stream.PassThrough();
    bufferStream.end(req.file.buffer);

    const response = await youtube.videos.insert({
      part: 'snippet,status',
      requestBody: videoMetadata,
      media: {
        mimeType: req.file.mimetype,
        body: bufferStream,
      },
    });

    res.status(200).json(response.data);
  } catch (error) {
    console.error('Error uploading video:', error.message);
    res.status(500).send('Failed to upload video.');
  }
}];

export const listVideos = async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).send('Unauthorized: User ID not found.');
    }

    if (!checkRateLimit(userId)) {
      return res.status(429).send('Too Many Requests: Rate limit exceeded.');
    }

    const youtube = getYouTubeClient(userId);
    const { part = 'snippet', maxResults = 10, pageToken } = req.query;

    const params = {
      part: part,
      maxResults: maxResults,
      type: 'video',
      pageToken: pageToken,
    };

    if (req.query.mine === 'true') {
      params.forMine = true;
    }
    if (req.query.myRating) {
      params.videoRating = req.query.myRating;
    }
    if (req.query.chart) {
      params.chart = req.query.chart;
    }

    const response = await youtube.search.list(params);

    res.status(200).json(response.data);
  } catch (error) {
    console.error('Error listing videos:', JSON.stringify(error, null, 2));
    if (error.response && error.response.data) {
      console.error('Google API response:', JSON.stringify(error.response.data, null, 2));
    }
    res.status(500).send('Failed to list videos.');
  }
};

export const updateVideo = async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).send('Unauthorized: User ID not found.');
    }

    if (!checkRateLimit(userId)) {
      return res.status(429).send('Too Many Requests: Rate limit exceeded.');
    }

    const youtube = getYouTubeClient(userId);
    const { videoId } = req.params;
    const { title, description, tags, privacyStatus } = req.body;

    if (!videoId) {
      return res.status(400).send('Video ID is required.');
    }

    const videoMetadata = {
      id: videoId,
      snippet: {
        title,
        description,
        tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
        categoryId: '22', // Example: People & Blogs
      },
      status: {
        privacyStatus,
      },
    };

    const response = await youtube.videos.update({
      part: 'snippet,status',
      requestBody: videoMetadata,
    });

    res.status(200).json(response.data);
  } catch (error) {
    console.error('Error updating video:', error.message);
    res.status(500).send('Failed to update video.');
  }
};

export const deleteVideo = async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).send('Unauthorized: User ID not found.');
    }

    if (!checkRateLimit(userId)) {
      return res.status(429).send('Too Many Requests: Rate limit exceeded.');
    }

    const youtube = getYouTubeClient(userId);
    const { videoId } = req.params;

    if (!videoId) {
      return res.status(400).send('Video ID is required.');
    }

    await youtube.videos.delete({
      id: videoId,
    });

    res.status(204).send(); // No Content
  } catch (error) {
    console.error('Error deleting video:', error.message);
    res.status(500).send('Failed to delete video.');
  }
};

export const analyzeVideo = async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).send('Unauthorized: User ID not found.');
    }

    const youtube = getYouTubeClient(userId);
    const { videoId } = req.params;

    if (!videoId) {
      return res.status(400).send('Video ID is required.');
    }

    const response = await youtube.videos.list({
      part: 'snippet,statistics,contentDetails,status', // Parts for analysis
      id: videoId,
    });

    if (response.data.items.length === 0) {
      return res.status(404).send('Video not found.');
    }

    res.status(200).json(response.data.items[0]);
  } catch (error) {
    console.error('Error analyzing video:', error.message);
    res.status(500).send('Failed to analyze video.');
  }
};

export const getVideoAnalyticsMetrics = async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).send('Unauthorized: User ID not found.');
    }

    const youtubeAnalytics = getYouTubeAnalyticsClient(userId);
    const youtubeData = getYouTubeClient(userId); // For fetching channel ID

    const { videoId } = req.params;
    const { startDate, endDate } = req.query;

    if (!videoId || !startDate || !endDate) {
      return res.status(400).send('Video ID, start date, and end date are required.');
    }

    // Get channel ID for the authenticated user
    let channelId;
    try {
      const channelResponse = await youtubeData.channels.list({
        part: 'id',
        mine: true,
      });
      if (channelResponse.data.items.length > 0) {
        channelId = channelResponse.data.items[0].id;
      } else {
        return res.status(404).send('Channel ID not found for the authenticated user.');
      }
    } catch (channelError) {
      console.error('Error fetching channel ID:', channelError.message);
      return res.status(500).send('Failed to fetch channel ID.');
    }

    const metrics = 'averageViewDuration,audienceWatchRatio'; // Metrics to retrieve
    const dimensions = 'video'; // Dimension to filter by video

    const response = await youtubeAnalytics.reports.query({
      ids: `channel==${channelId}`,
      startDate: startDate,
      endDate: endDate,
      metrics: metrics,
      dimensions: dimensions,
      filters: `video==${videoId}`,
    });

    res.status(200).json(response.data);
  } catch (error) {
    console.error('Error fetching video analytics metrics:', error.message);
    res.status(500).send('Failed to fetch video analytics metrics.');
  }
};

export const listComments = async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).send('Unauthorized: User ID not found.');
    }

    const youtube = getYouTubeClient(userId);
    const { videoId, maxResults = 20 } = req.query;

    if (!videoId) {
      return res.status(400).send('Video ID is required.');
    }

    const response = await youtube.commentThreads.list({
      part: 'snippet,replies',
      videoId: videoId,
      maxResults: maxResults,
    });

    res.status(200).json(response.data.items);
  } catch (error) {
    console.error('Error listing comments:', error.message);
    res.status(500).send('Failed to list comments.');
  }
};

export const updateComment = async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).send('Unauthorized: User ID not found.');
    }

    const youtube = getYouTubeClient(userId);
    const { commentId } = req.params;
    const { textOriginal } = req.body;

    if (!commentId) {
      return res.status(400).send('Comment ID is required.');
    }
    if (!textOriginal) {
      return res.status(400).send('Comment text is required.');
    }

    const response = await youtube.comments.update({
      part: 'snippet',
      requestBody: {
        id: commentId,
        snippet: {
          textOriginal: textOriginal,
        },
      },
    });

    res.status(200).json(response.data);
  } catch (error) {
    console.error('Error updating comment:', error.message);
    res.status(500).send('Failed to update comment.');
  }
};
