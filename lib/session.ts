import { connection } from "next/server";
import { auth } from "@/auth";

// Lit la session après avoir marqué le rendu comme dépendant de la requête.
// Sans cela, Next signale une erreur de pré-rendu (crypto utilisé par Auth.js).
export async function getSession() {
  await connection();
  return auth();
}