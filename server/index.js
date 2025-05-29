import express from "express";
import http from "http";
import { Server } from "socket.io";
import { config } from "dotenv";
import OpenAI from "openai";


config(); // Para ler o .env
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" },
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const users = new Map(); // socket.id -> username

io.on("connection", (socket) => {
  console.log("Novo cliente conectado", socket.id);

  socket.on("set username", (username) => {
    const isNameTaken = Array.from(users.values()).includes(username);

    if (isNameTaken) {
      socket.emit("username error", "Nome já está em uso. Escolha outro.");
    } else {
      users.set(socket.id, username);
      socket.emit("username accepted", username);
      const usersList = Array.from(users.values());

// Adiciona o usuário IA no topo se ainda não estiver na lista
if (!usersList.includes("🤖 Nexa")) {
  usersList.unshift("🤖 Nexa");
}

io.emit("users", usersList);
    }
  });

  socket.on("chat message", async (msg) => {
    io.emit("chat message", msg); // Normal broadcast

    // Se mensagem for para a IA
    if (
      msg.content.toLowerCase().startsWith("@ia") || // permite "@ia o que é o sol?"
      msg.content.toLowerCase().includes("inteligência artificial") // ou qualquer outra regra
    ) {
      try {
        const completion = await openai.chat.completions.create({
          model: "gpt-4o", // ou "gpt-3.5-turbo"
          messages: [
            { role: "system", content: "Você é um assistente amigável." },
            { role: "user", content: msg.content },
          ],
        });

        const aiMessage = completion.choices[0].message.content;

        io.emit("chat message", {
          username: "🤖 Nexa",
          content: aiMessage,
        });
      } catch (err) {
        console.error("Erro na IA:", err);
        io.emit("chat message", {
          username: "🤖 Nexa",
          content: "Ocorreu um erro ao processar sua pergunta. Tente novamente.",
        });
      }
    }
  });

  socket.on("disconnect", () => {
    users.delete(socket.id);
    io.emit("users", Array.from(users.values()));
    console.log("Cliente desconectado", socket.id);
  });
});

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
