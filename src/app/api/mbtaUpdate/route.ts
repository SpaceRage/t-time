import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const apiKey = process.env.MBTA_API_KEY;

  try {
    const response = await fetch("https://api-v3.mbta.com/vehicles", {
      headers: {
        Accept: "text/event-stream",
        "X-API-Key": apiKey as string,
      },
    });

    if (!response.ok) {
      throw new Error(`MBTA API responded with status: ${response.status}`);
    }

    const { readable, writable } = new TransformStream();
    const textDecoder = new TextDecoderStream();

    // Debug the incoming stream
    response.body
      ?.pipeThrough(textDecoder)
      .pipeThrough(
        new TransformStream({
          transform(chunk, controller) {
            // console.log("Server received chunk:", chunk);
            controller.enqueue(chunk);
          },
        })
      )
      .pipeTo(writable);

    return new NextResponse(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        Connection: "keep-alive",
        "Cache-Control": "no-cache, no-transform",
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
