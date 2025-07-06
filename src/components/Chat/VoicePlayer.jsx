import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Play, Pause, Download } from 'lucide-react';

const VoicePlayer = ({ audioDataURL, initialDuration, isOwnMessage, className = '' }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(initialDuration || 0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  
  const audioRef = useRef(null);
  const progressRef = useRef(null);

  // Format time helper
  const formatTime = useCallback((seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Audio event handlers
  const handleLoadedMetadata = useCallback(() => {
    const audio = audioRef.current;
    if (audio && audio.duration && !isNaN(audio.duration)) {
      setDuration(audio.duration);
    }
    setIsLoading(false);
  }, []);

  const handleTimeUpdate = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      setCurrentTime(audio.currentTime);
    }
  }, []);

  const handleEnded = useCallback(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    const audio = audioRef.current;
    if (audio) {
      audio.currentTime = 0;
    }
  }, []);

  const handleCanPlay = useCallback(() => {
    setIsLoading(false);
    setError(false);
  }, []);

  const handleError = useCallback((e) => {
    console.error('Audio playback error:', e);
    setError(true);
    setIsLoading(false);
    setIsPlaying(false);
  }, []);

  // Setup audio element
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !audioDataURL) return;

    setIsLoading(true);
    setError(false);

    // Add event listeners
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('error', handleError);

    // Load the audio
    audio.load();

    return () => {
      // Cleanup event listeners
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('error', handleError);
    };
  }, [audioDataURL, handleLoadedMetadata, handleTimeUpdate, handleEnded, handleCanPlay, handleError]);

  // Play/pause toggle
  const togglePlayPause = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio || isLoading || error) return;

    try {
      if (isPlaying) {
        audio.pause();
        setIsPlaying(false);
      } else {
        // Reset to beginning if at end
        if (audio.currentTime >= audio.duration) {
          audio.currentTime = 0;
        }
        
        await audio.play();
        setIsPlaying(true);
      }
    } catch (playError) {
      console.error('Audio play error:', playError);
      setError(true);
      setIsPlaying(false);
    }
  }, [isPlaying, isLoading, error]);

  // Progress bar click handler
  const handleProgressClick = useCallback((e) => {
    const audio = audioRef.current;
    if (!audio || duration === 0 || !progressRef.current) return;

    const rect = progressRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const newTime = (clickX / rect.width) * duration;
    
    audio.currentTime = Math.max(0, Math.min(newTime, duration));
    setCurrentTime(audio.currentTime);
  }, [duration]);

  // Download handler
  const handleDownload = useCallback(() => {
    if (audioDataURL) {
      const link = document.createElement('a');
      link.href = audioDataURL;
      link.download = `voice_message_${Date.now()}.webm`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }, [audioDataURL]);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  if (error) {
    return (
      <div className={`flex items-center space-x-3 p-3 rounded-lg ${className}`}>
        <div className="text-red-500">
          <Play className="w-6 h-6" />
        </div>
        <div className="flex-1">
          <p className="text-sm text-red-600">Unable to play audio</p>
        </div>
        <button
          onClick={handleDownload}
          className="p-1 text-gray-500 hover:text-gray-700"
          title="Download"
        >
          <Download className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className={`flex items-center space-x-3 p-3 rounded-lg min-w-[250px] ${className}`}>
      <audio 
        ref={audioRef} 
        src={audioDataURL} 
        preload="metadata"
      />
      
      {/* Play/Pause Button */}
      <button
        onClick={togglePlayPause}
        disabled={isLoading}
        className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all ${
          isLoading 
            ? 'opacity-50 cursor-not-allowed'
            : isOwnMessage
              ? 'bg-white bg-opacity-20 hover:bg-opacity-30 text-white'
              : 'bg-green-500 hover:bg-green-600 text-white'
        }`}
      >
        {isLoading ? (
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : isPlaying ? (
          <Pause className="w-5 h-5" />
        ) : (
          <Play className="w-5 h-5 ml-0.5" />
        )}
      </button>

      {/* Progress and Waveform */}
      <div className="flex-1 space-y-2">
        {/* Progress Bar */}
        <div 
          ref={progressRef}
          className="w-full h-2 bg-gray-300 rounded-full cursor-pointer overflow-hidden"
          onClick={handleProgressClick}
          title="Click to seek"
        >
          <div 
            className={`h-full rounded-full transition-all duration-150 ${
              isOwnMessage ? 'bg-white' : 'bg-green-500'
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Time Display */}
        <div className={`flex justify-between text-xs ${
          isOwnMessage ? 'text-green-100' : 'text-gray-500'
        }`}>
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Download Button */}
      <button
        onClick={handleDownload}
        className={`flex-shrink-0 p-2 rounded-full transition-colors ${
          isOwnMessage 
            ? 'bg-white bg-opacity-20 hover:bg-opacity-30 text-white' 
            : 'bg-gray-200 hover:bg-gray-300 text-gray-600'
        }`}
        title="Download voice message"
      >
        <Download className="w-4 h-4" />
      </button>
    </div>
  );
};

export default VoicePlayer;