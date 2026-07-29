import { NextRequest, NextResponse } from "next/server";

const GOOGLE_API_KEY =
  process.env.GOOGLE_API_KEY ||
  process.env.NEXT_PUBLIC_GOOGLE_API_KEY ||
  process.env.GOOGLE_API_KEY_ANDROID;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const input = searchParams.get("input") || "";

    if (!GOOGLE_API_KEY || !input.trim()) {
      return NextResponse.json({ status: "ZERO_RESULTS", predictions: [] });
    }

    // 🔹 Autocomplete API
    const autoUrl = new URL(
      "https://maps.googleapis.com/maps/api/place/autocomplete/json"
    );
    autoUrl.searchParams.set("input", input);
    autoUrl.searchParams.set("key", GOOGLE_API_KEY);

    const autoRes = await fetch(autoUrl.toString());
    const autoData = await autoRes.json();

    if (!autoData.predictions?.length) {
      return NextResponse.json(autoData);
    }

    // 🔥 Loop all predictions and attach location
    const enrichedPredictions = await Promise.all(
      autoData.predictions.map(async (item: any) => {
        const detailsUrl = new URL(
          "https://maps.googleapis.com/maps/api/place/details/json"
        );
        detailsUrl.searchParams.set("place_id", item.place_id);
        detailsUrl.searchParams.set("key", GOOGLE_API_KEY);

        const detailsRes = await fetch(detailsUrl.toString());
        const detailsData = await detailsRes.json();

        const components = detailsData.result?.address_components || [];

        let city = "";
        let state = "";
        let country = "";

        components.forEach((comp: any) => {
          if (comp.types.includes("locality")) {
            city = comp.long_name;
          }
          if (comp.types.includes("administrative_area_level_1")) {
            state = comp.long_name;
          }
          if (comp.types.includes("country")) {
            country = comp.long_name;
          }
        });

        // fallback for city
        if (!city) {
          const alt = components.find((c: any) =>
            c.types.includes("administrative_area_level_2")
          );
          city = alt?.long_name || "";
        }

        return {
          ...item,
          location: {
            city,
            state,
            country,
            place_id: item.place_id,
          },
        };
      })
    );

    return NextResponse.json({
      status: "OK",
      predictions: enrichedPredictions,
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "ERROR",
        predictions: [],
        error: (error as Error).message,
      },
      { status: 500 }
    );
  }
}