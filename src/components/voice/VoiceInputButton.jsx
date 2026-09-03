import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, AlertCircle } from 'lucide-react';

export default function VoiceInputButton({ onResult, mode = 'number', placeholderHint = 'Fale o número...' }) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [interimText, setInterimText] = useState('');
  const recognitionRef = useRef(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setIsSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'pt-BR';
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onstart = () => {
      setIsListening(true);
      setInterimText('');
    };

    recognition.onresult = (event) => {
      let finalTranscript = '';
      let currentInterim = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          currentInterim += event.results[i][0].transcript;
        }
      }

      setInterimText(currentInterim || finalTranscript);

      if (finalTranscript) {
        let resultValue = finalTranscript.trim();
        if (mode === 'number') {
          // Extrair apenas dígitos ou palavras numéricas comuns
          const digits = resultValue.replace(/\D/g, '');
          if (digits) {
            onResult(digits);
          } else {
            // Conversão básica de números falados comuns em português
            const wordToNum = {
              'um': '1', 'uma': '1', 'dois': '2', 'duas': '2', 'três': '3', 'tres': '3',
              'quatro': '4', 'cinco': '5', 'seis': '6', 'sete': '7', 'oito': '8',
              'nove': '9', 'dez': '10', 'zero': '0'
            };
            const lower = resultValue.toLowerCase();
            if (wordToNum[lower]) {
              onResult(wordToNum[lower]);
            } else {
              onResult(resultValue);
            }
          }
        } else {
          onResult(resultValue);
        }
      }
    };

    recognition.onerror = (err) => {
      console.warn('Erro no reconhecimento de voz:', err);
      setIsListening(false);
      setInterimText('');
    };

    recognition.onend = () => {
      setIsListening(false);
      setInterimText('');
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [onResult, mode]);

  const toggleListening = () => {
    if (!isSupported) {
      alert('Seu navegador não suporta reconhecimento de voz nativo. Recomendamos usar o Google Chrome ou Microsoft Edge.');
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      try {
        recognitionRef.current?.start();
      } catch (e) {
        console.warn('Já estava ouvindo ou erro ao iniciar:', e);
      }
    }
  };

  if (!isSupported) {
    return (
      <button
        type="button"
        title="Reconhecimento de voz não suportado neste navegador"
        disabled
        className="btn-icon btn-disabled"
      >
        <MicOff size={18} className="text-muted" />
      </button>
    );
  }

  return (
    <div className="voice-input-wrapper">
      <button
        type="button"
        onClick={toggleListening}
        title={isListening ? 'Ouvindo... clique para parar' : `Clique para ditar (${placeholderHint})`}
        className={`btn-voice ${isListening ? 'listening' : ''}`}
      >
        {isListening ? <Mic size={18} className="pulse-mic" /> : <Mic size={18} />}
        {isListening && <span className="listening-badge">Ouvindo...</span>}
      </button>
      {isListening && interimText && (
        <span className="interim-bubble">"{interimText}"</span>
      )}
    </div>
  );
}
