"use client";

import { useActionState } from "react";
import { deleteAccountAction, type DeleteState } from "./actions";

const initialState: DeleteState = {};

export function DeleteForm({ hasPassword }: { hasPassword: boolean }) {
  const [state, formAction, pending] = useActionState(deleteAccountAction, initialState);

  return (
    <form action={formAction} className="stack">
      {state.error && <p role="alert" className="auth-error">{state.error}</p>}
      <label className="field-label">
        Ton pseudo, pour confirmer
        <input name="pseudo" type="text" required autoComplete="off" className="field" />
      </label>
      {hasPassword && (
        <label className="field-label">
          Ton mot de passe
          <input name="password" type="password" required autoComplete="current-password" className="field" />
        </label>
      )}
      <button type="submit" className="btn red" disabled={pending}>
        {pending ? "Suppression..." : "Supprimer définitivement mon compte"}
      </button>
    </form>
  );
}
