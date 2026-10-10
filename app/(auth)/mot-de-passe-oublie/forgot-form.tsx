"use client";

import { useActionState } from "react";
import { ErrorMessage } from "../auth-ui";
import { SubmitButton } from "../submit-button";
import { forgotPasswordAction, type ForgotState } from "./actions";

const initialState: ForgotState = {};

export function ForgotForm() {
  const [state, formAction] = useActionState(forgotPasswordAction, initialState);

  if (state.sentTo) {
    return (
      <div className="auth-form">
        <p className="auth-success" role="status">
          Si un compte existe avec l&apos;adresse <strong>{state.sentTo}</strong>, un e-mail vient de partir avec un lien pour
          choisir un nouveau mot de passe. Pense à regarder dans les indésirables.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="auth-form">
      <ErrorMessage message={state.error} />
      <label className="field-label">
        Adresse e-mail du compte
        <input name="email" type="email" required autoComplete="email" className="field" placeholder="nom@exemple.com" />
      </label>
      <SubmitButton label="Recevoir un lien" pendingLabel="Envoi..." />
    </form>
  );
}
