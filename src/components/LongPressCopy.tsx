import React, { useRef, useState } from 'react';

interface LongPressCopyProps {
  text: string;
  className?: string;
  children: React.ReactNode;
}

export function LongPressCopy({ text, className = "", children }: LongPressCopyProps) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<any>(null);
  const wasLongPressRef = useRef<boolean>(false);

  const start = (e: React.MouseEvent | React.TouchEvent) => {
    wasLongPressRef.current = false;
    timerRef.current = setTimeout(() => {
      wasLongPressRef.current = true;
      if ('vibrate' in navigator) {
        try { navigator.vibrate(50); } catch (_) {}
      }
      navigator.clipboard.writeText(text)
        .then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        })
        .catch(err => console.error("Could not copy text: ", err));
    }, 600); // 600ms hold
  };

  const cancel = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    if (wasLongPressRef.current) {
      e.stopPropagation();
      e.preventDefault();
      wasLongPressRef.current = false;
    }
  };

  return (
    <span
      id={`long_press_copy_${text.replace(/\s+/g, '_')}`}
      onMouseDown={start}
      onMouseUp={cancel}
      onMouseLeave={cancel}
      onTouchStart={start}
      onTouchEnd={cancel}
      onTouchMove={cancel}
      onClick={handleClick}
      className={`cursor-pointer relative select-none ${className}`}
      title="اضغط مطولاً لنسخ الاسم"
    >
      {children}
      {copied && (
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-[#FF1744] text-white text-[10px] font-bold px-2.5 py-1 rounded-md shadow-lg pointer-events-none whitespace-nowrap animate-bounce z-50">
          تم نسخ الاسم! ✓
        </span>
      )}
    </span>
  );
}
