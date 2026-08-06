import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

export async function POST(req: Request) {
  const { email, token } = await req.json();

  if (!email || !token) {
    return NextResponse.json({ error: "Email and code are required" }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: "signup",
  });

  if (error || !data.user) {
    return NextResponse.json(
      { error: error?.message || "Invalid or expired code" },
      { status: 400 },
    );
  }

  return NextResponse.json({ id: data.user.id, email: data.user.email });
}