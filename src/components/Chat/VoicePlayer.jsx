import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause } from 'lucide-react';

const VoicePlayer = ({ audioDataURL, initialDuration, isOwnMessage, className = '' }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(initialDuration || 0);
  const [isLoading, setIsLoading] = useState(true);
  
  const audioRef = useRef(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !audioDataURL) return;

    const handleLoadedMetadata = () => {
      console.log('Audio loaded, duration:', audio.duration);
      setAudioDuration(audio.duration || initialDuration || 0);
      setIsLoading(false);
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
      console.log('Audio can play');
    };

    const handleError = (e) => {
      console.error('Audio error:', e);
      setIsLoading(false);
    };

    const handleLoadStart = () => {
      setIsLoading(true);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('error', handleError);
    audio.addEventListener('loadstart', handleLoadStart);

    // Force load the audio
    audio.load();

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('loadstart', handleLoadStart);
      
      // Clean up object URL to prevent memory leaks
      if (audioDataURL && audioDataURL.startsWith('blob:')) {
        URL.revokeObjectURL(audioDataURL);
      }
    };
  }, [audioDataURL, initialDuration]);

  const togglePlayPause = async () => {
    const audio = audioRef.current;
    if (!audio || isLoading) return;

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
    } catch (error) {
      console.error('Audio play error:', error);
      setIsPlaying(false);
    }
  };

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleProgressClick = (e) => {
    const audio = audioRef.current;
    if (!audio || audioDuration === 0) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const newTime = (clickX / rect.width) * audioDuration;
    
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const progress = audioDuration > 0 ? (currentTime / audioDuration) * 100 : 0;

  return (
    <div className={`flex items-center space-x-3 p-3 rounded-lg min-w-[200px] ${className}`}>
      <audio 
        ref={audioRef} 
        src={audioDataURL} 
        preload="metadata"
        crossOrigin="anonymous"
      />
      
      <button
        onClick={togglePlayPause}
        disabled={isLoading}
        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
          isLoading 
            ? 'opacity-50 cursor-not-allowed'
            : isOwnMessage
              ? 'bg-white bg-opacity-20 hover:bg-opacity-30 text-white'
              : 'bg-green-500 hover:bg-green-600 text-white'
        }`}
      >
        {isLoading ? (
          <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
        ) : isPlaying ? (
          <Pause className="w-4 h-4" />
        ) : (
          <Play className="w-4 h-4 ml-0.5" />
        )}
      </button>

      <div className="flex-1 space-y-1">
        {/* Clickable waveform */}
        <div 
          className="flex items-center space-x-0.5 h-6 cursor-pointer"
          onClick={handleProgressClick}
          title="Click to seek"
        >
          {Array.from({ length: 40 }).map((_, i) => {
            const barProgress = (i / 40) * 100;
            const isActive = barProgress <= progress;
            const height = 8 + (Math.sin(i * 0.5) * 8) + (Math.random() * 6);
            
            return (
              <div
                key={i}
                className={`w-0.5 rounded-full transition-all duration-150 hover:opacity-80 ${
                  isActive
                    ? isOwnMessage ? 'bg-white' : 'bg-green-500'
                    : isOwnMessage ? 'bg-white bg-opacity-30' : 'bg-gray-300'
                }`}
                style={{ height: `${Math.max(4, height)}px` }}
              />
            );
          })}
        </div>

        <div className={`flex justify-between text-xs ${
          isOwnMessage ? 'text-green-100' : 'text-gray-500'
        }`}>
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(audioDuration)}</span>
        </div>
      </div>
    </div>
  );
};

export default VoicePlayer;