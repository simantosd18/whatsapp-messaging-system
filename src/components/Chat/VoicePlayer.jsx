import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Download, AlertCircle } from 'lucide-react';

const VoicePlayer = ({ audioDataURL, initialDuration, isOwnMessage, className = '' }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(initialDuration || 0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [loadAttempts, setLoadAttempts] = useState(0);
  
  const audioRef = useRef(null);
  const progressRef = useRef(null);
  const mountedRef = useRef(true);

  // Format time helper
  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds) || seconds < 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Reset audio state
  const resetAudioState = () => {
    setIsPlaying(false);
    setCurrentTime(0);
    setIsLoading(true);
    setError(false);
  };

  // Load audio with retry mechanism
  const loadAudio = () => {
    const audio = audioRef.current;
    if (!audio || !audioDataURL) return;

    resetAudioState();

    // Set up event listeners
    const handleLoadedMetadata = () => {
      if (!mountedRef.current) return;
      
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        setDuration(audio.duration);
      } else if (initialDuration) {
        setDuration(initialDuration);
      }
      setIsLoading(false);
      setError(false);
    };

    const handleTimeUpdate = () => {
      if (!mountedRef.current) return;
      setCurrentTime(audio.currentTime || 0);
    };

    const handleEnded = () => {
      if (!mountedRef.current) return;
      setIsPlaying(false);
      setCurrentTime(0);
      audio.currentTime = 0;
    };

    const handleCanPlay = () => {
      if (!mountedRef.current) return;
      setIsLoading(false);
      setError(false);
    };

    const handleError = (e) => {
      if (!mountedRef.current) return;
      
      console.error('Audio error:', e);
      setError(true);
      setIsLoading(false);
      setIsPlaying(false);

      // Retry loading up to 3 times
      if (loadAttempts < 3) {
        setTimeout(() => {
          if (mountedRef.current) {
            setLoadAttempts(prev => prev + 1);
            audio.load();
          }
        }, 1000);
      }
    };

    const handleLoadStart = () => {
      if (!mountedRef.current) return;
      setIsLoading(true);
    };

    // Add event listeners
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('error', handleError);
    audio.addEventListener('loadstart', handleLoadStart);

    // Start loading
    audio.load();

    // Cleanup function
    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('loadstart', handleLoadStart);
    };
  };

  // Setup audio when component mounts or audioDataURL changes
  useEffect(() => {
    mountedRef.current = true;
    setLoadAttempts(0);
    
    if (audioDataURL) {
      const cleanup = loadAudio();
      return cleanup;
    }

    return () => {
      mountedRef.current = false;
    };
  }, [audioDataURL]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      const audio = audioRef.current;
      if (audio) {
        audio.pause();
        audio.src = '';
      }
    };
  }, []);

  // Play/pause toggle
  const togglePlayPause = async () => {
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
          setCurrentTime(0);
        }
        
        await audio.play();
        setIsPlaying(true);
      }
    } catch (playError) {
      console.error('Audio play error:', playError);
      setError(true);
      setIsPlaying(false);
    }
  };

  // Progress bar click handler
  const handleProgressClick = (e) => {
    const audio = audioRef.current;
    if (!audio || duration === 0 || !progressRef.current || error) return;

    const rect = progressRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const newTime = Math.max(0, Math.min((clickX / rect.width) * duration, duration));
    
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  // Download handler
  const handleDownload = () => {
    if (audioDataURL) {
      try {
        const link = document.createElement('a');
        link.href = audioDataURL;
        link.download = `voice_message_${Date.now()}.webm`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (downloadError) {
        console.error('Download error:', downloadError);
      }
    }
  };

  const progress = duration > 0 ? Math.min((currentTime / duration) * 100, 100) : 0;

  // Error state
  if (error) {
    return (
      <div className={`flex items-center space-x-3 p-3 rounded-lg ${className}`}>
        <div className="flex-shrink-0 text-red-500">
          <AlertCircle className="w-6 h-6" />
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-sm ${isOwnMessage ? 'text-red-200' : 'text-red-600'}`}>
            Unable to play audio
          </p>
          <p className={`text-xs ${isOwnMessage ? 'text-red-300' : 'text-red-500'}`}>
            Duration: {formatTime(duration)}
          </p>
        </div>
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
  }

  return (
    <div className={`flex items-center space-x-3 p-3 rounded-lg min-w-[280px] ${className}`}>
      <audio 
        ref={audioRef} 
        src={audioDataURL} 
        preload="metadata"
        crossOrigin="anonymous"
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
        title={isPlaying ? 'Pause' : 'Play'}
      >
        {isLoading ? (
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : isPlaying ? (
          <Pause className="w-5 h-5" />
        ) : (
          <Play className="w-5 h-5 ml-0.5" />
        )}
      </button>

      {/* Progress and Controls */}
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