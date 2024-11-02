import { NextResponse } from "next/server";
const { GoogleGenerativeAI } = require("@google/generative-ai");

export async function POST(request) {
  const videoData = await request.arrayBuffer();
  const timestamp = new Date().getTime();

  const geminiVideoResponse = await fetch("https://gemini-ai/video-endpoint", {
    method: "POST",
    headers: { "Content-Type": "image/jpeg" },
    body: videoData,
  });

  const videoResponse = await geminiVideoResponse.json();

  // Emit response to clients via Socket.io
  global.io.emit("gemini-response", {
    type: "video",
    response: videoResponse,
    timestamp,
  });

  return NextResponse.json({ success: true });
}
