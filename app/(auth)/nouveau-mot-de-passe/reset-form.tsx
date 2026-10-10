"use client";

import { useActionState } from "react";
import { ErrorMessage } from "../auth-ui";
import { SubmitButton } from "../submit-button";
import { resetPasswordAction, type ResetState } from "./actions";

const initialState: ResetState = {};

export function ResetForm({ token }: { token: string }) {
  const [state, formAction] = useActionState(resetPasswordAction, initialState);

  return (
    <form action={formAction} className="auth-form">
      <input type="hidden" name="token" value={token} />
      <ErrorMessage message={state.error} />
      <label className="field-label">
        Nouveau mot de passe
        <input name="password" type="password" required minLength={8} autoComplete="new-password" className="field" placeholder="8 caractères minimum" />
      </label>
      <label className="field-label">
        Confirmation du mot de passe
        <input name="confirmation" type="password" required minLength={8} autoComplete="new-password" className="field" placeholder="Retape le même mot de passe" />
      </label>
      <SubmitButton label="Enregistrer le mot de passe" pendingLabel="Enregistrement..." />
    </form>
  );
}
