import React from "react";
import Modal from "./Modal";
import Button from "./Button";

export default function DeleteGuardDialog({ guard, itemNoun = "item" }) {
  const { open, label, plan, loading, attempt, cancel } = guard;
  if (!open) return null;

  const blocked = plan?.status === "blocked";
  const cascadeEntries = plan?.cascade ? Object.entries(plan.cascade).filter(([, c]) => c > 0) : [];

  return (
    <Modal
      open={open}
      onClose={cancel}
      title={blocked ? "Can't delete" : plan ? "Delete permanently?" : `Delete ${itemNoun}?`}
      size="sm"
      footer={
        blocked ? (
          <Button variant="secondary" onClick={cancel}>
            OK
          </Button>
        ) : (
          <>
            <Button variant="secondary" onClick={cancel} disabled={loading}>
              Cancel
            </Button>
            <Button variant="danger" onClick={() => attempt(!!plan)} loading={loading}>
              {plan ? "Yes, delete everything" : "Delete"}
            </Button>
          </>
        )
      }
    >
      <p className="text-sm text-muted leading-relaxed">
        {plan ? plan.message : `Permanently delete ${label}? This cannot be undone.`}
      </p>
      {cascadeEntries.length > 0 && (
        <ul className="mt-3 space-y-1.5 text-sm">
          {cascadeEntries.map(([lbl, count]) => (
            <li key={lbl} className="flex justify-between border-b border-itemBorder py-1.5">
              <span className="capitalize text-muted">{lbl}</span>
              <span className="text-ink font-medium">{count}</span>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
