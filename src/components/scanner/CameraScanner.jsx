import React, { useState, useRef, useEffect } from 'react';
import { Camera, RefreshCw, Check, Upload, AlertCircle, Copy, FileText, SwitchCamera, Sparkles } from 'lucide-react';
import { createWorker } from 'tesseract.js';

export default function CameraScanner({ onNumberDetected, onApplyToForm, onClose }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [cameras, setCameras] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressStatus, setProgressStatus] = useState('');
  const [detectedText, setDetectedText] = useState('');
  const [extractedNumbers, setExtractedNumbers] = useState([]);
  const [copied, setCopied] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);

  // Listar câmeras disponíveis
  useEffect(() => {
    async function getDevices() {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(d => d.kind === 'videoinput');
        setCameras(videoDevices);
        if (videoDevices.length > 0 && !selectedCameraId) {
          // Preferir câmera traseira se houver
          const backCam = videoDevices.find(d => /back|traseira|environment/i.test(d.label));
          setSelectedCameraId(backCam ? backCam.deviceId : videoDevices[0].deviceId);
        }
      } catch (err) {
        console.warn('Erro ao listar dispositivos:', err);
      }
    }
    getDevices();
  }, []);

  // Iniciar a câmera
  useEffect(() => {
    let currentStream = null;

    async function startCamera() {
      setCameraError(null);
      try {
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
        }

        const constraints = {
          video: selectedCameraId
            ? { deviceId: { exact: selectedCameraId }, width: { ideal: 1280 }, height: { ideal: 720 } }
            : { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
        };

        const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
        currentStream = mediaStream;
        setStream(mediaStream);

        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      } catch (err) {
        console.error('Falha ao abrir câmera:', err);
        setCameraError('Não foi possível acessar a câmera. Verifique as permissões do navegador ou faça upload de uma foto.');
      }
    }

    startCamera();

    return () => {
      if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [selectedCameraId]);

  // Alternar entre câmeras
  const switchCamera = () => {
    if (cameras.length > 1) {
      const currentIndex = cameras.findIndex(c => c.deviceId === selectedCameraId);
      const nextIndex = (currentIndex + 1) % cameras.length;
      setSelectedCameraId(cameras[nextIndex].deviceId);
    }
  };

  // Processamento e OCR na região da mira
  const processFrame = async (imageSource) => {
    setIsProcessing(true);
    setProgressStatus('Iniciando motor OCR...');

    try {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');

      let sourceWidth = 0;
      let sourceHeight = 0;

      if (imageSource instanceof HTMLVideoElement) {
        sourceWidth = imageSource.videoWidth;
        sourceHeight = imageSource.videoHeight;
      } else {
        sourceWidth = imageSource.naturalWidth || imageSource.width;
        sourceHeight = imageSource.naturalHeight || imageSource.height;
      }

      if (!sourceWidth || !sourceHeight) {
        throw new Error('Dimensões inválidas da imagem');
      }

      // Região de interesse centralizada (mira do scanner)
      const cropWidth = Math.floor(sourceWidth * 0.7);
      const cropHeight = Math.floor(sourceHeight * 0.35);
      const startX = Math.floor((sourceWidth - cropWidth) / 2);
      const startY = Math.floor((sourceHeight - cropHeight) / 2);

      canvas.width = cropWidth;
      canvas.height = cropHeight;

      // Desenhar o corte no canvas
      ctx.drawImage(imageSource, startX, startY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);

      // Pré-processamento: escala de cinza e alto contraste para facilitar a leitura da etiqueta
      const imgData = ctx.getImageData(0, 0, cropWidth, cropHeight);
      const data = imgData.data;

      for (let i = 0; i < data.length; i += 4) {
        // Luminância
        const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        // Binarização suave / contraste
        const factor = 1.3;
        const adjusted = factor * (gray - 128) + 128;
        const finalVal = adjusted > 140 ? 255 : adjusted < 90 ? 0 : adjusted;

        data[i] = finalVal;
        data[i + 1] = finalVal;
        data[i + 2] = finalVal;
      }
      ctx.putImageData(imgData, 0, 0);

      // Guardar thumbnail do que foi processado
      setPreviewImage(canvas.toDataURL('image/png'));

      setProgressStatus('Reconhecendo caracteres...');

      // Executar Tesseract OCR
      const worker = await createWorker('por', 1, {
        logger: m => {
          if (m.status === 'recognizing text') {
            setProgressStatus(`Lendo etiqueta: ${Math.round(m.progress * 100)}%`);
          }
        }
      });

      const ret = await worker.recognize(canvas);
      await worker.terminate();

      const rawText = ret.data.text.trim();
      setDetectedText(rawText);

      // Filtrar números ou códigos potenciais de tombo (ex: BIO-1234, 450, 0012)
      const numberMatches = rawText.match(/[A-Z]{0,4}-?\d{1,8}/gi) || [];
      const cleaned = [...new Set(numberMatches.map(n => n.trim()))].filter(n => n.length > 0);

      setExtractedNumbers(cleaned);

      if (cleaned.length > 0 && onNumberDetected) {
        onNumberDetected(cleaned[0]);
      }
    } catch (err) {
      console.error('Erro durante o OCR:', err);
      setProgressStatus('Falha ao processar a imagem.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCaptureFromVideo = () => {
    if (videoRef.current) {
      processFrame(videoRef.current);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const img = new Image();
    img.onload = () => {
      processFrame(img);
    };
    img.src = URL.createObjectURL(file);
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="scanner-overlay">
      <div className="scanner-container">
        {/* Cabeçalho */}
        <div className="scanner-header">
          <div className="scanner-title">
            <Camera className="text-emerald" size={24} />
            <div>
              <h3>Scanner de Etiquetas & Tombos</h3>
              <p className="scanner-subtitle">Aponte para a etiqueta do espécime ou faça upload de uma foto</p>
            </div>
          </div>
          {onClose && (
            <button onClick={onClose} className="btn-close" title="Fechar Scanner">
              ✕
            </button>
          )}
        </div>

        {/* Área de Visualização da Câmera */}
        <div className="scanner-viewport-wrapper">
          {cameraError ? (
            <div className="scanner-fallback-box">
              <AlertCircle size={40} className="text-amber" />
              <p>{cameraError}</p>
              <label className="btn-primary mt-3 cursor-pointer">
                <Upload size={18} />
                <span>Carregar Foto da Etiqueta</span>
                <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden-input" />
              </label>
            </div>
          ) : (
            <div className="scanner-video-box">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="scanner-video"
              />

              {/* Mira visual de enquadramento */}
              <div className="scanner-reticle">
                <div className="reticle-corner top-left"></div>
                <div className="reticle-corner top-right"></div>
                <div className="reticle-corner bottom-left"></div>
                <div className="reticle-corner bottom-right"></div>
                <div className="reticle-scanline"></div>
                <span className="reticle-hint">Enquadre o número do espécime aqui</span>
              </div>

              {/* Botão de trocar câmera */}
              {cameras.length > 1 && (
                <button
                  type="button"
                  onClick={switchCamera}
                  className="btn-switch-cam"
                  title="Alternar Câmera"
                >
                  <SwitchCamera size={20} />
                </button>
              )}
            </div>
          )}

          <canvas ref={canvasRef} className="hidden-canvas" />
        </div>

        {/* Barra de Ações Rápidas */}
        <div className="scanner-actions">
          <button
            type="button"
            onClick={handleCaptureFromVideo}
            disabled={isProcessing || !stream}
            className="btn-capture-scan"
          >
            {isProcessing ? (
              <>
                <RefreshCw size={20} className="spin" />
                <span>{progressStatus || 'Processando OCR...'}</span>
              </>
            ) : (
              <>
                <Sparkles size={20} />
                <span>Capturar e Ler Número</span>
              </>
            )}
          </button>

          <label className="btn-secondary btn-upload-label" title="Fazer upload de foto do espécime">
            <Upload size={18} />
            <span>Foto da Galeria</span>
            <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden-input" />
          </label>
        </div>

        {/* Resultados do Reconhecimento */}
        {(detectedText || extractedNumbers.length > 0) && (
          <div className="scanner-results-card">
            <h4>Valores e Códigos Detectados</h4>

            {extractedNumbers.length > 0 ? (
              <div className="extracted-pills">
                {extractedNumbers.map((num, i) => (
                  <div key={i} className="number-pill">
                    <span className="pill-val">{num}</span>
                    <button
                      onClick={() => handleCopy(num)}
                      className="btn-pill-action"
                      title="Copiar número"
                    >
                      {copied ? <Check size={14} className="text-emerald" /> : <Copy size={14} />}
                    </button>
                    {onApplyToForm && (
                      <button
                        onClick={() => onApplyToForm(num)}
                        className="btn-pill-action btn-apply"
                        title="Usar como Tombo no Formulário"
                      >
                        <FileText size={14} />
                        <span>Usar no Tombo</span>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted">Nenhum número claro identificado. Tente aproximar ou ajustar o foco da etiqueta.</p>
            )}

            {detectedText && (
              <details className="raw-text-details">
                <summary>Ver texto bruto detectado</summary>
                <pre className="raw-ocr-text">{detectedText}</pre>
              </details>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
