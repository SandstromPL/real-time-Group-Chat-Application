import { useEffect, useRef, useState } from "react";
import "./App.css";

const WS_URL = "ws://10.1.75.51:5265";

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
      const message = event.data;

      // Backend sends validation errors like:
      // ERROR: Username already taken.
      if (message.startsWith("ERROR:")) {
        alert(message);
        socket.close();
        return;
      }

      setMessages((previous) => [...previous, message]);
      setConnected(true);
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
