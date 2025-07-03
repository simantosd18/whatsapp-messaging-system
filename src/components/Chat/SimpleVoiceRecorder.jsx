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
    return () => cleanup();
  }, []);

  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }

    return () => clearInterval(timerRef.current);
  }, [isRecording]);

  const cleanup = () => {
    // Stop the timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // Stop media recorder if it's recording
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }

    // Stop all tracks to release microphone
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
        console.log('Track stopped:', track.kind);
      });
      streamRef.current = null;
    }

    // Reset refs
    mediaRecorderRef.current = null;
    chunksRef.current = [];
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
        console.log('Recording stopped, chunks:', chunksRef.current.length);
        setIsRecording(false);
        
        if (chunksRef.current.length > 0 && recordingTime > 0) {
          const blob = new Blob(chunksRef.current, { type: 'audio/webm;codecs=opus' });
          console.log('Created blob:', blob.size, 'bytes');
          
          try {
            // Convert blob to data URL for storage
            const reader = new FileReader();
            reader.onload = () => {
              const audioDataURL = reader.result;
              console.log('Sending voice message...');
              
              onSend({
                audioBlob: blob,
                audioDataURL: audioDataURL,
                duration: recordingTime,
                size: blob.size,
                mimeType: blob.type
              });
            };
            reader.readAsDataURL(blob);
          } catch (error) {
            console.error('Error processing audio:', error);
            onCancel();
          }
        } else {
          console.log('No audio data to send');
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
      mediaRecorderRef.current.stop();
    }
  };

  const handleCancel = () => {
    console.log('Recording cancelled');
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
        <div className={`w-3 h-3 rounded-full ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-gray-400'}`} />
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

      {/* Action buttons */}
      <div className="flex items-center space-x-2">
        <button
          onClick={handleCancel}
          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-full transition-colors"
          title="Cancel recording"
        >
          <X className="w-5 h-5" />
        </button>

        {isRecording && (
          <button
            onClick={stopRecording}
            className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors"
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