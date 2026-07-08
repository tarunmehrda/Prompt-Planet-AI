import bcrypt from "bcryptjs";
import { getUserByEmail } from "@/lib/db";
import { setSessionCookie } from "@/lib/session";

export async function POST(request: Request) {
  let body: { email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  const email = (body.email ?? "").trim().toLowerCase();
  const password = body.password ?? "";

  if (!email || !password) {
    return Response.json({ error: "Email and password are required." }, { status: 400 });
  }

  const user = await getUserByEmail(email);
  // Compare even when the user is missing to avoid leaking which emails exist.
  const ok = user
    ? await bcrypt.compare(password, user.passwordHash)
    : await bcrypt.compare(password, "$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinv");

  if (!user || !ok) {
    return Response.json({ error: "Incorrect email or password." }, { status: 401 });
  }

  await setSessionCookie({ userId: user.id, name: user.name, email: user.email });

  return Response.json({
    user: { id: user.id, name: user.name, email: user.email },
  });
}
