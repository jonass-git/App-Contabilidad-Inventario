import { useCallback, useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { appConfig } from '../../../config/appConfig';

export interface UseBarcodeScannerOptions {
  elementId: string;
  enabled: boolean;
  onScan: (barcode: string) => void;
}

export interface UseBarcodeScannerReturn {
  isRunning: boolean;
  error: string | null;
  torchSupported: boolean;
  torchEnabled: boolean;
  toggleTorch: () => Promise<void>;
  restart: () => Promise<void>;
}

export function useBarcodeScanner({
  elementId,
  enabled,
  onScan,
}: UseBarcodeScannerOptions): UseBarcodeScannerReturn {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const onScanRef = useRef(onScan);
  const lastScanRef = useRef<{ code: string; time: number }>({ code: '', time: 0 });
  const startingRef = useRef(false);

  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [torchSupported, setTorchSupported] = useState(false);
  const [torchEnabled, setTorchEnabled] = useState(false);

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  const stopScanner = useCallback(async () => {
    const instance = scannerRef.current;
    if (!instance) return;
    try {
      if (instance.isScanning) {
        await instance.stop();
      }
      instance.clear();
    } catch {
      // Ignorar errores de parada si la cámara ya estaba detenida
    } finally {
      setIsRunning(false);
      setTorchEnabled(false);
      setTorchSupported(false);
    }
  }, []);

  const startScanner = useCallback(async () => {
    if (startingRef.current) return;
    const container = document.getElementById(elementId);
    if (!container) return;

    startingRef.current = true;
    setError(null);

    try {
      await stopScanner();

      const scanner = new Html5Qrcode(elementId, {
        formatsToSupport: appConfig.ALLOWED_BARCODE_FORMATS,
        verbose: false,
      });
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: appConfig.SCANNER_FPS,
          qrbox: (viewfinderWidth, viewfinderHeight) => {
            const width = Math.min(Math.floor(viewfinderWidth * 0.86), 340);
            const height = Math.min(Math.floor(viewfinderHeight * 0.48), 160);
            return { width: Math.max(width, 200), height: Math.max(height, 100) };
          },
          aspectRatio: 1.5,
        },
        (decodedText) => {
          const code = decodedText.trim();
          const now = Date.now();
          if (
            code === lastScanRef.current.code &&
            now - lastScanRef.current.time < appConfig.SCAN_COOLDOWN_MS
          ) {
            return;
          }
          lastScanRef.current = { code, time: now };
          onScanRef.current(code);
        },
        () => {
          // Errores frame-a-frame sin detección: ignorar para mantener rendimiento
        },
      );

      setIsRunning(true);

      // Comprobar si la cámara soporta linterna (torch)
      try {
        const capabilities = scanner.getRunningTrackCameraCapabilities();
        const torchFeature = capabilities.torchFeature();
        setTorchSupported(torchFeature.isSupported());
      } catch {
        setTorchSupported(false);
      }
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'No se pudo iniciar la cámara trasera.';
      if (msg.toLowerCase().includes('permission') || msg.toLowerCase().includes('notallowed')) {
        setError('Permiso de cámara denegado. Actívalo en los ajustes del navegador.');
      } else if (
        typeof window !== 'undefined' &&
        !window.isSecureContext &&
        window.location.hostname !== 'localhost'
      ) {
        setError('La cámara requiere conexión segura (HTTPS). Despliega en Vercel para usarla en móvil.');
      } else {
        setError('No se detectó una cámara disponible o está en uso por otra aplicación.');
      }
      setIsRunning(false);
    } finally {
      startingRef.current = false;
    }
  }, [elementId, stopScanner]);

  useEffect(() => {
    if (enabled) {
      void startScanner();
    } else {
      void stopScanner();
    }

    return () => {
      void stopScanner();
    };
  }, [enabled, startScanner, stopScanner]);

  const toggleTorch = useCallback(async () => {
    const instance = scannerRef.current;
    if (!instance || !instance.isScanning) return;
    try {
      const capabilities = instance.getRunningTrackCameraCapabilities();
      const torchFeature = capabilities.torchFeature();
      if (!torchFeature.isSupported()) return;

      const nextState = !torchEnabled;
      await torchFeature.apply(nextState);
      setTorchEnabled(nextState);
    } catch {
      setTorchSupported(false);
    }
  }, [torchEnabled]);

  const restart = useCallback(async () => {
    await startScanner();
  }, [startScanner]);

  return {
    isRunning,
    error,
    torchSupported,
    torchEnabled,
    toggleTorch,
    restart,
  };
}
