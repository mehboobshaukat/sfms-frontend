import React, { useEffect } from "react";
import ReactDOM from "react-dom";
import Icon from "./Icon";

const SIZES = { sm: "max-w-sm", md: "max-w-lg", lg: "max-w-2xl" };

export default function Modal({ open, onClose, title, children, footer, size = "md" }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    document.addEventListener("keydown", onKey);
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = oldOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-[#061330]/55 backdrop-blur-sm" style={{ animation: "sfms-fade .25s ease" }} onClick={onClose} />
      <div className={`sfms-float relative w-full ${SIZES[size]} bg-card border border-cardBorder rounded-t-3xl rounded-b-none sm:rounded-2xl max-h-[92vh] max-h-[92dvh] sm:max-h-[90dvh] flex flex-col overflow-hidden`} style={{ animation: "sfms-pop-in .3s cubic-bezier(.2,.8,.2,1)" }}>
        <div aria-hidden="true" className="h-1 w-full shrink-0 bg-gradient-to-r from-[#17c8f2] to-[#1565ff]" />
        <div className="flex items-center justify-between gap-3 px-4 py-4 sm:px-6 sm:py-[18px] border-b border-itemBorder">
          <h3 className="min-w-0 break-words font-display text-lg font-bold tracking-[-0.02em] text-ink">{title}</h3>
          <button onClick={onClose} className="h-9 w-9 rounded-lg text-muted hover:text-ink hover:bg-hover flex items-center justify-center" aria-label="Close">
            <span className="text-2xl leading-none">&times;</span>
          </button>
        </div>
        <div className="px-4 py-4 sm:px-6 sm:py-5 overflow-y-auto overscroll-contain">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2.5 px-4 py-3 sm:px-6 sm:py-4 border-t border-itemBorder bg-hover/30 [&>button]:flex-1 sm:[&>button]:flex-none" style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}>{footer}</div>}
      </div>
    </div>,
    document.body
  );
}
