"use client";

import Link from "next/link";
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
        <input name="email" type="email" required autoComplete="email" defaultValue={state.values?.email} className="field" placeholder="nom@exemple.com" />
      </label>

      <div className="field-label">
        <span className="row-between">
          <label htmlFor="login-password">Mot de passe</label>
          <Link href="/mot-de-passe-oublie" className="auth-link">Mot de passe oublié ?</Link>
        </span>
        <input id="login-password" name="password" type="password" required autoComplete="current-password" className="field" placeholder="Ton mot de passe" />
      </div>

      <SubmitButton label="Se connecter" pendingLabel="Connexion..." />
    </form>
  );
}
