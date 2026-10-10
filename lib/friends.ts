import { db } from "@/lib/db";

export class FriendError extends Error {}

export type FriendRow = { id: string; pseudo: string };

export async function findUserByPseudo(pseudo: string) {
  const result = await db.query<FriendRow>(
    "select id, pseudo from users where lower(pseudo) = lower($1)",
    [pseudo],
  );
  return result.rows[0] ?? null;
}

// Demande d'ami : la paire ne peut exister qu'une fois, dans un seul sens
export async function sendFriendRequest(userId: string, pseudo: string) {
  const target = await findUserByPseudo(pseudo.trim());
  if (!target) throw new FriendError("Aucun joueur ne porte ce pseudo.");
  if (target.id === userId) throw new FriendError("Tu ne peux pas t'ajouter toi-même.");

  const existing = await db.query<{ status: string; requester_id: string }>(
    `select status, requester_id from friendships
     where (requester_id = $1 and addressee_id = $2) or (requester_id = $2 and addressee_id = $1)`,
    [userId, target.id],
  );
  const row = existing.rows[0];
  if (row?.status === "accepted") throw new FriendError("Vous êtes déjà amis.");
  if (row?.requester_id === userId) throw new FriendError("Demande déjà envoyée.");
  if (row) {
    // Une demande reçue existe déjà : on l'accepte directement
    await db.query(
      "update friendships set status = 'accepted' where requester_id = $1 and addressee_id = $2",
      [target.id, userId],
    );
    return { accepted: true, pseudo: target.pseudo };
  }

  await db.query(
    "insert into friendships (requester_id, addressee_id, status) values ($1, $2, 'pending')",
    [userId, target.id],
  );
  return { accepted: false, pseudo: target.pseudo };
}

// Accepte ou refuse une demande reçue
export async function respondFriendRequest(userId: string, requesterId: string, accept: boolean) {
  const result = accept
    ? await db.query(
        "update friendships set status = 'accepted' where requester_id = $1 and addressee_id = $2 and status = 'pending'",
        [requesterId, userId],
      )
    : await db.query(
        "delete from friendships where requester_id = $1 and addressee_id = $2 and status = 'pending'",
        [requesterId, userId],
      );
  if (result.rowCount === 0) throw new FriendError("Cette demande n'existe plus.");
}

export async function removeFriend(userId: string, friendId: string) {
  await db.query(
    `delete from friendships
     where (requester_id = $1 and addressee_id = $2) or (requester_id = $2 and addressee_id = $1)`,
    [userId, friendId],
  );
}

export async function listFriends(userId: string): Promise<FriendRow[]> {
  const result = await db.query<FriendRow>(
    `select u.id, u.pseudo from friendships f
     join users u on u.id = case when f.requester_id = $1 then f.addressee_id else f.requester_id end
     where (f.requester_id = $1 or f.addressee_id = $1) and f.status = 'accepted'
     order by lower(u.pseudo)`,
    [userId],
  );
  return result.rows;
}

// Demandes reçues, en attente de ma réponse
export async function listIncomingRequests(userId: string): Promise<FriendRow[]> {
  const result = await db.query<FriendRow>(
    `select u.id, u.pseudo from friendships f join users u on u.id = f.requester_id
     where f.addressee_id = $1 and f.status = 'pending' order by f.created_at desc`,
    [userId],
  );
  return result.rows;
}

// Demandes envoyées, en attente de la réponse de l'autre joueur
export async function listOutgoingRequests(userId: string): Promise<FriendRow[]> {
  const result = await db.query<FriendRow>(
    `select u.id, u.pseudo from friendships f join users u on u.id = f.addressee_id
     where f.requester_id = $1 and f.status = 'pending' order by f.created_at desc`,
    [userId],
  );
  return result.rows;
}

export async function areFriends(userId: string, otherId: string) {
  const result = await db.query(
    `select 1 from friendships
     where status = 'accepted'
       and ((requester_id = $1 and addressee_id = $2) or (requester_id = $2 and addressee_id = $1))`,
    [userId, otherId],
  );
  return (result.rowCount ?? 0) > 0;
}
