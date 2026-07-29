import { NextRequest, NextResponse } from "next/server";

const GOOGLE_API_KEY =
  process.env.NEXT_PUBLIC_GOOGLE_API_KEY ||
  process.env.GOOGLE_API_KEY ||
  process.env.GOOGLE_API_KEY_ANDROID;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const input = searchParams.get("input") || "";

    console.log("[places/autocomplete] input =", input, "hasKey =", !!GOOGLE_API_KEY);

    if (!GOOGLE_API_KEY || !input.trim()) {
      console.log("[places/autocomplete] missing key or empty input");
      return NextResponse.json({ status: "ZERO_RESULTS", predictions: [] }, { status: 200 });
    }

    const url = new URL("https://maps.googleapis.com/maps/api/place/autocomplete/json");
    url.searchParams.set("input", input);
    url.searchParams.set("key", GOOGLE_API_KEY);

    console.log("[places/autocomplete] calling =", url.toString());
    const res = await fetch(url.toString());
    console.log("[places/autocomplete] status =", res.status);
    const data = await res.json();
    console.log(
      "[places/autocomplete] google status =",
      data?.status,
      "predictions =",
      Array.isArray(data?.predictions) ? data.predictions.length : 0
    );
    return NextResponse.json(data);
  } catch (error) {
    console.error("[places/autocomplete] error", error);
    return NextResponse.json(
      { status: "ERROR", predictions: [], error: (error as Error).message },
      { status: 500 }
    );
  }
}

