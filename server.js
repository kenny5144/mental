import { createServer } from "node:http";
import next from "next";
import { Server } from "socket.io";

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handler = app.getRequestHandler();
const port = 3000;

app.prepare().then(() => {
  const server = createServer(handler);
  const io = new Server(server);

  io.on("connection", (socket) => {
    console.log("A user connected:", socket.id);

    // Example response from Gemini AI
    setTimeout(() => {
      socket.emit("gemini-response", "Hello, how can I assist you?");
    }, 5000);
  });

  server.listen(port, () => console.log(`> Ready on http://localhost:${port}`));
});
