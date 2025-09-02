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

export const YouTubeScheduler: React.FC = () => {
  const [privateVideos, setPrivateVideos] = useState<YouTubeVideo[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<YouTubeVideo | null>(null);
  const [publishTime, setPublishTime] = useState<string>('');
  const [comments, setComments] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [scheduling, setScheduling] = useState<boolean>(false);

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        setLoading(true);
        const videos = await youtubeService.fetchPrivateVideos();
        setPrivateVideos(videos);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchVideos();
  }, []);

  const handleSchedule = async () => {
    if (!selectedVideo || !publishTime) {
      alert('Please select a video and specify a publish time.');
      return;
    }

    setScheduling(true);
    try {
      const commentArray = comments.split('\n').filter(c => c.trim() !== '');
      await youtubeService.schedulePublish(selectedVideo.id, new Date(publishTime), commentArray);
      alert('Video scheduled successfully!');
      setSelectedVideo(null);
      setPublishTime('');
      setComments('');
    } catch (err: any) {
      setError(err.message);
      alert(`Failed to schedule video: ${err.message}`);
    } finally {
      setScheduling(false);
    }
  };

  if (loading) return <div className="text-center py-8">Loading private videos...</div>;
  if (error) return <div className="text-center py-8 text-red-500">Error: {error}</div>;

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white shadow-md rounded-lg">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">YouTube Video Scheduler</h2>

      <div className="mb-6">
        <h3 className="text-xl font-semibold text-gray-700 mb-4">Select a Private Video</h3>
        {privateVideos.length === 0 ? (
          <p className="text-gray-600">No private videos found in your YouTube channel.</p>
        ) : (
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
            <TextArea
              label="Comments (one per line)"
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              rows={5}
            />
            <Button onClick={handleSchedule} disabled={scheduling}>
              {scheduling ? 'Scheduling...' : 'Schedule Video'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};