import React from "react";
import Icon from "./Icon";

export default function EmptyState({ title, description, action }) {
  return (
    <div className="text-center py-10 px-4">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#17c8f2] to-[#1565ff] text-white shadow-luxury">
        <Icon name="reports" size={19} />
      </div>
      <p className="font-display font-bold text-ink">{title}</p>
      {description && <p className="text-sm text-muted mt-1.5 max-w-sm mx-auto leading-relaxed">{description}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}
