// Adresses de la base et du Redis utilisés par les tests d'intégration.
// Jamais ceux du jeu : la base porte le suffixe _test (album -> album_test) et Redis utilise sa base n°15.
// Les tests les vident librement.

export function testDatabaseUrl() {
  const url = new URL(process.env.DATABASE_URL ?? "postgresql://album:album@localhost:5432/album");
  if (!url.pathname.endsWith("_test")) url.pathname = `${url.pathname}_test`;
  return url.toString();
}

export function testRedisUrl() {
  const url = new URL(process.env.REDIS_URL ?? "redis://localhost:6379");
  url.pathname = "/15";
  return url.toString();
}
