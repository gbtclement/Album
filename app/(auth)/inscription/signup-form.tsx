"use client";

import { useActionState } from "react";
import { ErrorMessage } from "../auth-ui";
import { SubmitButton } from "../submit-button";
import { signUpAction, type FormState } from "./actions";

const initialState: FormState = {};

export function SignupForm({ callbackUrl }: { callbackUrl: string }) {
  const [state, formAction] = useActionState(signUpAction, initialState);

  return (
    <form action={formAction} className="auth-form">
      <input type="hidden" name="callbackUrl" value={callbackUrl} />
      <ErrorMessage message={state.error} />

      <label className="field-label">
        Pseudo
        <input name="pseudo" type="text" required minLength={3} maxLength={20} autoComplete="username" defaultValue={state.values?.pseudo} className="field" placeholder="3 à 20 caractères" />
      </label>

      <label className="field-label">
        Adresse e-mail
        <input name="email" type="email" required autoComplete="email" defaultValue={state.values?.email} className="field" placeholder="nom@exemple.com" />
      </label>

      <label className="field-label">
        Mot de passe
        <input name="password" type="password" required minLength={8} autoComplete="new-password" className="field" placeholder="8 caractères minimum" />
      </label>

      <label className="field-label">
        Confirmation du mot de passe
        <input name="confirmation" type="password" required minLength={8} autoComplete="new-password" className="field" placeholder="Retape le même mot de passe" />
      </label>

      <SubmitButton label="Créer mon compte" pendingLabel="Création..." />
    </form>
  );
}
