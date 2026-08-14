import asyncio
import websockets
from websockets.exceptions import ConnectionClosed


HOST = "0.0.0.0"
PORT = 5000

# Maps each WebSocket connection to its username.
users = {}


async def broadcast(message):
    """Send a message to all currently connected clients."""
    if not users:
        return

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
        await websocket.send("ERROR: Username cannot be empty.")
        return None

    if len(username) > 20:
        await websocket.send("ERROR: Username must be 20 characters or fewer.")
        return None

    # Usernames are considered unique case-insensitively.
    existing_names = {
        name.lower()
        for name in users.values()
    }

    if username.lower() in existing_names:
        await websocket.send("ERROR: Username already taken.")
        return None

    users[websocket] = username

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

    print(f"{username} joined the chat.")

    await broadcast(f"{username} joined the chat.")

    try:
        async for message in websocket:
            message = message.strip()

            if not message:
                continue

            print(f"{username}: {message}")

            await broadcast(f"{username}: {message}")

    except ConnectionClosed:
        pass

    finally:
        removed_username = await unregister_user(websocket)

        if removed_username is not None:
            print(f"{removed_username} left the chat.")
            await broadcast(f"{removed_username} left the chat.")


async def main():
    """Start the WebSocket server."""

    async with websockets.serve(
        handle_client,
        HOST,
        PORT,
    ):
        print(f"WebSocket server running on ws://{HOST}:{PORT}")
        print("Waiting for clients...")

        await asyncio.Future()


if __name__ == "__main__":
    asyncio.run(main())
