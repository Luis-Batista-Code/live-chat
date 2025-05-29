import { useEffect, useState } from "react";
import { io } from "socket.io-client";

const socket = io("http://localhost:3000");

type ChatMessage = {
  username: string;
  content: string;
};

function getUserColor(username: string): string {
  if (username === "🤖 Nexa") {
    return "hsl(180, 100%, 50%)"; // azul (pode trocar para qualquer cor que quiser)
  }

  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = hash % 360;
  return `hsl(${hue}, 70%, 70%)`;
}

function renderMessageContent(content: string) {
  const urlRegex = /(https?:\/\/[^\s]+)|(www\.[^\s]+)/g;

  const parts = content.split(urlRegex).filter(Boolean);

  return parts.map((part, idx) => {
    if (urlRegex.test(part)) {
      let href = part;
      if (!href.startsWith("http")) {
        href = "http://" + href;
      }
      return (
        <a
          key={idx}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-purple-400 underline hover:text-purple-600"
        >
          {part}
        </a>
      );
    }
    return <span key={idx}>{part}</span>;
  });
}

export default function App() {
  const [username, setUsername] = useState<string | null>(null);
  const [inputName, setInputName] = useState("");
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [showSidebar, setShowSidebar] = useState(false);
  const [users, setUsers] = useState<string[]>([]);

  useEffect(() => {
    if (!username) return;

    socket.emit("set username", username);

    socket.on("users", (list: string[]) => {
      setUsers(list);
    });

    socket.on("chat message", (msg: ChatMessage) => {
      setMessages((prev) => [...prev, msg]);
    });

    return () => {
      socket.off("users");
      socket.off("chat message");
    };
  }, [username]);

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && username) {
      socket.emit("chat message", {
        username,
        content: message,
      });
      setMessage("");
    }
  };

  const handleEnter = () => {
    if (inputName.trim()) {
      setUsername(inputName.trim());
    }
  };

  if (!username) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-70 z-50">
        <div className="bg-black bg-opacity-90 rounded-lg shadow-lg w-80 p-6">
          <h2 className="text-white text-lg font-semibold mb-4 text-center">Digite seu nome</h2>
          <input
            type="text"
            className="w-full p-2 rounded bg-black/70 border border-purple-700 text-white placeholder-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-600"
            placeholder="Nome de usuário"
            value={inputName}
            onChange={(e) => setInputName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && inputName.trim()) {
                handleEnter();
              }
            }}
            autoFocus
          />
          <button
            disabled={!inputName.trim()}
            onClick={handleEnter}
            className="mt-4 w-full py-2 rounded bg-purple-700 hover:bg-purple-800 transition disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold"
          >
            Entrar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-black flex items-center justify-center px-4 text-white relative">
      {/* Container principal do chat */}
      <div className="rounded-xl shadow-2xl overflow-hidden border border-purple-800 bg-black/60 backdrop-blur-md max-w-[900px] w-full">
        <div className="flex items-center gap-2 p-3 bg-black/40 border-b border-purple-800 relative">
          <div className="flex gap-2">
            <span
              className="w-3 h-3 rounded-full bg-red-500 cursor-pointer"
              onClick={() => setShowSidebar(!showSidebar)}
              title="Mostrar usuários"
            ></span>
            <span className="w-3 h-3 rounded-full bg-yellow-400"></span>
            <span className="w-3 h-3 rounded-full bg-green-500"></span>
          </div>
          <span className="ml-4 text-purple-300 text-sm font-medium">Chat ao Vivo</span>
        </div>

        <div className="p-6 flex flex-col h-[600px]">
          <div className="flex-1 overflow-y-auto mb-4 bg-black/30 border border-purple-700 rounded-lg p-4">
            {messages.map((msg, idx) => {
              // Aceita username "IA" e "🤖 IA" como mensagens da IA
              const isAI = msg.username === "IA" || msg.username === "🤖 Nexa";
              const isMe = msg.username === username;

              return (
                <div
                  key={idx}
                  className={`mb-2 text-sm rounded-lg p-2 ${
                    isAI
                      ? "bg-purple-900/30 border border-purple-600 text-purple-300 italic"
                      : "hover:bg-white/5"
                  }`}
                >
                  <span className="font-semibold" style={{ color: getUserColor(msg.username) }}>
                    {isMe ? "Você" : msg.username}:
                  </span>{" "}
                  {renderMessageContent(msg.content)}
                </div>
              );
            })}
          </div>

          <form onSubmit={sendMessage} className="flex gap-2">
            <input
              type="text"
              className="flex-1 p-2 rounded-lg bg-black/60 border border-purple-700 placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-600"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Digite sua mensagem..."
              autoComplete="off"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-purple-700 hover:bg-purple-800 transition rounded-lg"
            >
              Enviar
            </button>
          </form>
        </div>
      </div>

      {/* Sidebar que aparece ao lado, fora do container do chat */}
      <aside
        className={`fixed top-[calc(50%-300px)] right-6 w-64 h-[600px] bg-black/70 border border-purple-800 rounded-lg p-4 overflow-y-auto shadow-lg transition-transform duration-300 z-50
          ${showSidebar ? "translate-x-0" : "translate-x-[110%]"}
        `}
      >
        <h2 className="text-lg font-bold text-purple-400 mb-4">👥 Usuários</h2>
        <ul className="space-y-2">
          {users.map((u, i) => (
            <li
              key={i}
              className="text-sm p-2 rounded hover:bg-purple-800/40 transition"
            >
              {u === username ? "Você" : u}
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}
