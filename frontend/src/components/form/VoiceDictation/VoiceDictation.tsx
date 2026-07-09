import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Button, Tooltip, message } from 'antd';
import { AudioOutlined, AudioMutedOutlined } from '@ant-design/icons';

interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognition;
    webkitSpeechRecognition?: new () => SpeechRecognition;
  }
}

interface VoiceDictationProps {
  onTranscript: (text: string) => void;
  language?: string;
  continuous?: boolean;
  disabled?: boolean;
  size?: 'small' | 'middle' | 'large';
  style?: React.CSSProperties;
  appendMode?: boolean; // append to existing text instead of replace
}

const VoiceDictation: React.FC<VoiceDictationProps> = ({
  onTranscript,
  language = 'vi-VN',
  continuous = true,
  disabled = false,
  size = 'small',
  style,
  appendMode = true,
}) => {
  const [isListening, setIsListening] = useState(false);
  const [interimText, setInterimText] = useState('');
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const isSupported = typeof window !== 'undefined' &&
    (!!window.SpeechRecognition || !!window.webkitSpeechRecognition);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
    setInterimText('');
  }, []);

  const startListening = useCallback(() => {
    if (!isSupported) {
      message.warning('Trinh duyet khong ho tro nhan dang giong noi');
      return;
    }

    const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionClass) return;

    const recognition = new SpeechRecognitionClass();
    recognition.continuous = continuous;
    recognition.interimResults = true;
    recognition.lang = language;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = '';
      let interim = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }

      setInterimText(interim);

      if (finalTranscript) {
        onTranscript(appendMode ? finalTranscript : finalTranscript);
      }
    };

    recognition.onerror = (event: { error: string }) => {
      if (event.error === 'no-speech') return; // Normal - just no speech detected
      if (event.error === 'aborted') return; // User stopped
      console.warn('Speech recognition error:', event.error);
      if (event.error === 'not-allowed') {
        message.warning('Vui long cap quyen truy cap microphone');
      }
    };

    recognition.onend = () => {
      setIsListening(false);
      setInterimText('');
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [isSupported, continuous, language, onTranscript, appendMode]);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  if (!isSupported) return null;

  return (
    <Tooltip title={isListening ? `Dang nghe... ${interimText}` : 'Noi de nhap (Ctrl+M)'}>
      <Button
        icon={isListening ? <AudioOutlined style={{ color: '#ff4d4f' }} /> : <AudioMutedOutlined />}
        onClick={toggleListening}
        size={size}
        disabled={disabled}
        type={isListening ? 'primary' : 'default'}
        danger={isListening}
        style={{
          ...(isListening ? { animation: 'pulse 1.5s infinite' } : {}),
          ...style,
        }}
      />
      {isListening && (
        <style>{`
          @keyframes pulse {
            0% { box-shadow: 0 0 0 0 rgba(255,77,79,0.4); }
            70% { box-shadow: 0 0 0 8px rgba(255,77,79,0); }
            100% { box-shadow: 0 0 0 0 rgba(255,77,79,0); }
          }
        `}</style>
      )}
    </Tooltip>
  );
};

export default VoiceDictation;
