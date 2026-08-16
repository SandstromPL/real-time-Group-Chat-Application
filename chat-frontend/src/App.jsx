import { useRef, useState } from "react";
import "./App.css";

const WS_URL = "ws://0.0.0.0:9000";

async function generateKeyPair() {
  return await window.crypto.subtle.generateKey(
    {
      name: "RSA-PSS",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["sign", "verify"]
  );
}

async function exportPublicKey(publicKey) {
  const spki = await window.crypto.subtle.exportKey(
    "spki",
    publicKey
  );

  return arrayBufferToBase64(spki);
}

async function signMessage(privateKey, message) {
  const data = new TextEncoder().encode(message);

  const signature = await window.crypto.subtle.sign(
    {
      name: "RSA-PSS",
      saltLength: 32,
    },
    privateKey,
    data
  );

  return arrayBufferToBase64(signature);
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);

  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary);
}

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
  const privateKeyRef = useRef(null);

  async function connect() {
    const name = username.trim();

    if (!name) {
      return;
    }

    // Generate signing key pair.
    const keyPair = await generateKeyPair();

    privateKeyRef.current = keyPair.privateKey;

    const publicKey = await exportPublicKey(
      keyPair.publicKey
    );

    const socket = new WebSocket(WS_URL);
    socketRef.current = socket;

    socket.onopen = () => {
      // Your backend expects the username as
      // the FIRST message after connection.
      socket.send(
        JSON.stringify({
          type: "register",
          username: name,
          public_key: publicKey,
        })
      );
    };

    socket.onmessage = (event) => {
        console.log("MESSAGE FROM SERVER:", event.data);
      const data = JSON.parse(event.data);

        console.log("PARSED DATA:", data);
    console.log("MESSAGE TYPE:", data.type);

      if (data.type === "error") {
        alert(data.message);
        socket.close();
        return;
      }

      if (data.type === "history") {
        {/*
        const history = payload.messages.map(
          (entry) =>
            `[${formatTime(entry.timestamp)}] ${entry.username}: ${entry.content}`,
        );
        */}

        setMessages(data.messages);
        setConnected(true);
        return;
      }

      if (data.type === "system") {

        setMessages(
          previous => [
            ...previous,
            {
              system: true,
              content: data.content,
            },
          ]
        );
      }

      if (data.type === "chat") {

        setMessages(
          previous => [
            ...previous,
            {
              username: data.username,
              content: data.content,
              timestamp: data.timestamp,
            },
          ]
        );

        return;
      }    
    };


    socket.onclose = () => {
      setConnected(false);
        privateKeyRef.current = null;
    };

    socket.onerror = (error) => {
        console.error("WebSocket error:", error);
    };
  }

  async function sendMessage() {
    const message = input.trim();

    if (!message || !socketRef.current) {
      return;
    }

    if (socketRef.current.readyState !== WebSocket.OPEN) {
      return;
    }

    if (!privateKeyRef.current) {
      return;
    }

    // Sign the plaintext message.
    const signature = await signMessage(
      privateKeyRef.current,
      message
    );


    socketRef.current.send(
      JSON.stringify({
        type: "chat",
        content: message,
        signature: signature,
      })
    );


    setInput("");
    
  }

  function handleKeyDown(event) {
    if (event.key === "Enter") {
      sendMessage();
    }
  }

  function disconnect() {
    socketRef.current?.close();
    socketRef.current = null;
    privateKeyRef.current = null;
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
            <div className={
                  message.system
                    ? "message system-message"
                    : "message"
                } 
                key={index}>
              {message.system ? (
                    message.content
                    ) : (
                  <>
                    <div>
                      <strong>{message.username}</strong>
                    </div>

                    <div>
                      {message.content}
                    </div>

                    <small>
                      {new Date(message.timestamp).toLocaleString()}
                    </small>
                  </>
                )}      
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
