import React, { useState, useRef, useEffect } from 'react';
import { Mic, X, Send } from 'lucide-react';

const SimpleVoiceRecorder = ({ onSend, onCancel }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [hasRecording, setHasRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  
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

    // Force stop all tracks to release microphone
    if (streamRef.current) {
      try {
        streamRef.current.getTracks().forEach(track => {
          console.log('Force stopping track:', track.kind, track.readyState);
          track.stop();
          console.log('Track after force stop:', track.readyState);
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
          sampleRate: 44100,
          channelCount: 1
        } 
      });
      
      streamRef.current = stream;
      console.log('Stream obtained');
      
      // Use a more compatible format
      let mimeType = 'audio/webm;codecs=opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/webm';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'audio/mp4';
          if (!MediaRecorder.isTypeSupported(mimeType)) {
            mimeType = ''; // Let browser choose
          }
        }
      }
      
      const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        console.log('MediaRecorder stopped');
        setIsRecording(false);
        
        // IMMEDIATELY release microphone
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => {
            track.stop();
            console.log('Track stopped on recorder stop:', track.readyState);
          });
          streamRef.current = null;
        }
        
        if (chunksRef.current.length > 0) {
          const blob = new Blob(chunksRef.current, { 
            type: mimeType || 'audio/webm' 
          });
          setAudioBlob(blob);
          setHasRecording(true);
          console.log('Recording ready to send, blob size:', blob.size);
        }
      };

      mediaRecorder.start(100);
      setIsRecording(true);
      setRecordingTime(0);
      console.log('Recording started with mimeType:', mimeType);
    } catch (error) {
      console.error('Recording start error:', error);
      forceCleanup();
      onCancel();
    }
  };

  const stopRecording = () => {
    console.log('Stop recording requested');
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    
    // Force immediate cleanup
    setTimeout(() => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => {
          if (track.readyState !== 'ended') {
            track.stop();
            console.log('Force stopped track in timeout');
          }
        });
        streamRef.current = null;
      }
    }, 100);
  };

  const sendRecording = () => {
    if (audioBlob && recordingTime > 0) {
      console.log('Sending voice message...');
      
      // Create object URL instead of data URL for better browser compatibility
      const audioURL = URL.createObjectURL(audioBlob);
      
      onSend({
        audioDataURL: audioURL,
        duration: recordingTime,
        size: audioBlob.size,
        mimeType: audioBlob.type
      });
      
      // Final cleanup after sending
      forceCleanup();
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
      {/* Recording indicator */}
      <div className="flex items-center space-x-2">
        <div className={`w-3 h-3 rounded-full ${
          isRecording ? 'bg-red-500 animate-pulse' : 
          hasRecording ? 'bg-green-500' : 'bg-gray-400'
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
              opacity: isRecording ? 1 : hasRecording ? 0.8 : 0.5,
              animationDelay: `${i * 50}ms`
            }}
          />
        ))}
      </div>

      {/* Status text */}
      <div className="text-xs text-gray-600">
        {isRecording ? 'Recording' : hasRecording ? 'Ready to send' : 'Ready'}
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

        {isRecording ? (
          <button
            onClick={stopRecording}
            className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors"
            title="Stop recording"
          >
            <div className="w-3 h-3 bg-white rounded-sm" />
          </button>
        ) : hasRecording ? (
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

export default SimpleVoiceRecorder;