"use client";

import Link from "next/link";
import { useActionState } from "react";
import { MIN_AGE } from "@/lib/legal";
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

      <label className="check-label">
        <input name="terms" type="checkbox" required />
        <span>
          J&apos;ai au moins {MIN_AGE} ans (ou l&apos;accord d&apos;un parent) et j&apos;accepte les{" "}
          <Link href="/cgu" target="_blank">conditions d&apos;utilisation</Link> et la{" "}
          <Link href="/confidentialite" target="_blank">politique de confidentialité</Link>.
        </span>
      </label>

      <SubmitButton label="Créer mon compte" pendingLabel="Création..." />
    </form>
  );
}
