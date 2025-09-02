import React, { useState, useEffect } from 'react';
import youtubeService from '../../services/youtubeService';
import { Button } from './common/Button';
import { Input } from './common/Input';
import { TextArea } from './common/TextArea';

interface YouTubeVideo {
  id: string;
  snippet: {
    title: string;
    description: string;
    thumbnails: {
      default: { url: string };
    };
  };
}

interface ScheduledVideo extends YouTubeVideo {
  scheduledPublishTime: Date;
  scheduledComments: string[];
}

export const YouTubeScheduler: React.FC = () => {
  const [privateVideos, setPrivateVideos] = useState<YouTubeVideo[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<YouTubeVideo | null>(null);
  const [publishTime, setPublishTime] = useState<string>('');
  const [comments, setComments] = useState<string[]>(['', '', '']);
  const [loading, setLoading] = useState<boolean>(false); // Changed to false, as videos are not fetched on mount
  const [error, setError] = useState<string | null>(null);
  const [scheduling, setScheduling] = useState<boolean>(false);
  const [scheduledVideos, setScheduledVideos] = useState<ScheduledVideo[]>([]);

  const handleFetchPrivateVideos = async () => {
    try {
      setLoading(true);
      setError(null); // Clear previous errors
      const videos = await youtubeService.fetchPrivateVideos();
      setPrivateVideos(videos);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSchedule = async () => {
    if (!selectedVideo || !publishTime) {
      alert('Please select a video and specify a publish time.');
      return;
    }

    setScheduling(true);
    try {
      const commentArray = comments.filter(c => c.trim() !== '');
      await youtubeService.schedulePublish(selectedVideo.id, new Date(publishTime), commentArray);
      alert('Video scheduled successfully!');

      // Add to scheduled videos list
      setScheduledVideos(prev => [...prev, {
        ...selectedVideo,
        scheduledPublishTime: new Date(publishTime),
        scheduledComments: commentArray,
      }]);

      // Clear form
      setSelectedVideo(null);
      setPublishTime('');
      setComments(['', '', '']);
      setPrivateVideos([]); // Clear the list of private videos after scheduling
    } catch (err: any) {
      setError(err.message);
      alert(`Failed to schedule video: ${err.message}`);
    } finally {
      setScheduling(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white shadow-md rounded-lg">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">YouTube Video Scheduler</h2>

      <div className="mb-6">
        <Button onClick={handleFetchPrivateVideos} disabled={loading}>
          {loading ? 'Loading Videos...' : 'Find Private Videos'}
        </Button>
        {error && <p className="text-red-500 mt-2">Error: {error}</p>}

        {privateVideos.length > 0 && (
          <div className="mt-4">
            <h3 className="text-xl font-semibold text-gray-700 mb-4">Select a Private Video</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto pr-2">
              {privateVideos.map((video) => (
                <div
                  key={video.id}
                  className={`flex items-center p-3 border rounded-lg cursor-pointer transition-all duration-200
                    ${selectedVideo?.id === video.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'}`}
                  onClick={() => setSelectedVideo(video)}
                >
                  <img src={video.snippet.thumbnails.default.url} alt={video.snippet.title} className="w-20 h-auto rounded-md mr-4" />
                  <div>
                    <p className="font-medium text-gray-800">{video.snippet.title}</p>
                    <p className="text-sm text-gray-500 line-clamp-2">{video.snippet.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {privateVideos.length === 0 && !loading && !error && (
          <p className="text-gray-600 mt-4">Click 'Find Private Videos' to load your private YouTube videos.</p>
        )}
      </div>

      {selectedVideo && (
        <div className="border-t pt-6 mt-6">
          <h3 className="text-xl font-semibold text-gray-700 mb-4">Schedule Details for: {selectedVideo.snippet.title}</h3>
          <div className="space-y-4">
            <Input
              label="Publish Date and Time"
              type="datetime-local"
              value={publishTime}
              onChange={(e) => setPublishTime(e.target.value)}
            />
            <h4 className="text-lg font-medium text-gray-700 mt-4">Comments</h4>
            {[0, 1, 2].map((index) => (
              <Input
                key={index}
                label={`Comment ${index + 1}`}
                value={comments[index]}
                onChange={(e) => {
                  const newComments = [...comments];
                  newComments[index] = e.target.value;
                  setComments(newComments);
                }}
              />
            ))}
            <Button onClick={handleSchedule} disabled={scheduling}>
              {scheduling ? 'Scheduling...' : 'Schedule Video'}
            </Button>
          </div>
        </div>
      )}

      {scheduledVideos.length > 0 && (
        <div className="border-t pt-6 mt-6">
          <h3 className="text-xl font-bold text-gray-800 mb-6">Scheduled Videos</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {scheduledVideos.map((video) => (
              <div key={video.id} className="p-3 border rounded-lg shadow-sm bg-gray-50">
                <p className="font-medium text-gray-800">{video.snippet.title}</p>
                <p className="text-sm text-gray-600">Scheduled: {video.scheduledPublishTime.toLocaleString()}</p>
                {video.scheduledComments.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs text-gray-500">Comments:</p>
                    <ul className="list-disc list-inside text-xs text-gray-500">
                      {video.scheduledComments.map((comment, idx) => (
                        <li key={idx}>{comment}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};