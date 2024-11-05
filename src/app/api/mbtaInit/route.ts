import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const apiKey = process.env.MBTA_API_KEY;

  try {
    const response = await fetch("https://api-v3.mbta.com/vehicles", {
      headers: {
        Accept: "application/json", // Use JSON for the initial fetch
        "X-API-Key": apiKey as string,
      },
    });

    if (!response.ok) {
      throw new Error(`MBTA API responded with status: ${response.status}`);
    }

    const data = await response.json();

    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "no-cache",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    console.error("MBTA API Error:", error);
    return NextResponse.json(
      { error: "Failed to connect to MBTA API" },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic";
