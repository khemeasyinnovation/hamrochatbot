import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

export async function POST(req: Request) {
  const { email, password } = await req.json();

  if (!email || !password || password.length < 6) {
    return NextResponse.json(
      { error: "Invalid email or password (min 6 chars)" },
      { status: 400 },
    );
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error || !data.user) {
    console.error("[signup] Supabase error:", error);
    return NextResponse.json(
      { error: error?.message || "Signup failed" },
      { status: 400 },
    );
  }

  if (!data.session) {
    return NextResponse.json({
      needsConfirmation: true,
      email: data.user.email,
    });
  }

  return NextResponse.json({ id: data.user.id, email: data.user.email });
}