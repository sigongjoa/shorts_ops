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

    // Step 1: Get the user's uploads playlist ID
    const channelResponse = await youtube.channels.list({
      part: 'contentDetails',
      mine: true,
    });

    if (!channelResponse.data.items || channelResponse.data.items.length === 0) {
      return res.status(200).json([]); // No channel found for user
    }

    const uploadsPlaylistId = channelResponse.data.items[0].contentDetails.relatedPlaylists.uploads;

    // Step 2: Get all videos from the uploads playlist
    let allVideos = [];
    let nextPageToken = null;
    do {
      const playlistItemsResponse = await youtube.playlistItems.list({
        part: 'snippet,status',
        playlistId: uploadsPlaylistId,
        maxResults: 50, // Max results per page
        pageToken: nextPageToken,
      });

      allVideos = allVideos.concat(playlistItemsResponse.data.items);
      nextPageToken = playlistItemsResponse.data.nextPageToken;
    } while (nextPageToken);

    // Step 3: Filter for private videos and map to expected format
    const privateVideos = allVideos.filter(
      (item) => item.status && item.status.privacyStatus === 'private'
    ).map(item => ({
      id: item.snippet.resourceId.videoId, // Use the actual video ID
      snippet: item.snippet,
      status: item.status,
    }));

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
