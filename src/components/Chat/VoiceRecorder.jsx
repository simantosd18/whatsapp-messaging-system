import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Send, X, AlertCircle } from 'lucide-react';

const VoiceRecorder = ({ onSend, onCancel }) => {
  const [state, setState] = useState('initializing'); // initializing, recording, stopped, error
  const [recordingTime, setRecordingTime] = useState(0);
  const [error, setError] = useState(null);
  const [audioData, setAudioData] = useState(null);
  
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const mountedRef = useRef(true);

  // Cleanup function
  const cleanup = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (mediaRecorderRef.current) {
      try {
        if (mediaRecorderRef.current.state === 'recording') {
          mediaRecorderRef.current.stop();
        }
      } catch (e) {
        // Ignore errors during cleanup
      }
      mediaRecorderRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        try {
          track.stop();
        } catch (e) {
          // Ignore errors during cleanup
        }
      });
      streamRef.current = null;
    }

    chunksRef.current = [];
  };

  // Initialize recording
  const initializeRecording = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Voice recording is not supported in this browser');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100,
          channelCount: 1
        }
      });

      if (!mountedRef.current) {
        stream.getTracks().forEach(track => track.stop());
        return;
      }

      streamRef.current = stream;
      chunksRef.current = [];

      // Find the best supported MIME type
      const mimeTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
        'audio/ogg;codecs=opus',
        'audio/ogg'
      ];

      let selectedMimeType = '';
      for (const mimeType of mimeTypes) {
        if (MediaRecorder.isTypeSupported(mimeType)) {
          selectedMimeType = mimeType;
          break;
        }
      }

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: selectedMimeType || undefined,
        audioBitsPerSecond: 128000
      });

      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        if (!mountedRef.current) return;

        if (chunksRef.current.length > 0) {
          const audioBlob = new Blob(chunksRef.current, {
            type: mediaRecorder.mimeType || 'audio/webm'
          });

          // Convert to base64 immediately
          const reader = new FileReader();
          reader.onload = () => {
            if (mountedRef.current) {
              setAudioData({
                dataURL: reader.result,
                blob: audioBlob,
                mimeType: audioBlob.type,
                size: audioBlob.size
              });
              setState('stopped');
            }
          };
          reader.onerror = () => {
            if (mountedRef.current) {
              setError('Failed to process audio recording');
              setState('error');
            }
          };
          reader.readAsDataURL(audioBlob);
        } else {
          if (mountedRef.current) {
            setError('No audio data recorded');
            setState('error');
          }
        }

        // Clean up stream
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
      };

      mediaRecorder.onerror = (event) => {
        if (mountedRef.current) {
          setError(`Recording failed: ${event.error?.message || 'Unknown error'}`);
          setState('error');
        }
      };

      // Start recording
      mediaRecorder.start(100);
      setState('recording');
      setRecordingTime(0);

      // Start timer
      timerRef.current = setInterval(() => {
        if (mountedRef.current) {
          setRecordingTime(prev => prev + 1);
        }
      }, 1000);

    } catch (err) {
      if (mountedRef.current) {
        let errorMessage = 'Failed to access microphone';
        if (err.name === 'NotAllowedError') {
          errorMessage = 'Microphone access denied. Please allow microphone access and try again.';
        } else if (err.name === 'NotFoundError') {
          errorMessage = 'No microphone found. Please connect a microphone and try again.';
        } else if (err.message) {
          errorMessage = err.message;
        }
        setError(errorMessage);
        setState('error');
      }
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  // Send recording
  const sendRecording = () => {
    if (audioData && recordingTime > 0) {
      onSend({
        audioDataURL: audioData.dataURL,
        duration: recordingTime,
        size: audioData.size,
        mimeType: audioData.mimeType
      });
    }
  };

  // Cancel recording
  const cancelRecording = () => {
    cleanup();
    onCancel();
  };

  // Format time
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Initialize on mount
  useEffect(() => {
    mountedRef.current = true;
    initializeRecording();

    return () => {
      mountedRef.current = false;
      cleanup();
    };
  }, []);

  // Error state
  if (state === 'error') {
    return (
      <div className="flex items-center space-x-3 bg-red-50 border border-red-200 rounded-lg p-4">
        <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-red-800">{error}</p>
        </div>
        <button
          onClick={cancelRecording}
          className="p-1 text-red-500 hover:text-red-700 flex-shrink-0"
          title="Close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-3 bg-gray-100 rounded-lg p-3">
      {/* Status indicator */}
      <div className="flex items-center space-x-2">
        <div className={`w-3 h-3 rounded-full ${
          state === 'recording' ? 'bg-red-500 animate-pulse' : 
          state === 'stopped' ? 'bg-green-500' : 'bg-gray-400'
        }`} />
        <span className="text-sm font-mono text-gray-700 min-w-[40px]">
          {formatTime(recordingTime)}
        </span>
      </div>

      {/* Waveform animation */}
      <div className="flex-1 flex items-center justify-center space-x-1 h-8">
        {Array.from({ length: 15 }).map((_, i) => (
          <div
            key={i}
            className={`w-1 bg-green-500 rounded-full transition-all duration-200 ${
              state === 'recording' ? 'animate-pulse' : ''
            }`}
            style={{
              height: `${6 + (state === 'recording' ? Math.random() * 12 : 6)}px`,
              opacity: state === 'recording' ? 1 : state === 'stopped' ? 0.8 : 0.5,
              animationDelay: `${i * 50}ms`
            }}
          />
        ))}
      </div>

      {/* Status text */}
      <div className="text-xs text-gray-600 min-w-[60px] text-center">
        {state === 'initializing' && 'Starting...'}
        {state === 'recording' && 'Recording'}
        {state === 'stopped' && 'Ready'}
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

        {state === 'recording' && (
          <button
            onClick={stopRecording}
            className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors"
            title="Stop recording"
          >
            <Square className="w-4 h-4" />
          </button>
        )}

        {state === 'stopped' && (
          <button
            onClick={sendRecording}
            className="p-2 bg-green-500 hover:bg-green-600 text-white rounded-full transition-colors"
            title="Send voice message"
          >
            <Send className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};

export default VoiceRecorder;