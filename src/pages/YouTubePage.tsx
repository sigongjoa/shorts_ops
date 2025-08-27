import React, { useState, useEffect } from 'react';
import youtubeService from '../services/youtubeService';
import { useAuth } from '../context/AuthContext';

function YouTubePage() {
  const { isAuthenticated, login, user } = useAuth();
  const [videos, setVideos] = useState<any[]>([]);
  const [selectedVideoFile, setSelectedVideoFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState<string>('');
  const [uploadDescription, setUploadDescription] = useState<string>('');
  const [privacyStatus, setPrivacyStatus] = useState<string>('private');
  const [message, setMessage] = useState<string>('');
  const [videoIdToUpdate, setVideoIdToUpdate] = useState<string>('');
  const [updateTitle, setUpdateTitle] = useState<string>('');
  const [updateDescription, setUpdateDescription] = useState<string>('');
  const [updatePrivacyStatus, setUpdatePrivacyStatus] = useState<string>('private');

  // State for video analysis modal
  const [selectedVideoForAnalysis, setSelectedVideoForAnalysis] = useState<any | null>(null);
  const [isAnalysisModalOpen, setIsAnalysisModalOpen] = useState<boolean>(false);
  const [videoAnalyticsData, setVideoAnalyticsData] = useState<any | null>(null);

  // State for comments
  const [comments, setComments] = useState<any[]>([]);
  const [selectedVideoIdForComments, setSelectedVideoIdForComments] = useState<string | null>(null);
  const [editingComment, setEditingComment] = useState<any | null>(null);

  // State for comment edit modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [modalCommentText, setModalCommentText] = useState('');
  const [modalCommentId, setModalCommentId] = useState<string | null>(null);

  // State for pagination
  const [currentPageToken, setCurrentPageToken] = useState<string | undefined>(undefined);
  const [nextPageToken, setNextPageToken] = useState<string | undefined>(undefined);
  const [prevPageToken, setPrevPageToken] = useState<string | undefined>(undefined);
  const [currentMaxResults, setCurrentMaxResults] = useState<number>(10); // For user input
  const [currentPageNumber, setCurrentPageNumber] = useState<number>(1); // For displaying current page

  const requiredScope = 'https://www.googleapis.com/auth/youtube.force-ssl';

  useEffect(() => {
    if (isAuthenticated) {
      fetchVideos(undefined, currentMaxResults); // Initial fetch, reset pageToken
    } else {
      setMessage('Please log in with YouTube access.');
      login(['youtube']);
    }
  }, [isAuthenticated, login, currentMaxResults]); // Removed currentPageToken from dependencies

  const fetchVideos = async (pageToken?: string, maxResults: number = 10, direction?: 'next' | 'prev') => {
    try {
      setMessage('Fetching videos...');
      const response = await youtubeService.listVideos(true, 'snippet', maxResults, pageToken);
      setVideos(response.items);
      setNextPageToken(response.nextPageToken);
      setPrevPageToken(response.prevPageToken);
      setMessage('Videos loaded.');

      // Update page number
      if (direction === 'next') {
        setCurrentPageNumber(prev => prev + 1);
      } else if (direction === 'prev') {
        setCurrentPageNumber(prev => prev - 1);
      } else {
        setCurrentPageNumber(1); // Reset to 1 for initial load or maxResults change
      }

    } catch (error: any) {
      console.error('Error fetching videos:', error);
      setMessage(`Failed to fetch videos: ${error.response?.data || error.message}`);
      if (error.response && error.response.status === 403) {
        setMessage('Insufficient YouTube scope. Please re-authenticate.');
        login(['youtube']);
      }
    }
  };

  const handleVideoFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setSelectedVideoFile(event.target.files[0]);
      setUploadTitle(event.target.files[0].name.split('.')[0]);
    }
  };

  const handleUploadVideo = async () => {
    if (!selectedVideoFile || !uploadTitle || !uploadDescription || !privacyStatus) {
      setMessage('Please fill all upload fields.');
      return;
    }
    try {
      setMessage('Uploading video...');
      const uploadedVideo = await youtubeService.uploadVideo(
        selectedVideoFile,
        uploadTitle,
        uploadDescription,
        privacyStatus
      );
      setMessage(`Video uploaded: ${uploadedVideo.snippet.title} (ID: ${uploadedVideo.id})`);
      fetchVideos();
    } catch (error: any) {
      console.error('Error uploading video:', error);
      setMessage(`Failed to upload video: ${error.response?.data || error.message}`);
    }
  };

  const handleUpdateVideo = async () => {
    if (!videoIdToUpdate || !updateTitle || !updateDescription || !updatePrivacyStatus) {
      setMessage('Please fill all update fields.');
      return;
    }
    try {
      setMessage('Updating video...');
      const updatedVideo = await youtubeService.updateVideo(
        videoIdToUpdate,
        updateTitle,
        updateDescription,
        updatePrivacyStatus
      );
      setMessage(`Video updated: ${updatedVideo.snippet.title} (ID: ${updatedVideo.id})`);
      fetchVideos();
    } catch (error: any) {
      console.error('Error updating video:', error);
      setMessage(`Failed to update video: ${error.response?.data || error.message}`);
    }
  };

  const handleDeleteVideo = async (videoId: string, videoTitle: string) => {
    if (window.confirm(`Are you sure you want to delete ${videoTitle}?`)) {
      try {
        setMessage(`Deleting ${videoTitle}...`);
        await youtubeService.deleteVideo(videoId);
        setMessage(`${videoTitle} deleted.`);
        fetchVideos();
      } catch (error: any) {
        console.error('Error deleting video:', error);
        setMessage(`Failed to delete ${videoTitle}: ${error.response?.data || error.message}`);
      }
    }
  };

  const handleAnalyzeVideo = async (videoId: string) => {
    try {
      setMessage('Fetching video analysis...');
      const analysisData = await youtubeService.getVideoAnalysis(videoId);
      const today = new Date();
      const endDate = today.toISOString().split('T')[0];
      const thirtyDaysAgo = new Date(new Date().setDate(today.getDate() - 30));
      const startDate = thirtyDaysAgo.toISOString().split('T')[0];
      const analyticsMetrics = await youtubeService.getVideoAnalyticsMetrics(videoId, startDate, endDate);
      setSelectedVideoForAnalysis(analysisData);
      setVideoAnalyticsData(analyticsMetrics);
      setIsAnalysisModalOpen(true);
      setMessage('Video analysis loaded.');
    } catch (error: any) {
      console.error('Error fetching video analysis:', error);
      setMessage(`Failed to fetch video analysis: ${error.response?.data || error.message}`);
    }
  };

  const handleCloseAnalysisModal = () => {
    setIsAnalysisModalOpen(false);
    setSelectedVideoForAnalysis(null);
    setVideoAnalyticsData(null);
  };

  const handleShowComments = async (videoId: string) => {
    if (selectedVideoIdForComments === videoId) {
      setSelectedVideoIdForComments(null); // Hide if already showing
      setComments([]);
      return;
    }
    try {
      setMessage(`Fetching comments for ${videoId}...`);
      const fetchedComments = await youtubeService.getComments(videoId);
      setComments(fetchedComments);
      setSelectedVideoIdForComments(videoId);
      setMessage('Comments loaded.');
    } catch (error: any) {
      console.error('Error fetching comments:', error);
      setMessage(`Failed to fetch comments: ${error.response?.data || error.message}`);
    }
  };

  const handleEditComment = (comment: any) => {
    // Bug fix: comment is already the topLevelComment
    setModalCommentId(comment.id);
    setModalCommentText(comment.snippet.textOriginal);
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setModalCommentId(null);
    setModalCommentText('');
  };

  const handleSaveComment = async () => {
    if (!modalCommentId || !modalCommentText) return;
    try {
      setMessage('Updating comment...');
      await youtubeService.updateComment(modalCommentId, modalCommentText);
      handleCloseEditModal();
      setMessage('Comment updated successfully.');
      handleShowComments(selectedVideoIdForComments!); // Refresh comments
    } catch (error: any) {
      console.error('Error updating comment:', error);
      setMessage(`Failed to update comment: ${error.response?.data || error.message}`);
    }
  };

  return (
    <div>
      <h1>YouTube Integration</h1>
      <p>{message}</p>

      {isAuthenticated && (
        <>
          {/* ... existing upload and video list UI ... */}
          <h2>Your Videos</h2>
          {videos.length === 0 ? (
            <p>No videos found or still loading...</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Title</th>
                  <th>ID</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {videos.map((video) => (
                  <tr key={video.id.videoId || video.id}>
                    <td>{video.snippet.title}</td>
                    <td>{video.id.videoId || video.id}</td>
                    <td>{video.status?.privacyStatus || 'N/A'}</td>
                    <td>
                      <button onClick={() => {
                        setVideoIdToUpdate(video.id.videoId || video.id);
                        setUpdateTitle(video.snippet.title);
                        setUpdateDescription(video.snippet.description);
                        setUpdatePrivacyStatus(video.status?.privacyStatus || 'private');
                      }}>Edit</button>
                      <button onClick={() => handleDeleteVideo(video.id.videoId || video.id, video.snippet.title)}>Delete</button>
                      <button onClick={() => handleAnalyzeVideo(video.id.videoId || video.id)}>Analyze</button>
                      <button onClick={() => handleShowComments(video.id.videoId || video.id)}>
                        {selectedVideoIdForComments === (video.id.videoId || video.id) ? 'Hide Comments' : 'Show Comments'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* Pagination Controls */}
          <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <label>Max Results:</label>
            <input
              type="number"
              min="1"
              max="50"
              value={currentMaxResults}
              onChange={(e) => setCurrentMaxResults(Number(e.target.value))}
              style={{ width: '60px' }}
            />
            <button onClick={() => fetchVideos(prevPageToken, currentMaxResults, 'prev')} disabled={!prevPageToken}>
              Previous Page
            </button>
            <span>Page {currentPageNumber}</span>
            <button onClick={() => fetchVideos(nextPageToken, currentMaxResults, 'next')} disabled={!nextPageToken}>
              Next Page
            </button>
          </div>

          {/* ... existing update video form ... */}

          {/* Comments Section */}
          {selectedVideoIdForComments && (
            <div style={{ marginTop: '2rem' }}>
              <h2>Comments for Video ID: {selectedVideoIdForComments}</h2>
              {comments.length > 0 ? (
                comments.map((commentThread) => {
                  const comment = commentThread.snippet.topLevelComment;
                  const isOwnComment = user && user.channelId === comment.snippet.authorChannelId.value;

                  return (
                    <div key={comment.id} style={{ border: '1px solid #ccc', padding: '10px', margin: '10px 0', borderRadius: '8px' }}>
                      <p>
                        <strong>{comment.snippet.authorDisplayName}</strong>
                        <small style={{ marginLeft: '10px' }}>{new Date(comment.snippet.publishedAt).toLocaleString()}</small>
                      </p>
                      {/* Removed inline editing, now handled by modal */}
                      <p>{comment.snippet.textDisplay}</p>
                      {isOwnComment && (
                        <button onClick={() => handleEditComment(comment)}>Edit</button>
                      )}
                    </div>
                  );
                })
              ) : (
                <p>No comments found for this video.</p>
              )}
            </div>
          )}
        </>
      )}

      {/* Video Analysis Modal */}
      {isAnalysisModalOpen && selectedVideoForAnalysis && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '8px',
            width: '80%',
            maxWidth: '600px',
            maxHeight: '80%',
            overflowY: 'auto',
            color: 'black' // Ensure text is visible on white background
          }}>
            <h2>Video Analysis: {selectedVideoForAnalysis.snippet.title}</h2>
            <p><strong>Description:</strong> {selectedVideoForAnalysis.snippet.description}</p>
            <p><strong>Published At:</strong> {new Date(selectedVideoForAnalysis.snippet.publishedAt).toLocaleString()}</p>
            <p><strong>Views:</strong> {selectedVideoForAnalysis.statistics?.viewCount || 'N/A'}</p>
            <p><strong>Likes:</strong> {selectedVideoForAnalysis.statistics?.likeCount || 'N/A'}</p>
            <p><strong>Comments:</strong> {selectedVideoForAnalysis.statistics?.commentCount || 'N/A'}</p>
            <p><strong>Privacy Status:</strong> {selectedVideoForAnalysis.status?.privacyStatus || 'N/A'}</p>
            <p><strong>Tags:</strong> {selectedVideoForAnalysis.snippet.tags?.join(', ') || 'N/A'}</p>

            {videoAnalyticsData && videoAnalyticsData.rows && videoAnalyticsData.rows.length > 0 && (
              <>
                <h3>Analytics Metrics (Last 30 Days)</h3>
                <p><strong>Average View Duration:</strong> {videoAnalyticsData.rows[0][0]} seconds</p>
                <p><strong>Audience Watch Ratio:</strong> {(parseFloat(videoAnalyticsData.rows[0][1]) * 100).toFixed(2)}%</p>
              </>
            )}

            <button onClick={handleCloseAnalysisModal}>Close</button>
          </div>
        </div>
      )}

      {/* Edit Comment Modal */}
      {isEditModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '8px',
            width: '80%',
            maxWidth: '500px',
            maxHeight: '80%',
            overflowY: 'auto',
            color: 'black'
          }}>
            <h2>Edit Comment</h2>
            <textarea
              style={{ width: '100%', minHeight: '120px', marginBottom: '10px' }}
              value={modalCommentText}
              onChange={(e) => setModalCommentText(e.target.value)}
            ></textarea>
            <button onClick={handleSaveComment}>Save</button>
            <button onClick={handleCloseEditModal} style={{ marginLeft: '10px' }}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default YouTubePage;