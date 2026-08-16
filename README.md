# Real-Time Group Chat Application

A real-time group chat application that allows multiple users to communicate simultaneously through a common chat room using WebSockets.

The application uses client-side cryptographic keys for message authentication, AES-GCM for message confidentiality and integrity, and HTTPS/WSS for secure communication between clients and the server.

## Features

* Multiple users can join the same chat room.
* Each user chooses a unique username.
* Usernames are case-insensitive and must be unique.
* Usernames must be non-empty and no longer than 20 characters.
* Messages are delivered to all connected users in real time.
* Users are notified when another user joins or leaves the chat.
* Chat messages are encrypted using AES-GCM before being stored in the database.
* Each message is digitally signed using the sender's RSA private key.
* The server verifies message signatures before accepting messages.
* The public key used to sign each message is stored alongside that message.
* Historical messages are decrypted and signature-verified before being displayed.
* Tampering with stored ciphertext causes AES-GCM integrity verification to fail.
* Invalid or corrupted historical messages are rejected and not displayed.
* Chat history is stored persistently in SQLite.
* A new user receives the stored chat history when joining the room.
* HTTPS is used for the frontend.
* WSS (WebSocket Secure) is used for communication between the frontend and backend.
* A single backend server handles all connected clients and broadcasts messages to them.

## Architecture

The application consists of:

* **Backend:** Python WebSocket server using the `websockets` library.
* **Frontend:** React application built with Vite.
* **Database:** SQLite database used to persist encrypted messages and their associated metadata.
* **Communication:** WebSockets provide persistent, bidirectional communication between frontend clients and the backend.
* **Transport Security:** HTTPS is used for the frontend and WSS is used for the WebSocket connection.
* **Cryptography:** AES-GCM provides message confidentiality and integrity, while RSA-PSS signatures provide message authentication.

```text
                         HTTPS
              ┌────────────────────────┐
              │                        │
           User 1                   User 2
              │                        │
           User 3                   User 4
              │                        │
              └──────────┬─────────────┘
                         │
                        WSS
                         │
                         ▼
                ┌───────────────────┐
                │   Backend Server  │
                │                   │
                │ Python WebSocket  │
                │     Server        │
                └─────────┬─────────┘
                          │
                 ┌────────┴─────────┐
                 │                  │
                 ▼                  ▼
          Message Processing     SQLite DB
                 │
        ┌────────┴────────┐
        │                 │
        ▼                 ▼
   RSA-PSS Verify     AES-GCM
                      Encrypt/
                      Decrypt
