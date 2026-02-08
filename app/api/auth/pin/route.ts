import { NextRequest, NextResponse } from "next/server";

const PIN_CODE = "412724";

export async function POST(request: NextRequest) {
  const body = await request.json();

  if (body.pin === PIN_CODE) {
    const response = NextResponse.json({ success: true });
    response.cookies.set("onork_session", "authenticated", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    });
    return response;
  }

  return NextResponse.json({ success: false, error: "Invalid PIN" }, { status: 401 });
}
