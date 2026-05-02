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

    const { readable, writable } = new TransformStream<string, string>();
    const textDecoder = new TextDecoderStream();

    // Parse SSE format and convert to JSON messages
    response.body
      ?.pipeThrough(textDecoder)
      .pipeThrough(
        new TransformStream({
          transform(chunk, controller) {
            // Split by double newlines (SSE message separator)
            const messages = chunk.split("\n\n");

            messages.forEach((message) => {
              if (!message.trim()) return;

              let eventType = "message";
              const dataLines: string[] = [];

              // Parse SSE format (multiple data: lines can form one message)
              const lines = message.split("\n");
              lines.forEach((line) => {
                if (line.startsWith("event:")) {
                  eventType = line.substring(6).trim();
                } else if (line.startsWith("data:")) {
                  dataLines.push(line.substring(5).trim());
                }
              });

              const data = dataLines.join("\n");

              if (data) {
                // Send as standardized message format
                controller.enqueue(`event: ${eventType}\ndata: ${data}\n\n`);
              }
            });
          },
        }),
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
      { status: 500 },
    );
  }
}

export const dynamic = "force-dynamic";
