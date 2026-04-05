"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

type Props = { url: string; size?: number };

export function QRCodeBlock({ url, size = 200 }: Props) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(url, {
      width: size,
      margin: 2,
      color: { dark: "#0f172a", light: "#ffffff" },
    })
      .then((u) => {
        if (!cancelled) setDataUrl(u);
      })
      .catch(() => {
        if (!cancelled) setErr("QR 생성 실패");
      });
    return () => {
      cancelled = true;
    };
  }, [url, size]);

  if (err) {
    return <p className="text-sm text-red-400">{err}</p>;
  }
  if (!dataUrl) {
    return (
      <div
        className="glass flex items-center justify-center rounded-2xl text-sm text-slate-500 shadow-lg"
        style={{ width: size, height: size }}
      >
        QR…
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={dataUrl}
      alt="방 입장 QR 코드"
      width={size}
      height={size}
      className="rounded-2xl bg-white/95 p-2 shadow-lg ring-1 ring-white/30"
    />
  );
}
