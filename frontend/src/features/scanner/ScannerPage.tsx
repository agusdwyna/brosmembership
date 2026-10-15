import { useState, useRef, useEffect, useCallback } from 'react';
import { scannerApi } from './api';
import type { ScannerMethod, VerifyResponse, VerifyResult } from './types';
import { CameraScanner } from './components/CameraScanner';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { ScannerCardPreview } from './components/ScannerCardPreview';
import { toast } from '@/components/ui/toast-store';
import { CheckCircle2, XCircle, Keyboard, Usb, Camera, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { useSettingsStore } from '@/stores/settings-store';

type ScannerState = 'ready' | 'scanning' | 'processing' | 'result';

const resultConfig: Record<
  VerifyResult,
  {
    icon: React.ReactNode;
    title: string;
    subtitle: string;
    headerBg: string;
    headerText: string;
    iconBg: string;
  }
> = {
  VALID: {
    icon: <CheckCircle2 className="w-10 h-10" />,
    title: 'Membership Valid',
    subtitle: 'Verified successfully',
    headerBg: 'bg-success',
    headerText: 'text-white',
    iconBg: 'bg-white/20',
  },
  EXPIRED: {
    icon: <XCircle className="w-10 h-10" />,
    title: 'Membership Expired',
    subtitle: 'Membership has passed the end date',
    headerBg: 'bg-danger',
    headerText: 'text-white',
    iconBg: 'bg-white/20',
  },
  SUSPENDED: {
    icon: <XCircle className="w-10 h-10" />,
    title: 'Membership Suspended',
    subtitle: 'Contact admin for reactivation',
    headerBg: 'bg-warning',
    headerText: 'text-white',
    iconBg: 'bg-white/20',
  },
  CANCELLED: {
    icon: <XCircle className="w-10 h-10" />,
    title: 'Membership Cancelled',
    subtitle: 'Membership has been cancelled',
    headerBg: 'bg-danger',
    headerText: 'text-white',
    iconBg: 'bg-white/20',
  },
  NOT_FOUND: {
    icon: <XCircle className="w-10 h-10" />,
    title: 'Not Found',
    subtitle: 'Card or NIK not recognized',
    headerBg: 'bg-foreground',
    headerText: 'text-white',
    iconBg: 'bg-white/20',
  },
};

const methods: { value: ScannerMethod; label: string; icon: React.ReactNode }[] = [
  { value: 'MANUAL', label: 'Manual', icon: <Keyboard className="w-4 h-4" /> },
  { value: 'PHYSICAL_READER', label: 'Reader', icon: <Usb className="w-4 h-4" /> },
  { value: 'CAMERA', label: 'Camera', icon: <Camera className="w-4 h-4" /> },
];

export function ScannerPage() {
  // Default method comes from app settings (loaded async); fall back to MANUAL
  // until they arrive, then apply the configured default once.
  const defaultMethod = useSettingsStore((s) => s.settings.defaultScannerMethod);
  const settingsLoaded = useSettingsStore((s) => s.loaded);
  const appliedDefaultRef = useRef(false);

  const [token, setToken] = useState('');
  const [method, setMethod] = useState<ScannerMethod>(defaultMethod);
  const [cameraActive, setCameraActive] = useState(defaultMethod === 'CAMERA');
  const [result, setResult] = useState<VerifyResponse | null>(null);
  const [state, setState] = useState<ScannerState>(
    defaultMethod === 'CAMERA' ? 'scanning' : 'ready',
  );
  const inputRef = useRef<HTMLInputElement>(null);
  const readerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!settingsLoaded || appliedDefaultRef.current) return;
    appliedDefaultRef.current = true;
    if (defaultMethod === 'CAMERA') {
      setMethod('CAMERA');
      setCameraActive(true);
      setState('scanning');
    } else {
      setMethod(defaultMethod);
      setState('ready');
    }
  }, [settingsLoaded, defaultMethod]);

  // Focus input when entering ready state
  useEffect(() => {
    if (state === 'ready' && method !== 'CAMERA') {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [state, method]);

  // Cleanup reader timer
  useEffect(() => {
    return () => {
      if (readerTimerRef.current) clearTimeout(readerTimerRef.current);
    };
  }, []);

  const handleVerify = useCallback(
    async (tokenToVerify?: string, scannerMethod?: ScannerMethod) => {
      const t = tokenToVerify || token.trim();
      const m = scannerMethod || method;
      if (!t) return;

      setState('processing');
      setResult(null);

      try {
        const { data } = await scannerApi.verify(t, m);
        setResult(data.data);
        setState('result');
        if (data.data.result === 'VALID') toast.success('Membership verified');
      } catch {
        setResult({ result: 'NOT_FOUND', reason: 'Verification error' });
        setState('result');
        toast.error('Verification failed');
      } finally {
        setToken('');
      }
    },
    [token, method],
  );

  const handleReaderInput = (value: string) => {
    setToken(value);
    if (readerTimerRef.current) clearTimeout(readerTimerRef.current);
    readerTimerRef.current = setTimeout(() => {
      if (value.trim().length > 0) handleVerify(value.trim(), 'PHYSICAL_READER');
    }, 100);
  };

  const handleCameraScan = (scannedToken: string) => {
    setCameraActive(false);
    handleVerify(scannedToken, 'CAMERA');
  };

  const handleMethodChange = (newMethod: ScannerMethod) => {
    setMethod(newMethod);
    setResult(null);
    setToken('');
    if (newMethod === 'CAMERA') {
      setCameraActive(true);
      setState('scanning');
    } else {
      setCameraActive(false);
      setState('ready');
    }
  };

  const handleScanAnother = () => {
    setResult(null);
    setToken('');
    if (method === 'CAMERA') {
      setCameraActive(true);
      setState('scanning');
    } else {
      setState('ready');
    }
  };

  // ─── STATE: RESULT ────────────────────────────────────
  if (state === 'result' && result) {
    const config = resultConfig[result.result];
    return (
      <div className="max-w-2xl mx-auto">
        {/* Compact method switcher */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-1.5">
            {methods.map((m) => (
              <button
                key={m.value}
                onClick={() => handleMethodChange(m.value)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-[4px] text-[12px] font-medium transition-colors ${
                  method === m.value
                    ? 'bg-brand text-white'
                    : 'text-muted hover:text-foreground hover:bg-bg'
                }`}
              >
                {m.icon} {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Result Card */}
        <Card className="overflow-hidden">
          {/* Color Header */}
          <div className={`${config.headerBg} px-6 py-5 sm:py-6`}>
            <div className="flex items-center gap-4">
              <div
                className={`${config.iconBg} w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center shrink-0`}
              >
                <span className={config.headerText}>{config.icon}</span>
              </div>
              <div className={config.headerText}>
                <h2 className="text-[18px] sm:text-[22px] font-bold leading-tight">
                  {config.title}
                </h2>
                <p className="text-[13px] sm:text-[14px] opacity-80 mt-0.5">{config.subtitle}</p>
              </div>
            </div>
          </div>

          {/* Content */}
          <CardContent className="py-5 sm:py-6">
            <div className="flex flex-col sm:flex-row gap-5 sm:gap-8">
              {/* Member Info */}
              <div className="flex-1 min-w-0">
                {result.member && (
                  <div className="mb-4">
                    <p className="text-[11px] text-muted uppercase tracking-wide mb-1">Member</p>
                    <p className="text-[16px] sm:text-[18px] font-semibold text-foreground">
                      {result.member.fullName}
                    </p>
                    <p className="text-[13px] text-secondary font-mono">
                      {result.member.memberNumber}
                    </p>
                  </div>
                )}

                {result.membership && (
                  <div className="mb-4">
                    <p className="text-[11px] text-muted uppercase tracking-wide mb-1">
                      Membership
                    </p>
                    <p className="text-[14px] font-medium text-foreground">
                      {result.membership.typeName}
                    </p>
                    {result.result === 'VALID' ? (
                      <p className="text-[13px] text-success">
                        Valid until {format(new Date(result.membership.endDate), 'dd MMM yyyy')}
                      </p>
                    ) : (
                      <p className="text-[13px] text-danger">{result.reason}</p>
                    )}
                  </div>
                )}

                {result.card && (
                  <div className="mb-4">
                    <p className="text-[11px] text-muted uppercase tracking-wide mb-1">Card</p>
                    <p className="text-[13px] font-mono text-foreground">
                      ••••{result.card.cardNumber.slice(-4)}
                    </p>
                  </div>
                )}

                {result.result === 'NOT_FOUND' && (
                  <div className="mb-4">
                    <p className="text-[11px] text-muted uppercase tracking-wide mb-1">Reason</p>
                    <p className="text-[14px] text-danger">{result.reason}</p>
                  </div>
                )}

                <Button onClick={handleScanAnother} className="mt-2">
                  Scan Another
                </Button>
              </div>

              {/* Card Preview */}
              {result.card && (
                <div className="shrink-0">
                  <p className="text-[11px] text-muted uppercase tracking-wide mb-2 text-center sm:text-left">
                    Card Preview
                  </p>
                  <ScannerCardPreview
                    card={result.card}
                    member={result.member}
                    membership={result.membership}
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─── STATE: PROCESSING ────────────────────────────────
  if (state === 'processing') {
    return (
      <div className="max-w-2xl mx-auto">
        {/* Compact method switcher */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-1.5">
            {methods.map((m) => (
              <button
                key={m.value}
                disabled
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-[4px] text-[12px] font-medium text-muted opacity-50 cursor-not-allowed"
              >
                {m.icon} {m.label}
              </button>
            ))}
          </div>
        </div>

        <Card>
          <CardContent className="py-16 sm:py-20">
            <div className="flex flex-col items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-brand/10 flex items-center justify-center">
                <Loader2 className="w-7 h-7 text-brand animate-spin" />
              </div>
              <div className="text-center">
                <p className="text-[15px] font-medium text-foreground">Verifying...</p>
                <p className="text-[13px] text-muted mt-1">Checking membership status</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─── STATE: SCANNING (Camera) ─────────────────────────
  if (state === 'scanning' && method === 'CAMERA') {
    return (
      <div className="max-w-2xl mx-auto">
        {/* Compact method switcher */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-1.5">
            {methods.map((m) => (
              <button
                key={m.value}
                onClick={() => handleMethodChange(m.value)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-[4px] text-[12px] font-medium transition-colors ${
                  method === m.value
                    ? 'bg-brand text-white'
                    : 'text-muted hover:text-foreground hover:bg-bg'
                }`}
              >
                {m.icon} {m.label}
              </button>
            ))}
          </div>
        </div>

        <div className="max-w-lg mx-auto">
          <Card>
            <CardContent className="p-4">
              <CameraScanner onScan={handleCameraScan} active={cameraActive} />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // ─── STATE: READY (default) ───────────────────────────
  return (
    <div className="max-w-2xl mx-auto">
      {/* Method tabs */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-1.5">
          {methods.map((m) => (
            <button
              key={m.value}
              onClick={() => handleMethodChange(m.value)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-[4px] text-[12px] font-medium transition-colors ${
                method === m.value
                  ? 'bg-brand text-white'
                  : 'text-muted hover:text-foreground hover:bg-bg'
              }`}
            >
              {m.icon} {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Input Card */}
      <Card>
        <CardContent className="py-8 sm:py-10">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleVerify();
            }}
            className="flex flex-col items-center gap-5"
          >
            <div className="w-full max-w-md">
              <input
                ref={inputRef}
                value={token}
                onChange={(e) => {
                  if (method === 'PHYSICAL_READER') handleReaderInput(e.target.value);
                  else setToken(e.target.value);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleVerify();
                }}
                placeholder={method === 'PHYSICAL_READER' ? 'Scan card...' : 'Masukkan NIK'}
                className="w-full h-12 px-4 rounded-[4px] border border-border bg-surface text-[14px] text-foreground text-center placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
                autoFocus
              />
            </div>

            {method === 'MANUAL' && (
              <Button type="submit" size="lg" className="w-full max-w-md">
                Verify
              </Button>
            )}

            <p className="text-[12px] text-muted text-center">
              {method === 'PHYSICAL_READER'
                ? 'Siap — scan kartu dengan reader'
                : 'Masukkan NIK lalu tekan Verifikasi'}
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
