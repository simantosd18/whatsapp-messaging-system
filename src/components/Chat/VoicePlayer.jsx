import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause } from 'lucide-react';

const VoicePlayer = ({ audioDataURL, initialDuration, isOwnMessage, className = '' }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  
  const audioRef = useRef(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !audioDataURL) return;

    const handleLoadedMetadata = () => {
      setAudioDuration(audio.duration);
      setIsLoading(false);
      setHasError(false);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      audio.currentTime = 0;
    };

    const handleCanPlay = () => {
      setIsLoading(false);
      setHasError(false);
    };

    const handleError = () => {
      setIsLoading(false);
      setHasError(true);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('error', handleError);

    audio.load();

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('error', handleError);
    };
  }, [audioDataURL]);

  const togglePlayPause = () => {
    const audio = audioRef.current;
    if (!audio || hasError) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play()
        .then(() => setIsPlaying(true))
        .catch(() => setHasError(true));
    }
  };

  const handleSeek = (e) => {
    const audio = audioRef.current;
    if (!audio || audioDuration === 0 || hasError) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const newTime = (clickX / rect.width) * audioDuration;
    
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const formatTime = (seconds) => {
    if (isNaN(seconds) || seconds === 0 || !isFinite(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = audioDuration > 0 ? (currentTime / audioDuration) * 100 : 0;
  const displayDuration = audioDuration || (typeof initialDuration === 'number' && isFinite(initialDuration) ? initialDuration : 0);

  if (!audioDataURL) {
    return (
      <div className={`flex items-center space-x-3 p-3 rounded-lg ${className}`}>
        <div className="flex-shrink-0 p-2 rounded-full bg-gray-300 animate-pulse">
          <div className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <div className="h-8 bg-gray-200 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className={`flex items-center space-x-3 p-3 rounded-lg ${className}`}>
        <div className={`flex-shrink-0 p-2 rounded-full ${
          isOwnMessage ? 'bg-red-400' : 'bg-red-500'
        }`}>
          <div className="w-5 h-5 text-white">⚠</div>
        </div>
        <div className="flex-1">
          <p className={`text-sm ${isOwnMessage ? 'text-green-100' : 'text-gray-600'}`}>
            Audio unavailable
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-center space-x-3 p-3 rounded-lg min-w-[200px] ${className}`}>
      <audio 
        ref={audioRef} 
        src={audioDataURL} 
        preload="metadata"
      />
      
      {/* Play/Pause Button */}
      <button
        onClick={togglePlayPause}
        disabled={isLoading || hasError}
        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
          isOwnMessage
            ? 'bg-white bg-opacity-20 hover:bg-opacity-30 text-white'
            : 'bg-green-500 hover:bg-green-600 text-white'
        } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        {isLoading ? (
          <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
        ) : isPlaying ? (
          <Pause className="w-4 h-4" />
        ) : (
          <Play className="w-4 h-4 ml-0.5" />
        )}
      </button>

      {/* Waveform and Progress */}
      <div className="flex-1 space-y-1">
        {/* Waveform Visualization */}
        <div 
          className="flex items-center space-x-0.5 h-6 cursor-pointer"
          onClick={handleSeek}
        >
          {Array.from({ length: 40 }).map((_, i) => {
            const barProgress = (i / 40) * 100;
            const isActive = barProgress <= progress;
            const height = 8 + (Math.sin(i * 0.5) * 8) + (Math.random() * 6);
            
            return (
              <div
                key={i}
                className={`w-0.5 rounded-full transition-all duration-150 ${
                  isActive
                    ? isOwnMessage
                      ? 'bg-white'
                      : 'bg-green-500'
                    : isOwnMessage
                      ? 'bg-white bg-opacity-30'
                      : 'bg-gray-300'
                }`}
                style={{
                  height: `${Math.max(4, height)}px`,
                }}
              />
            );
          })}
        </div>

        {/* Time Display */}
        <div className={`flex justify-between text-xs ${
          isOwnMessage ? 'text-green-100' : 'text-gray-500'
        }`}>
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(displayDuration)}</span>
        </div>
      </div>
    </div>
  );
};

export default VoicePlayer;