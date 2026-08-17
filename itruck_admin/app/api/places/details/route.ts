import { NextRequest, NextResponse } from "next/server";

const GOOGLE_API_KEY =
  process.env.NEXT_PUBLIC_GOOGLE_API_KEY ||
  process.env.GOOGLE_API_KEY ||
  process.env.GOOGLE_API_KEY_ANDROID;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const placeId = searchParams.get("placeId") || "";

    if (!GOOGLE_API_KEY || !placeId.trim()) {
      return NextResponse.json({ status: "INVALID_REQUEST", result: null }, { status: 400 });
    }

    const url = new URL("https://maps.googleapis.com/maps/api/place/details/json");
    url.searchParams.set("place_id", placeId);
    url.searchParams.set("key", GOOGLE_API_KEY);

    const res = await fetch(url.toString());
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { status: "ERROR", result: null, error: (error as Error).message },
      { status: 500 }
    );
  }
}
