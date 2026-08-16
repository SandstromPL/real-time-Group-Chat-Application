import asyncio
import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path

import websockets
from websockets.exceptions import ConnectionClosed


HOST = "0.0.0.0"
PORT = 5000

DB_PATH = Path(__file__).with_name("chat.db")

# Number of most recent messages sent to a user when they join.
HISTORY_LIMIT = 50

# Maps each WebSocket connection to its username.
users = {}


def init_db():
    """Create the database and messages table if they do not exist."""
    with sqlite3.connect(DB_PATH) as connection:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT NOT NULL,
                content TEXT NOT NULL,
                timestamp TEXT NOT NULL
            )
            """
        )


def store_message(username, content):
    """Save a chat message and return its timestamp."""
    timestamp = datetime.now(timezone.utc).isoformat()

    with sqlite3.connect(DB_PATH) as connection:
        connection.execute(
            "INSERT INTO messages (username, content, timestamp) VALUES (?, ?, ?)",
            (username, content, timestamp),
        )

    return timestamp


def load_history(limit=HISTORY_LIMIT):
    """Return the most recent messages, oldest first."""
    with sqlite3.connect(DB_PATH) as connection:
        rows = connection.execute(
            """
            SELECT username, content, timestamp
            FROM messages
            ORDER BY id DESC
            LIMIT ?
            """,
            (limit,),
        ).fetchall()

    return [
        {"username": username, "content": content, "timestamp": timestamp}
        for username, content, timestamp in reversed(rows)
    ]


async def broadcast(payload):
    """Send a JSON payload to all currently connected clients."""
    if not users:
        return

    message = json.dumps(payload)

    clients = list(users.keys())

    results = await asyncio.gather(
        *(client.send(message) for client in clients),
        return_exceptions=True,
    )

    # Remove clients whose connection failed while broadcasting.
    for client, result in zip(clients, results):
        if isinstance(result, Exception):
            users.pop(client, None)


async def register_user(websocket):
    """Receive and validate a username from a new client."""
    try:
        username = await websocket.recv()
    except ConnectionClosed:
        return None

    username = username.strip()

    if not username:
        await websocket.send(json.dumps({
            "type": "error",
            "message": "Username cannot be empty.",
        }))
        return None

    if len(username) > 20:
        await websocket.send(json.dumps({
            "type": "error",
            "message": "Username must be 20 characters or fewer.",
        }))
        return None

    # Usernames are considered unique case-insensitively.
    existing_names = {
        name.lower()
        for name in users.values()
    }

    if username.lower() in existing_names:
        await websocket.send(json.dumps({
            "type": "error",
            "message": "Username already taken.",
        }))
        return None

    return username


async def unregister_user(websocket):
    """Remove a client from the connected users."""
    return users.pop(websocket, None)


async def handle_client(websocket):
    """Handle the complete session of one connected client."""

    username = await register_user(websocket)

    if username is None:
        await websocket.close()
        return

    # Send recent chat history to the new user only.
    # This must happen BEFORE adding the client to `users`, otherwise a
    # broadcast could reach it before it has received the history.
    history = await asyncio.to_thread(load_history)

    await websocket.send(json.dumps({
        "type": "history",
        "messages": history,
    }))

    users[websocket] = username

    print(f"{username} joined the chat.")

    await broadcast({
        "type": "system",
        "content": f"{username} joined the chat.",
    })

    try:
        async for raw_message in websocket:
            message = raw_message.strip()

            if not message:
                continue

            print(f"{username}: {message}")

            timestamp = await asyncio.to_thread(
                store_message,
                username,
                message,
            )

            await broadcast({
                "type": "chat",
                "username": username,
                "content": message,
                "timestamp": timestamp,
            })

    except ConnectionClosed:
        pass

    finally:
        removed_username = await unregister_user(websocket)

        if removed_username is not None:
            print(f"{removed_username} left the chat.")
            await broadcast({
                "type": "system",
                "content": f"{removed_username} left the chat.",
            })


async def main():
    """Start the WebSocket server."""

    init_db()

    async with websockets.serve(
        handle_client,
        HOST,
        PORT,
    ):
        print(f"WebSocket server running on ws://{HOST}:{PORT}")
        print(f"Database: {DB_PATH}")
        print("Waiting for clients...")

        await asyncio.Future()


if __name__ == "__main__":
    asyncio.run(main())
