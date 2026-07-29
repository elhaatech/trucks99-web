import { NextRequest, NextResponse } from "next/server";

const GOOGLE_API_KEY =
  process.env.NEXT_PUBLIC_GOOGLE_API_KEY ||
  process.env.GOOGLE_API_KEY ||
  process.env.GOOGLE_API_KEY_ANDROID;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const placeId = searchParams.get("placeId") || "";

    console.log("[places/details] placeId =", placeId, "hasKey =", !!GOOGLE_API_KEY);

    if (!GOOGLE_API_KEY || !placeId.trim()) {
      console.log("[places/details] missing key or empty placeId");
      return NextResponse.json({ status: "INVALID_REQUEST", result: null }, { status: 400 });
    }

    const url = new URL("https://maps.googleapis.com/maps/api/place/details/json");
    url.searchParams.set("place_id", placeId);
    url.searchParams.set("key", GOOGLE_API_KEY);

    console.log("[places/details] calling =", url.toString());
    const res = await fetch(url.toString());
    console.log("[places/details] status =", res.status);
    const data = await res.json();
    console.log("[places/details] google status =", data?.status);
    return NextResponse.json(data);
  } catch (error) {
    console.error("[places/details] error", error);
    return NextResponse.json(
      { status: "ERROR", result: null, error: (error as Error).message },
      { status: 500 }
    );
  }
}

