"use client";

import { useActionState } from "react";
import { ErrorMessage, inputClass } from "../auth-ui";
import { SubmitButton } from "../submit-button";
import { loginAction, type FormState } from "./actions";

const initialState: FormState = {};

export function LoginForm({ callbackUrl }: { callbackUrl: string }) {
  const [state, formAction] = useActionState(loginAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="callbackUrl" value={callbackUrl} />
      <ErrorMessage message={state.error} />

      <label className="flex flex-col gap-2 text-sm text-zinc-300">
        Adresse e-mail
        <input name="email" type="email" required autoComplete="email" className={inputClass} placeholder="toi@exemple.fr" />
      </label>

      <label className="flex flex-col gap-2 text-sm text-zinc-300">
        Mot de passe
        <input name="password" type="password" required autoComplete="current-password" className={inputClass} />
      </label>

      <div className="mt-2">
        <SubmitButton label="Se connecter" pendingLabel="Connexion..." />
      </div>
    </form>
  );
}
