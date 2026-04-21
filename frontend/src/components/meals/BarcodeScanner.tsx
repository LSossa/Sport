import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';

// BarcodeDetector is available in Chrome Android but not in TypeScript's lib
declare const BarcodeDetector: {
  new(options?: { formats?: string[] }): {
    detect(source: HTMLVideoElement): Promise<Array<{ rawValue: string }>>;
  };
  getSupportedFormats?(): Promise<string[]>;
} | undefined;

interface Props {
  onDetected: (barcode: string) => void;
  onCancel: () => void;
}

const BARCODE_FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39'];

export function BarcodeScanner({ onDetected, onCancel }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  const [manual, setManual] = useState('');
  const [error, setError] = useState<string | null>(null);
  const nativeSupported = typeof BarcodeDetector !== 'undefined';

  useEffect(() => {
    if (!nativeSupported) return;

    let active = true;
    const detector = new BarcodeDetector({ formats: BARCODE_FORMATS });

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment' } })
      .then(stream => {
        if (!active) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }

        const scan = async () => {
          if (!active || !videoRef.current) return;
          try {
            const results = await detector.detect(videoRef.current);
            if (results.length > 0) {
              stop();
              onDetected(results[0].rawValue);
              return;
            }
          } catch {
            // detection frame failed, keep trying
          }
          rafRef.current = requestAnimationFrame(scan);
        };

        videoRef.current?.addEventListener('playing', () => { rafRef.current = requestAnimationFrame(scan); }, { once: true });
      })
      .catch(() => setError('Camera access denied. Enter the barcode manually below.'));

    const stop = () => {
      active = false;
      cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach(t => t.stop());
    };

    return () => stop();
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      <div className="flex items-center justify-between p-4">
        <span className="text-white font-semibold">Scan Barcode</span>
        <button onClick={onCancel} className="text-white p-1"><X size={24} /></button>
      </div>

      {nativeSupported && !error ? (
        <div className="relative flex-1">
          <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-64 h-40 border-2 border-white rounded-lg opacity-70" />
          </div>
          <p className="absolute bottom-8 left-0 right-0 text-center text-white text-sm opacity-75">
            Point at a barcode
          </p>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center px-6">
          <div className="w-full space-y-3">
            {error && <p className="text-yellow-400 text-sm text-center">{error}</p>}
            {!nativeSupported && (
              <p className="text-slate-400 text-sm text-center">Barcode camera not supported on this browser. Enter the barcode number manually:</p>
            )}
            <input
              autoFocus
              value={manual}
              onChange={e => setManual(e.target.value)}
              placeholder="e.g. 5449000000996"
              type="number"
              className="w-full bg-slate-700 rounded-lg px-3 py-3 text-white placeholder-slate-400 outline-none text-center text-lg tracking-widest"
            />
            <button
              onClick={() => manual.trim() && onDetected(manual.trim())}
              disabled={!manual.trim()}
              className="w-full py-3 rounded-lg bg-green-600 text-white font-semibold disabled:opacity-40"
            >
              Look up
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
