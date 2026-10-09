"use client";

import { useActionState } from "react";
import { ErrorMessage, inputClass } from "../auth-ui";
import { SubmitButton } from "../submit-button";
import { signUpAction, type FormState } from "./actions";

const initialState: FormState = {};

export function SignupForm() {
  const [state, formAction] = useActionState(signUpAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <ErrorMessage message={state.error} />

      <label className="flex flex-col gap-2 text-sm text-zinc-300">
        Pseudo
        <input name="pseudo" type="text" required minLength={3} maxLength={20} autoComplete="username" className={inputClass} placeholder="ClementDisc" />
      </label>

      <label className="flex flex-col gap-2 text-sm text-zinc-300">
        Adresse e-mail
        <input name="email" type="email" required autoComplete="email" className={inputClass} placeholder="toi@exemple.fr" />
      </label>

      <label className="flex flex-col gap-2 text-sm text-zinc-300">
        Mot de passe
        <input name="password" type="password" required minLength={8} autoComplete="new-password" className={inputClass} placeholder="8 caractères minimum" />
      </label>

      <div className="mt-2">
        <SubmitButton label="Créer mon compte" pendingLabel="Création..." />
      </div>
    </form>
  );
}
