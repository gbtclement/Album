"use client";

import { useFormStatus } from "react-dom";

// Affiche l'état d'attente pendant l'envoi du formulaire
export function SubmitButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn gold block">
      {pending ? pendingLabel : label}
    </button>
  );
}
