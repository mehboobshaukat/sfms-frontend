import { useCallback, useState } from "react";
import toast from "react-hot-toast";
import { apiErrorMessage, getDeletionPlan } from "../api/client";

/**
 * Drives the full "delete -> maybe blocked -> maybe needs cascade
 * confirmation" flow against any api.remove(id, confirm) function that
 * follows the backend's deletion-guard contract
 * (see app/crud/deletion_guard.py):
 *
 *   1st attempt (confirm=false):
 *     - 204  -> done.
 *     - 409 {status:"blocked", message} -> show message, dead end (OK only).
 *     - 409 {status:"confirm", message, cascade} -> show what will also be
 *       deleted, require an explicit second click.
 *   2nd attempt (confirm=true): performs the cascade delete for real.
 *
 * Usage:
 *   const guard = useDeleteGuard(categoriesApi.remove, refetch);
 *   <button onClick={() => guard.request(category.id, `category "${category.name}"`)}>Delete</button>
 *   <DeleteGuardDialog guard={guard} />
 */
export function useDeleteGuard(removeFn, onDeleted) {
  const [state, setState] = useState({ open: false, id: null, label: "", plan: null, loading: false });

  const request = useCallback((id, label = "this item") => {
    setState({ open: true, id, label, plan: null, loading: false });
  }, []);

  const attempt = useCallback(
    async (confirm) => {
      setState((s) => ({ ...s, loading: true }));
      try {
        await removeFn(state.id, confirm);
        toast.success(`Deleted ${state.label}.`);
        setState({ open: false, id: null, label: "", plan: null, loading: false });
        onDeleted?.();
      } catch (err) {
        const plan = getDeletionPlan(err);
        if (plan) {
          setState((s) => ({ ...s, plan, loading: false }));
        } else {
          toast.error(apiErrorMessage(err, `Couldn't delete ${state.label}.`));
          setState({ open: false, id: null, label: "", plan: null, loading: false });
        }
      }
    },
    [removeFn, state.id, state.label, onDeleted]
  );

  const cancel = useCallback(() => setState({ open: false, id: null, label: "", plan: null, loading: false }), []);

  return { ...state, request, attempt, cancel };
}
