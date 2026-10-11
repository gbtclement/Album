import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { type Admin, getAdmin } from "@/lib/admin";

// Chaque page et chaque action de l'admin commence par là : le rôle est relu en base (pas seulement dans la session).
// Pas admin : page 404, comme si l'admin n'existait pas.
export async function requireAdmin(): Promise<Admin> {
  const session = await auth();
  const admin = await getAdmin(session?.user?.id);
  if (!admin) notFound();
  return admin;
}
