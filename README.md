# Real-Time Group Chat Application

A real-time group chat application that allows multiple users to communicate simultaneously through a common chat room using WebSockets.

## Features

* Multiple users can join the same chat room.
* Each user chooses a unique username.
* Messages are delivered to all connected users in real time.
* Users are notified when another user joins or leaves the chat.
* Empty messages are ignored.
* Usernames must be non-empty and no longer than 20 characters.
* Usernames are case-insensitive and must be unique.
* A single backend server handles all connected clients and broadcasts messages to them.

## Architecture

The application consists of:

* **Backend:** Python WebSocket server using the `websockets` library.
* **Frontend:** React application built with Vite.
* **Communication:** WebSockets provide persistent, bidirectional communication between the frontend clients and backend server.

```text
                 WebSocket
      ┌──────────────────────────┐
      │                          │
   User 1 ─┐                    │
   User 2 ─┤                    ▼
   User 3 ─┼──────────────► Backend Server
   User 4 ─┘                    │
                                │
                         Broadcast messages
                                │
                 ┌──────────────┼──────────────┐
                 ▼              ▼              ▼
              User 1         User 2         User 3 ...
```

## How It Works

1. A client connects to the WebSocket server.
2. The client sends its username as the first message.
3. The server validates the username and checks that it is unique.
4. Once registered, the user can send chat messages.
5. Whenever a message is received, the backend broadcasts it to every connected client.
6. When a user disconnects, the server removes them and broadcasts a notification to the remaining users.

## Running the Application

### Backend

Install the Python dependency:

```bash
pip install websockets
```

Start the server:

```bash
python server.py
```

The WebSocket server runs on port `5000`.

### Frontend

Install the frontend dependencies:

```bash
cd frontend
npm install
```

Start the development server:

```bash
npm run dev
```

The frontend can then be opened in a browser.

## Project Structure

```text
chat-app/
├── backend
│   └── server.py
├── chat-frontend
│   ├── eslint.config.js
│   ├── index.html
│   ├── package.json
│   ├── public
│   │   ├── favicon.svg
│   │   └── icons.svg
│   ├── README.md
│   ├── src
│   │   ├── App.css
│   │   ├── App.jsx
│   │   ├── App1.jsx
│   │   ├── assets
│   │   │   ├── hero.png
│   │   │   ├── react.svg
│   │   │   └── vite.svg
│   │   ├── index.css
│   │   └── main.jsx
│   └── vite.config.js
└── README.md
```

## Technologies Used

* Python
* WebSockets
* React
* Vite
* JavaScript
* HTML/CSS
