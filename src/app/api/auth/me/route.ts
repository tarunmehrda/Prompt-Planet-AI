import { getSession } from "@/lib/session";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return Response.json({ user: null }, { status: 200 });
  }
  return Response.json({
    user: { id: session.userId, name: session.name, email: session.email },
  });
}
