import { getGoogleClient } from '../../utils/googleClientUtils.js';
import { getTokensForUser } from '../auth/auth.controller.js';

// In-memory store for scheduled tasks (for demonstration purposes)
export const scheduledTasks = [];

// Helper to publish a video
export const publishVideo = async (userId, videoId) => {
  try {
    const tokens = getTokensForUser(userId);
    if (!tokens) {
      throw new Error('User not authenticated for YouTube API.');
    }
    const youtube = getGoogleClient(tokens, 'youtube', 'v3');

    await youtube.videos.update({
      part: 'status',
      requestBody: {
        id: videoId,
        status: { privacyStatus: 'public' },
      },
    });
    console.log(`Video ${videoId} published successfully.`);
  } catch (error) {
    console.error(`Error publishing video ${videoId}:`, error.message);
    throw error;
  }
};

// Helper to post a comment
export const postComment = async (userId, videoId, commentText) => {
  try {
    const tokens = getTokensForUser(userId);
    if (!tokens) {
      throw new Error('User not authenticated for YouTube API.');
    }
    const youtube = getGoogleClient(tokens, 'youtube', 'v3');

    await youtube.commentThreads.insert({
      part: 'snippet',
      requestBody: {
        snippet: {
          videoId: videoId,
          topLevelComment: {
            snippet: { textOriginal: commentText },
          },
        },
      },
    });
    console.log(`Comment posted to video ${videoId}: ${commentText}`);
  } catch (error) {
    console.error(`Error posting comment to video ${videoId}:`, error.message);
    throw error;
  }
};

export const listPrivateVideos = async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).send('Unauthorized: User ID not found.');
    }

    const tokens = getTokensForUser(userId);
    if (!tokens) {
      throw new Error('User not authenticated for YouTube API.');
    }

    const youtube = getGoogleClient(tokens, 'youtube', 'v3');

    // Step 1: Use search.list to get video IDs owned by the user
    const searchResponse = await youtube.search.list({
      part: 'id',
      forMine: true,
      type: 'video',
      maxResults: 50, // Adjust as needed
    });

    const videoIds = searchResponse.data.items.map(item => item.id.videoId);

    if (videoIds.length === 0) {
      return res.status(200).json([]); // No videos found
    }

    // Step 2: Use videos.list to get the status of these videos
    const videosResponse = await youtube.videos.list({
      part: 'snippet,status',
      id: videoIds.join(','),
    });

    // Step 3: Filter for private videos
    const privateVideos = videosResponse.data.items.filter(
      (video) => video.status.privacyStatus === 'private'
    );

    res.status(200).json(privateVideos);
  } catch (error) {
    console.error('Error listing private YouTube videos:', error.message);
    res.status(500).send('Failed to list private YouTube videos.');
  }
};

export const schedulePublish = async (req, res) => {
  try {
    const { videoId, publishTime, comments } = req.body;
    const userId = req.userId;

    if (!userId || !videoId || !publishTime) {
      return res.status(400).send('Missing required fields: userId, videoId, publishTime.');
    }

    const scheduledDate = new Date(publishTime);
    if (isNaN(scheduledDate.getTime())) {
      return res.status(400).send('Invalid publishTime format.');
    }

    scheduledTasks.push({
      userId,
      videoId,
      publishTime: scheduledDate,
      comments,
      status: 'pending',
    });

    console.log(`Scheduling video ${videoId} for publish at ${publishTime} with comments:`, comments);

    res.status(200).json({ message: 'Video scheduling request received.' });
  } catch (error) {
    console.error('Error scheduling video publish:', error.message);
    res.status(500).send('Failed to schedule video publish.');
  }
};
