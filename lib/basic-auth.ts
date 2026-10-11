import bcrypt from "bcryptjs";

// Protection par identifiant et mot de passe demandés par le navigateur (« Basic Auth »), comme un .htpasswd d'Apache.
// `htpasswd` : une ligne « identifiant:empreinte bcrypt » (ex. sortie de `htpasswd -nbB identifiant motdepasse`),
// rangée dans .env et jamais dans le code. Sans ligne valable, tout est refusé.
export async function checkBasicAuth(authorization: string | null, htpasswd: string | undefined): Promise<boolean> {
  const separator = htpasswd?.indexOf(":") ?? -1;
  if (!htpasswd || separator < 1) return false;
  const expectedUser = htpasswd.slice(0, separator);
  const hash = htpasswd.slice(separator + 1).trim();

  const match = authorization?.match(/^Basic\s+(\S+)$/i);
  if (!match) return false;
  const decoded = Buffer.from(match[1], "base64").toString("utf8");
  // Le mot de passe peut lui-même contenir « : » : seul le premier sépare l'identifiant
  const colon = decoded.indexOf(":");
  if (colon < 0) return false;
  const user = decoded.slice(0, colon);
  const password = decoded.slice(colon + 1);

  // La vérification du mot de passe est faite même si l'identifiant est faux : même durée de réponse dans les deux cas
  const passwordOk = await bcrypt.compare(password, hash).catch(() => false);
  return passwordOk && user === expectedUser;
}
