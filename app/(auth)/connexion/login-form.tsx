"use client";

import { useActionState } from "react";
import { ErrorMessage } from "../auth-ui";
import { SubmitButton } from "../submit-button";
import { loginAction, type FormState } from "./actions";

const initialState: FormState = {};

export function LoginForm({ callbackUrl }: { callbackUrl: string }) {
  const [state, formAction] = useActionState(loginAction, initialState);

  return (
    <form action={formAction} className="auth-form">
      <input type="hidden" name="callbackUrl" value={callbackUrl} />
      <ErrorMessage message={state.error} />

      <label className="field-label">
        Adresse e-mail
        <input name="email" type="email" required autoComplete="email" defaultValue={state.values?.email} className="field" placeholder="toi@exemple.fr" />
      </label>

      <label className="field-label">
        Mot de passe
        <input name="password" type="password" required autoComplete="current-password" className="field" />
      </label>

      <SubmitButton label="Se connecter" pendingLabel="Connexion..." />
    </form>
  );
}
