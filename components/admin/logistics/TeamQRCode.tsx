// TeamQRCode — Display a real scannable QR code for team check-in
// Generates a secure base64 JSON payload via the server and renders it
// with the `qrcode` library so logistics can scan it with QRScannerModal.
'use client';

import { useEffect, useRef, useState } from 'react';
import { X, Download, Printer, Loader2, AlertTriangle, RefreshCw } from 'lucide-react';
import { trpc } from '@/lib/trpc-client';
import QRCode from 'qrcode';

interface TeamQRCodeProps {
  shortCode: string;
  teamName: string;
  onClose: () => void;
}

export function TeamQRCode({ shortCode, teamName, onClose }: TeamQRCodeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [qrReady, setQrReady] = useState(false);
  const [error, setError] = useState('');
  const utils = trpc.useUtils();

  // Fetch a secure QR payload from the server (nonce + expiry + scan limit),
  // then render it as a real scannable QR code on the canvas.
  const generateQR = async () => {
    setQrReady(false);
    setError('');
    try {
      const { qrPayload } = await utils.logistics.generateQRPayload.fetch({
        shortCode,
      });

      const canvas = canvasRef.current;
      if (!canvas) return;

      await QRCode.toCanvas(canvas, qrPayload, {
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
        errorCorrectionLevel: 'H',
      });

      setQrReady(true);
    } catch (err) {
      console.error('[TeamQRCode] Failed to generate QR:', err);
      setError('Failed to generate QR code. Please try again.');
    }
  };

  useEffect(() => {
    generateQR();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shortCode]);

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas || !qrReady) return;
    const link = document.createElement('a');
    link.download = `${shortCode}-qr.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const handlePrint = () => {
    const canvas = canvasRef.current;
    if (!canvas || !qrReady) return;
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`
      <html>
        <head><title>QR Code - ${shortCode}</title></head>
        <body style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;margin:0;font-family:monospace;">
          <h2>${teamName}</h2>
          <img src="${canvas.toDataURL()}" style="width:300px;height:300px;" />
          <h1 style="letter-spacing:8px;margin-top:16px;">${shortCode}</h1>
          <script>setTimeout(()=>window.print(),200)</script>
        </body>
      </html>
    `);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-[#0A0A0A] rounded-lg border border-white/[0.08] w-full max-w-sm mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/[0.06]">
          <h2 className="text-sm font-mono font-bold text-white tracking-wider">TEAM QR CODE</h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-500 hover:text-gray-300 transition-colors"
            title="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* QR Code display */}
        <div className="p-6 flex flex-col items-center gap-4">
          <div className="bg-white rounded-lg p-3 relative w-[208px] h-[208px] flex items-center justify-center">
            {/* Canvas always present; hidden behind loader while generating */}
            <canvas
              ref={canvasRef}
              className={`w-48 h-48 ${qrReady ? 'block' : 'hidden'}`}
            />
            {!qrReady && !error && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                <Loader2 className="h-6 w-6 text-gray-400 animate-spin" />
                <p className="text-[9px] font-mono text-gray-400">Generating QR…</p>
              </div>
            )}
            {error && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4">
                <AlertTriangle className="h-6 w-6 text-red-400" />
                <p className="text-[9px] font-mono text-red-400 text-center">{error}</p>
                <button
                  onClick={generateQR}
                  className="flex items-center gap-1 text-[9px] font-mono text-emerald-400 hover:text-emerald-300"
                >
                  <RefreshCw className="h-3 w-3" /> Retry
                </button>
              </div>
            )}
          </div>

          <div className="text-center">
            <p className="text-lg font-mono font-bold text-emerald-400 tracking-[0.4em]">
              {shortCode}
            </p>
            <p className="text-[10px] font-mono text-gray-500 mt-1">{teamName}</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              disabled={!qrReady}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded hover:bg-emerald-500/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Download className="h-3 w-3" />
              DOWNLOAD
            </button>
            <button
              onClick={handlePrint}
              disabled={!qrReady}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-mono font-bold text-gray-400 bg-white/[0.03] border border-white/[0.06] rounded hover:bg-white/[0.05] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Printer className="h-3 w-3" />
              PRINT
            </button>
          </div>

          <p className="text-[8px] font-mono text-gray-600 text-center max-w-[200px]">
            QR expires in 24 hours. Logistics members can scan this code with the QR CHECK-IN
            button to quickly find and check in this team.
          </p>
        </div>
      </div>
    </div>
  );
}
