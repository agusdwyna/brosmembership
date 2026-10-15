import { useEffect, useRef, useState, useCallback, useId } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Loader2, VideoOff } from 'lucide-react';

interface CameraScannerProps {
  onScan: (token: string) => void;
  active: boolean;
}

export function CameraScanner({ onScan, active }: CameraScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerId = `qr-${useId().replace(/:/g, '')}`;
  const [status, setStatus] = useState<'idle' | 'starting' | 'scanning' | 'error'>('idle');
  const [error, setError] = useState('');
  const onScanRef = useRef(onScan);
  const hasScannedRef = useRef(false);

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  const stopScanner = useCallback(async () => {
    try {
      if (scannerRef.current?.isScanning) {
        await scannerRef.current.stop();
      }
      scannerRef.current?.clear();
    } catch {
      // ignore cleanup errors
    }
    scannerRef.current = null;
    setStatus('idle');
  }, []);

  const startScanner = useCallback(async () => {
    // Guard: don't restart if already scanned
    if (hasScannedRef.current) return;

    setStatus('starting');
    setError('');

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setStatus('error');
        setError('Kamera membutuhkan HTTPS. Akses halaman ini melalui https:// atau localhost.');
        return;
      }

      const scanner = new Html5Qrcode(containerId);
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 200, height: 200 },
          aspectRatio: 1.0,
          disableFlip: false,
        },
        (decodedText) => {
          // Mark as scanned BEFORE calling onScan to prevent restart loop
          hasScannedRef.current = true;
          onScanRef.current(decodedText);
          stopScanner();
        },
        () => {},
      );

      setStatus('scanning');
    } catch (err: unknown) {
      setStatus('error');
      const error = err as { name?: string; message?: string };
      if (error.name === 'NotAllowedError' || error.message?.includes('Permission')) {
        setError('Izin kamera ditolak. Silakan aktifkan akses kamera di pengaturan browser.');
      } else if (error.name === 'NotFoundError') {
        setError('Kamera tidak ditemukan di perangkat ini.');
      } else if (error.name === 'NotReadableError') {
        setError('Kamera sedang digunakan oleh aplikasi lain.');
      } else {
        setError(error.message || 'Tidak dapat mengakses kamera');
      }
    }
  }, [containerId, stopScanner]);

  // Reset scan guard when active changes from false to true (new scan session)
  useEffect(() => {
    if (active) {
      hasScannedRef.current = false;
      startScanner();
    } else {
      stopScanner();
    }
    return () => {
      stopScanner();
    };
  }, [active, startScanner, stopScanner]);

  return (
    <div className="space-y-3">
      <div
        id={containerId}
        className="rounded-[4px] overflow-hidden border border-border bg-black w-full"
        style={{ minHeight: 200, maxHeight: 280 }}
      />

      {status === 'starting' && (
        <div className="flex items-center justify-center gap-2 text-[13px] text-muted py-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Mengaktifkan kamera...
        </div>
      )}

      {status === 'scanning' && (
        <p className="text-[12px] text-muted text-center">
          Arahkan kamera ke QR code, akan terdeteksi dan diverifikasi otomatis
        </p>
      )}

      {error && (
        <div className="flex items-start gap-2 bg-danger/10 text-danger text-[13px] px-4 py-3 rounded-[4px] border border-danger/20">
          <VideoOff className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
