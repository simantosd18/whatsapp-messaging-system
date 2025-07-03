import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause } from 'lucide-react';

const VoicePlayer = ({ audioDataURL, initialDuration, isOwnMessage, className = '' }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(initialDuration || 0);
  
  const audioRef = useRef(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !audioDataURL) return;

    const handleLoadedMetadata = () => {
      setAudioDuration(audio.duration || initialDuration || 0);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      audio.currentTime = 0;
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [audioDataURL, initialDuration]);

  const togglePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().then(() => setIsPlaying(true));
    }
  };

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = audioDuration > 0 ? (currentTime / audioDuration) * 100 : 0;

  return (
    <div className={`flex items-center space-x-3 p-3 rounded-lg min-w-[200px] ${className}`}>
      <audio ref={audioRef} src={audioDataURL} preload="metadata" />
      
      <button
        onClick={togglePlayPause}
        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
          isOwnMessage
            ? 'bg-white bg-opacity-20 hover:bg-opacity-30 text-white'
            : 'bg-green-500 hover:bg-green-600 text-white'
        }`}
      >
        {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
      </button>

      <div className="flex-1 space-y-1">
        <div className="flex items-center space-x-0.5 h-6">
          {Array.from({ length: 40 }).map((_, i) => {
            const barProgress = (i / 40) * 100;
            const isActive = barProgress <= progress;
            const height = 8 + (Math.sin(i * 0.5) * 8) + (Math.random() * 6);
            
            return (
              <div
                key={i}
                className={`w-0.5 rounded-full transition-all duration-150 ${
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