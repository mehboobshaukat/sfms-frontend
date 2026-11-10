import React from "react";
import { Card } from "./Card";
import Icon from "./Icon";
import { formatCurrency } from "../../lib/formatters";
import useCountUp from "../../lib/useCountUp";

/** Overview tile with an icon and a number that counts up. `ready={false}` shows an em dash while data is loading. */
export default function StatTile({ icon, tone, label, amount = 0, integer = false, signed = false, note, ready = true }) {
  const shown = useCountUp(amount);
  return (
    <Card className="group !p-4 flex items-center">
      <div className="flex w-full items-center gap-3.5">
        <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6 ${tone}`}>
          <Icon name={icon} size={22} strokeWidth={1.9} />
        </span>
        <div className="min-w-0">
          <p className="text-[12px] font-semibold text-nav">{label}</p>
          <p className="truncate font-display text-[1.45rem] font-extrabold leading-tight tracking-[-0.03em] text-ink">
            {!ready ? "—" : integer ? Math.round(shown).toLocaleString() : `${signed && shown > 0 ? "+" : ""}${formatCurrency(shown)}`}
          </p>
          {note && <p className="truncate text-[11px] text-muted">{note}</p>}
        </div>
      </div>
    </Card>
  );
}
