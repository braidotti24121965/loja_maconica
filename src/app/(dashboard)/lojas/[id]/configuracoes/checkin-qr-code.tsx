"use client";

import { QRCodeSVG } from "qrcode.react";
import { Printer } from "lucide-react";
import { useState } from "react";

export function CheckinQrCode({ storeId, storeName }: { storeId: string, storeName: string }) {
  const [showQr, setShowQr] = useState(false);

  // Fallback seguro caso 'window' ainda não exista na montagem SSR
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://www.maconaria360.com.br";
  const checkinUrl = `${baseUrl}/lojas/${storeId}/checkin`;

  const handlePrint = () => {
    // Basic logic to print just the QR area
    const printContent = document.getElementById("print-qr-area");
    if (!printContent) return;
    
    const WinPrint = window.open('', '', 'left=0,top=0,width=800,height=900,toolbar=0,scrollbars=0,status=0');
    if (WinPrint) {
      WinPrint.document.write(`
        <html>
          <head>
            <title>QR Code de Check-in - ${storeName}</title>
            <style>
              body { font-family: sans-serif; text-align: center; margin-top: 100px; }
              .box { border: 2px dashed #ccc; padding: 40px; display: inline-block; border-radius: 16px; }
              h1 { font-size: 32px; margin-bottom: 10px; }
              p { color: #666; font-size: 18px; margin-bottom: 40px; }
            </style>
          </head>
          <body>
            <div class="box">
              <h1>Check-in da Sessão</h1>
              <p>Leia com a câmera do celular para registrar sua presença</p>
              ${printContent.innerHTML}
              <h2 style="margin-top: 40px;">${storeName}</h2>
            </div>
            <script>
              window.onload = function() {
                window.print();
                window.close();
              }
            </script>
          </body>
        </html>
      `);
      WinPrint.document.close();
    }
  };

  return (
    <div style={{ marginTop: 24, paddingTop: 24, borderTop: "1px dashed var(--border)" }}>
      <h2 style={{ fontSize: 18, marginTop: 0, marginBottom: 8 }}>Totem de Presença (QR Code)</h2>
      <p className="subtle" style={{ marginBottom: 16 }}>
        Gere e imprima um QR Code estático para deixar na mesa de assinaturas. 
        Os irmãos podem lê-lo para registrar presença na sessão do dia.
      </p>

      {!showQr ? (
        <button onClick={() => setShowQr(true)} className="button" style={{ background: "transparent", color: "var(--brand)", border: "1px solid var(--brand)" }}>
          Visualizar QR Code
        </button>
      ) : (
        <div style={{ background: "var(--page)", padding: 24, borderRadius: 8, display: "flex", gap: 24, alignItems: "center" }}>
          <div id="print-qr-area" style={{ background: "#fff", padding: 16, borderRadius: 8 }}>
            <QRCodeSVG value={checkinUrl} size={150} level="M" includeMargin={false} />
          </div>
          <div>
            <h3 style={{ margin: "0 0 8px 0" }}>Pronto para impressão</h3>
            <p className="subtle" style={{ fontSize: 14, margin: "0 0 16px 0" }}>Coloque isso num display de acrílico. Ele detecta automaticamente a sessão do dia.</p>
            <button onClick={handlePrint} className="button" style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              <Printer size={16} /> Imprimir Cartaz
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
