import { useRef, useState } from "react";
import "./App.css";

const WS_URL = "ws://0.0.0.0:5000";

function formatTime(timestamp) {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function App() {
  const [username, setUsername] = useState("");
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");

  const socketRef = useRef(null);

  function connect() {
    const name = username.trim();

    if (!name) {
      return;
    }

    const socket = new WebSocket(WS_URL);
    socketRef.current = socket;

    socket.onopen = () => {
      // Your backend expects the username as
      // the FIRST message after connection.
      socket.send(name);
    };

    socket.onmessage = (event) => {
      const payload = JSON.parse(event.data);

      if (payload.type === "error") {
        alert(payload.message);
        socket.close();
        return;
      }

      if (payload.type === "history") {
        const history = payload.messages.map(
          (entry) =>
            `[${formatTime(entry.timestamp)}] ${entry.username}: ${entry.content}`,
        );

        setMessages(history);
        setConnected(true);
        return;
      }

      if (payload.type === "system") {
        setMessages((previous) => [...previous, payload.content]);
        return;
      }

      if (payload.type === "chat") {
        const line =
          `[${formatTime(payload.timestamp)}] ${payload.username}: ${payload.content}`;

        setMessages((previous) => [...previous, line]);
      }
    };

    socket.onclose = () => {
      setConnected(false);
    };

    socket.onerror = () => {
      console.error("WebSocket error");
    };
  }

  function sendMessage() {
    const message = input.trim();

    if (!message || !socketRef.current) {
      return;
    }

    if (socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(message);
      setInput("");
    }
  }

  function handleKeyDown(event) {
    if (event.key === "Enter") {
      sendMessage();
    }
  }

  function disconnect() {
    socketRef.current?.close();
    socketRef.current = null;
    setMessages([]);
    setConnected(false);
  }

  if (!connected) {
    return (
      <div className="app">
        <div className="login-box">
          <h1>Group Chat</h1>

          <input
            type="text"
            placeholder="Enter username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                connect();
              }
            }}
            maxLength={20}
          />

          <button onClick={connect}>
            Join Chat
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <div className="chat-container">

        <header>
          <h1>Group Chat</h1>
          <span>Logged in as <b>{username}</b></span>

          <button onClick={disconnect}>
            Leave
          </button>
        </header>

        <div className="messages">
          {messages.map((message, index) => (
            <div className="message" key={index}>
              {message}
            </div>
          ))}
        </div>

        <div className="input-area">
          <input
            type="text"
            placeholder="Type a message..."
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleKeyDown}
          />

          <button onClick={sendMessage}>
            Send
          </button>
        </div>

      </div>
    </div>
  );
}

export default App;
