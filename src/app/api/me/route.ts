// app/api/me/route.ts
import { cookies, headers } from "next/headers";

export const dynamic = "force-dynamic";

export async function GET() {
  let id = "";
  let name = "";
  let email = "";

  // 1) NextAuth (jika ada di project)
  try {
    const mod = await import("next-auth");
    const session = await mod.getServerSession?.();
    if (session?.user) {
      id = String(session.user.id || id || "");
      name = String(session.user.name || name || "");
      email = String(session.user.email || email || "");
    }
  } catch {
    // abaikan jika next-auth tidak tersedia
  }

  // 2) Cookie "user" (jika kamu simpan sendiri saat login)
  try {
    const jar = await cookies(); // <-- pakai await
    const raw = jar.get("user")?.value || jar.get("me")?.value;
    if (raw) {
      const u = JSON.parse(decodeURIComponent(raw));
      id = String(u.id ?? u._id ?? id ?? "");
      name = String(u.name ?? name ?? "");
      email = String(u.email ?? email ?? "");
    }
  } catch {
    // ignore
  }

  // 3) Header fallback opsional
  try {
    const h = await headers(); // <-- pakai await
    name = h.get("x-user-name") || name;
    email = h.get("x-user-email") || email;
    id = h.get("x-user-id") || id;
  } catch {
    // ignore
  }

  return Response.json({ id, name, email });
}
