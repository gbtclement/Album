"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { guessAction } from "./actions";

type Suggestion = { id: string; title: string; artist: string };

function ConfirmButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn gold block" disabled={pending}>
      {pending ? "Vérification…" : "Valider ma réponse"}
    </button>
  );
}

// Recherche guidée : on tape le début du titre, on choisit dans la liste, puis on valide (une seule chance)
export function GuessForm() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Suggestion[]>([]);
  const [active, setActive] = useState(-1);
  const [chosen, setChosen] = useState<Suggestion | null>(null);
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  // Suggestions après une courte pause dans la frappe ; une réponse en retard n'écrase pas une plus récente
  useEffect(() => {
    const text = query.trim();
    if (text.length < 2 || chosen) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/pioche/recherche?q=${encodeURIComponent(text)}`, { signal: controller.signal });
        if (!res.ok) return;
        const data = (await res.json()) as { albums: Suggestion[] };
        setResults(data.albums);
        setActive(-1);
      } catch {
        // Requête annulée par une frappe plus récente
      }
    }, 180);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, chosen]);

  const shown = query.trim().length >= 2 && !chosen ? results : [];

  const choose = (item: Suggestion) => {
    setChosen(item);
    setQuery(item.title);
    setResults([]);
  };

  if (chosen) {
    return (
      <form action={guessAction} className="guess">
        <input type="hidden" name="albumId" value={chosen.id} />
        <div className="guess-pick">
          <span>Ta réponse</span>
          <strong>{chosen.title}</strong>
          <small>{chosen.artist}</small>
        </div>
        <p className="guess-warn">Une seule chance : c&apos;est bien ta réponse ?</p>
        <div className="sheet-actions">
          <button
            type="button"
            className="btn block"
            onClick={() => {
              setChosen(null);
              setTimeout(() => inputRef.current?.focus(), 0);
            }}
          >
            Changer
          </button>
          <ConfirmButton />
        </div>
      </form>
    );
  }

  return (
    <div className="guess">
      <label className="field-label" htmlFor={`${listId}-input`}>Quel est le nom de cet album ?</label>
      <div className="combo">
        <input
          ref={inputRef}
          id={`${listId}-input`}
          type="text"
          role="combobox"
          aria-expanded={shown.length > 0}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
          autoComplete="off"
          placeholder="Tape le début du titre…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (!shown.length) return;
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setActive((index) => (index + 1) % shown.length);
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              setActive((index) => (index <= 0 ? shown.length - 1 : index - 1));
            } else if (event.key === "Enter" && active >= 0) {
              event.preventDefault();
              choose(shown[active]);
            } else if (event.key === "Escape") {
              setResults([]);
            }
          }}
        />
        {shown.length > 0 && (
          <ul className="combo-list" id={listId} role="listbox" aria-label="Albums proposés">
            {shown.map((item, index) => (
              <li
                key={item.id}
                id={`${listId}-${index}`}
                role="option"
                aria-selected={index === active}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => choose(item)}
              >
                <strong>{item.title}</strong>
                <small>{item.artist}</small>
              </li>
            ))}
          </ul>
        )}
      </div>
      <p className="guess-hint">Choisis un titre dans la liste. Tu n&apos;as qu&apos;une seule réponse par jour.</p>
    </div>
  );
}
