import React, { useState, useRef, useEffect } from 'react';
import { Mic, X } from 'lucide-react';

const SimpleVoiceRecorder = ({ onSend, onCancel }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    startRecording();
    return () => {
      forceCleanup();
    };
  }, []);

  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isRecording]);

  const forceCleanup = () => {
    console.log('Force cleanup called');
    
    // Stop timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // Stop media recorder
    if (mediaRecorderRef.current) {
      try {
        if (mediaRecorderRef.current.state === 'recording') {
          mediaRecorderRef.current.stop();
        }
      } catch (e) {
        console.log('MediaRecorder stop error:', e);
      }
      mediaRecorderRef.current = null;
    }

    // Force stop all tracks
    if (streamRef.current) {
      try {
        streamRef.current.getTracks().forEach(track => {
          console.log('Stopping track:', track.kind, track.readyState);
          track.stop();
          console.log('Track stopped:', track.readyState);
        });
      } catch (e) {
        console.log('Track stop error:', e);
      }
      streamRef.current = null;
    }

    // Reset state
    setIsRecording(false);
    chunksRef.current = [];
  };

  const startRecording = async () => {
    try {
      console.log('Starting recording...');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } 
      });
      
      streamRef.current = stream;
      console.log('Stream obtained:', stream.getTracks().length, 'tracks');
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        console.log('MediaRecorder stopped, processing...');
        setIsRecording(false);
        
        // Force cleanup immediately
        forceCleanup();
        
        if (chunksRef.current.length > 0) {
          const blob = new Blob(chunksRef.current, { type: 'audio/webm;codecs=opus' });
          const reader = new FileReader();
          reader.onload = () => {
            console.log('Sending voice message...');
            onSend({
              audioDataURL: reader.result,
              duration: recordingTime,
              size: blob.size,
              mimeType: blob.type
            });
          };
          reader.readAsDataURL(blob);
        }
      };

      mediaRecorder.start(100);
      setIsRecording(true);
      setRecordingTime(0);
      console.log('Recording started');
    } catch (error) {
      console.error('Recording start error:', error);
      forceCleanup();
      onCancel();
    }
  };

  const stopRecording = () => {
    console.log('Stop recording requested');
    setIsRecording(false);
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      console.log('Stopping MediaRecorder...');
      mediaRecorderRef.current.stop();
    } else {
      // If recorder is not recording, force cleanup
      forceCleanup();
      onCancel();
    }
  };

  const handleCancel = () => {
    console.log('Recording cancelled');
    forceCleanup();
    onCancel();
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center space-x-3 bg-gray-100 rounded-lg p-3">
      <div className="flex items-center space-x-2">
        <div className={`w-3 h-3 rounded-full ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-gray-400'}`} />
        <span className="text-sm font-mono text-gray-700">
          {formatTime(recordingTime)}
        </span>
      </div>

      <div className="flex-1 flex items-center justify-center space-x-1 h-8">
        {Array.from({ length: 15 }).map((_, i) => (
          <div
            key={i}
            className={`w-1 bg-green-500 rounded-full transition-all duration-200 ${
              isRecording ? 'animate-pulse' : ''
            }`}
            style={{
              height: `${10 + Math.random() * 20}px`,
              opacity: isRecording ? 1 : 0.5,
              animationDelay: `${i * 50}ms`
            }}
          />
        ))}
      </div>

      <div className="text-xs text-gray-600">
        {isRecording ? 'Recording' : 'Ready'}
      </div>

      <div className="flex items-center space-x-2">
        <button
          onClick={handleCancel}
          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-full transition-colors"
          title="Cancel recording"
        >
          <X className="w-5 h-5" />
        </button>

        <button
          onClick={stopRecording}
          className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors"
          title="Stop and send"
        >
          <div className="w-3 h-3 bg-white rounded-sm" />
        </button>
      </div>
    </div>
  );
};

export default SimpleVoiceRecorder;