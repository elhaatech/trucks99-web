import { NextRequest, NextResponse } from "next/server";

const GOOGLE_API_KEY =
  process.env.NEXT_PUBLIC_GOOGLE_API_KEY ||
  process.env.GOOGLE_API_KEY ||
  process.env.GOOGLE_API_KEY_ANDROID;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const input = searchParams.get("input") || "";

    if (!GOOGLE_API_KEY || !input.trim()) {
      return NextResponse.json({ status: "ZERO_RESULTS", predictions: [] }, { status: 200 });
    }

    const url = new URL("https://maps.googleapis.com/maps/api/place/autocomplete/json");
    url.searchParams.set("input", input);
    url.searchParams.set("key", GOOGLE_API_KEY);

    const res = await fetch(url.toString());
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("[places/autocomplete] error", error);
    return NextResponse.json(
      { status: "ERROR", predictions: [], error: (error as Error).message },
      { status: 500 }
    );
  }
}
