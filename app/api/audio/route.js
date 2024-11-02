const { GoogleGenerativeAI } = require("@google/generative-ai");
import { NextResponse } from "next/server";

export async function POST(request) {
  const audioData = await request.arrayBuffer();
  const timestamp = new Date().getTime();

  const geminiAudioResponse = await fetch("https://gemini-ai/audio-endpoint", {
    method: "POST",
    headers: { "Content-Type": "audio/wav" },
    body: audioData,
  });

  const audioResponse = await geminiAudioResponse.json();

  // Emit response to clients via Socket.io
  global.io.emit("gemini-response", {
    type: "audio",
    response: audioResponse,
    timestamp,
  });

  return NextResponse.json({ success: true });
}
