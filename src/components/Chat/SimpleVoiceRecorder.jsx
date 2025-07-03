import React, { useState, useRef, useEffect } from 'react';
import { Mic, X } from 'lucide-react';

const SimpleVoiceRecorder = ({ onSend, onCancel }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const streamRef = useRef(null);
  const isStoppedRef = useRef(false);

  useEffect(() => {
    startRecording();
    return () => {
      console.log('Component unmounting, cleaning up...');
      cleanup();
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

  const cleanup = () => {
    console.log('Cleanup called');
    
    // Stop the timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // Stop media recorder if it's recording
    if (mediaRecorderRef.current) {
      if (mediaRecorderRef.current.state === 'recording') {
        console.log('Stopping media recorder...');
        mediaRecorderRef.current.stop();
      }
      mediaRecorderRef.current = null;
    }

    // Stop all tracks to release microphone
    if (streamRef.current) {
      console.log('Stopping media stream tracks...');
      streamRef.current.getTracks().forEach(track => {
        track.stop();
        console.log('Track stopped:', track.kind, track.readyState);
      });
      streamRef.current = null;
    }

    // Reset state
    setIsRecording(false);
    setIsProcessing(false);
    chunksRef.current = [];
    isStoppedRef.current = false;
  };

  const startRecording = async () => {
    try {
      console.log('Requesting microphone access...');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } 
      });
      
      console.log('Microphone access granted');
      streamRef.current = stream;
      
      // Check if component is still mounted
      if (isStoppedRef.current) {
        stream.getTracks().forEach(track => track.stop());
        return;
      }
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        console.log('Data available:', event.data.size);
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        console.log('MediaRecorder stopped, processing audio...');
        setIsRecording(false);
        setIsProcessing(true);
        
        if (chunksRef.current.length > 0 && recordingTime > 0) {
          const blob = new Blob(chunksRef.current, { type: 'audio/webm;codecs=opus' });
          console.log('Created blob:', blob.size, 'bytes');
          
          try {
            // Convert blob to data URL
            const reader = new FileReader();
            reader.onload = () => {
              const audioDataURL = reader.result;
              console.log('Audio converted to data URL, sending...');
              
              // Clean up before sending
              cleanup();
              
              // Send the voice message
              onSend({
                audioBlob: blob,
                audioDataURL: audioDataURL,
                duration: recordingTime,
                size: blob.size,
                mimeType: blob.type
              });
            };
            
            reader.onerror = (error) => {
              console.error('FileReader error:', error);
              cleanup();
              onCancel();
            };
            
            reader.readAsDataURL(blob);
          } catch (error) {
            console.error('Error processing audio:', error);
            cleanup();
            onCancel();
          }
        } else {
          console.log('No audio data to send');
          cleanup();
          onCancel();
        }
      };

      mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event.error);
        cleanup();
        onCancel();
      };

      mediaRecorder.start(100); // Collect data every 100ms
      setIsRecording(true);
      setRecordingTime(0);
      console.log('Recording started');
    } catch (error) {
      console.error('Error starting recording:', error);
      cleanup();
      onCancel();
    }
  };

  const stopRecording = () => {
    console.log('Stop recording requested');
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      console.log('Stopping MediaRecorder...');
      mediaRecorderRef.current.stop();
    }
    
    // Stop the stream immediately to release microphone
    if (streamRef.current) {
      console.log('Stopping stream tracks...');
      streamRef.current.getTracks().forEach(track => {
        track.stop();
        console.log('Track stopped immediately:', track.kind);
      });
    }
  };

  const handleCancel = () => {
    console.log('Recording cancelled by user');
    isStoppedRef.current = true;
    cleanup();
    onCancel();
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center space-x-3 bg-gray-100 rounded-lg p-3">
      {/* Recording indicator */}
      <div className="flex items-center space-x-2">
        <div className={`w-3 h-3 rounded-full ${
          isRecording ? 'bg-red-500 animate-pulse' : 
          isProcessing ? 'bg-yellow-500 animate-pulse' : 'bg-gray-400'
        }`} />
        <span className="text-sm font-mono text-gray-700">
          {formatTime(recordingTime)}
        </span>
      </div>

      {/* Waveform visualization */}
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

      {/* Status text */}
      <div className="text-xs text-gray-600">
        {isProcessing ? 'Sending...' : isRecording ? 'Recording' : 'Ready'}
      </div>

      {/* Action buttons */}
      <div className="flex items-center space-x-2">
        <button
          onClick={handleCancel}
          disabled={isProcessing}
          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-full transition-colors disabled:opacity-50"
          title="Cancel recording"
        >
          <X className="w-5 h-5" />
        </button>

        {isRecording && (
          <button
            onClick={stopRecording}
            disabled={isProcessing}
            className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors disabled:opacity-50"
            title="Stop and send"
          >
            <div className="w-3 h-3 bg-white rounded-sm" />
          </button>
        )}
      </div>
    </div>
  );
};

export default SimpleVoiceRecorder;