import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, Square, Send, X } from 'lucide-react';

const VoiceRecorder = ({ onSend, onCancel }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [error, setError] = useState(null);
  
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);

  // Cleanup function
  const cleanup = useCallback(() => {
    // Stop timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // Stop media recorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        console.warn('MediaRecorder stop error:', e);
      }
    }

    // Stop all tracks to release microphone
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
      });
      streamRef.current = null;
    }

    // Reset state
    setIsRecording(false);
    chunksRef.current = [];
  }, []);

  // Start recording
  const startRecording = useCallback(async () => {
    try {
      setError(null);
      
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100
        }
      });

      streamRef.current = stream;
      chunksRef.current = [];

      // Determine the best supported format
      let mimeType = 'audio/webm;codecs=opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/webm';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'audio/mp4';
          if (!MediaRecorder.isTypeSupported(mimeType)) {
            mimeType = ''; // Use default
          }
        }
      }

      const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        if (chunksRef.current.length > 0) {
          const blob = new Blob(chunksRef.current, { 
            type: mediaRecorder.mimeType || 'audio/webm' 
          });
          setAudioBlob(blob);
        }
        
        // Release microphone immediately
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
      };

      mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event.error);
        setError('Recording failed');
        cleanup();
      };

      mediaRecorder.start(250); // Collect data every 250ms
      setIsRecording(true);
      setRecordingTime(0);

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (error) {
      console.error('Failed to start recording:', error);
      setError('Microphone access denied');
      cleanup();
    }
  }, [cleanup]);

  // Stop recording
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Send recording
  const sendRecording = useCallback(() => {
    if (audioBlob && recordingTime > 0) {
      const audioURL = URL.createObjectURL(audioBlob);
      
      onSend({
        audioDataURL: audioURL,
        duration: recordingTime,
        size: audioBlob.size,
        mimeType: audioBlob.type,
        blob: audioBlob // Keep reference for potential re-encoding
      });
      
      cleanup();
    }
  }, [audioBlob, recordingTime, onSend, cleanup]);

  // Cancel recording
  const cancelRecording = useCallback(() => {
    cleanup();
    onCancel();
  }, [cleanup, onCancel]);

  // Format time display
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Auto-start recording when component mounts
  useEffect(() => {
    startRecording();
    return cleanup;
  }, [startRecording, cleanup]);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  if (error) {
    return (
      <div className="flex items-center space-x-3 bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="text-red-600">
          <X className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <p className="text-sm text-red-800">{error}</p>
        </div>
        <button
          onClick={cancelRecording}
          className="text-red-600 hover:text-red-800"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-3 bg-gray-100 rounded-lg p-3">
      {/* Recording indicator */}
      <div className="flex items-center space-x-2">
        <div className={`w-3 h-3 rounded-full ${
          isRecording ? 'bg-red-500 animate-pulse' : 
          audioBlob ? 'bg-green-500' : 'bg-gray-400'
        }`} />
        <span className="text-sm font-mono text-gray-700">
          {formatTime(recordingTime)}
        </span>
      </div>

      {/* Waveform visualization */}
      <div className="flex-1 flex items-center justify-center space-x-1 h-8">
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className={`w-1 bg-green-500 rounded-full transition-all duration-200 ${
              isRecording ? 'animate-pulse' : ''
            }`}
            style={{
              height: `${8 + (isRecording ? Math.random() * 16 : 8)}px`,
              opacity: isRecording ? 1 : audioBlob ? 0.8 : 0.5,
              animationDelay: `${i * 100}ms`
            }}
          />
        ))}
      </div>

      {/* Status */}
      <div className="text-xs text-gray-600 min-w-[60px]">
        {isRecording ? 'Recording' : audioBlob ? 'Ready' : 'Starting...'}
      </div>

      {/* Action buttons */}
      <div className="flex items-center space-x-2">
        <button
          onClick={cancelRecording}
          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-full transition-colors"
          title="Cancel"
        >
          <X className="w-4 h-4" />
        </button>

        {isRecording ? (
          <button
            onClick={stopRecording}
            className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors"
            title="Stop recording"
          >
            <Square className="w-4 h-4" />
          </button>
        ) : audioBlob ? (
          <button
            onClick={sendRecording}
            className="p-2 bg-green-500 hover:bg-green-600 text-white rounded-full transition-colors"
            title="Send voice message"
          >
            <Send className="w-4 h-4" />
          </button>
        ) : null}
      </div>
    </div>
  );
};

export default VoiceRecorder;