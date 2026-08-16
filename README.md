# Real-Time Group Chat Application

A real-time group chat application that allows multiple users to communicate simultaneously through a common chat room using WebSockets.

The application uses client-side cryptographic keys for message authentication, AES-GCM for message confidentiality and integrity, and HTTPS/WSS for secure communication between clients and the server.

## Members:

* Agastya Nath - 12340140
* Galaba Vamsi - 12340770
* Paritosh Lahre - 12341550
* Y. Rahul Dev Reddy - 12342390

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
```

## Cryptographic Architecture

Each client generates an RSA key pair:
```text
Client
├── Private Key
│     └── Used to sign messages
│
└── Public Key
      └── Sent to the server
```
The private key remains on the client and is never sent to the server.

When a user sends a message:

* The client signs the message using its RSA private key.
* The message and signature are sent to the backend over the WebSocket.
* The backend verifies the signature using the sender's public key.
* If the signature is invalid, the message is rejected.
* If the signature is valid, the message is encrypted using AES-GCM.
* The ciphertext, nonce, signature, sender username, public key, and timestamp are stored in SQLite.
* The message is broadcast to all currently connected users.

Conceptually:
```text
Plaintext
    │
    ├──────────────► RSA-PSS Signature
    │
    ▼
AES-GCM Encryption
    │
    ▼
Ciphertext + Nonce + Signature + Public Key
    │
    ▼
SQLite Database
Message Authentication

RSA-PSS is used to digitally sign messages.

The server verifies the signature before accepting a message:

Message + Signature
        │
        ▼
Server's copy of sender's public key
        │
        ▼
RSA-PSS Verification
        │
   ┌────┴────┐
   │         │
 Valid     Invalid
   │         │
   ▼         ▼
Accept     Reject
```
The public key associated with each message is stored in the database. This allows historical messages to be verified even if the user reconnects later and generates a new key pair.

## Message Encryption and Tamper Detection

Messages stored in SQLite are encrypted using AES-GCM.

The database stores:

* Username
* Public key
* Ciphertext
* Nonce
* Digital signature
* Timestamp

AES-GCM provides both confidentiality and integrity.

If an attacker modifies the ciphertext stored in the database, the AES-GCM authentication check fails during decryption. The server then rejects the message rather than displaying corrupted or tampered content.

```text
Stored Ciphertext
       │
       ▼
   AES-GCM
   Decryption
       │
       ├── Valid authentication tag
       │          │
       │          ▼
       │       Message
       │
       └── Invalid authentication tag
                  │
                  ▼
             Reject message
```
This allows tampering with the database to be demonstrated by modifying a stored ciphertext and reconnecting to the chat. The server detects the modification and reports an integrity/decryption failure.

## How It Works
# User Registration
* A client establishes a secure WebSocket connection to the backend.
* The client sends its username as the first message.
* The server validates the username.
* The server checks that the username is unique, ignoring case.
* The client generates its cryptographic key pair.
* The public key is associated with the user on the server.
  
# Joining the Chat

Once the user is registered:

* The server retrieves stored messages from SQLite.
* Each historical message is decoded and decrypted.
* Its digital signature is verified using the public key stored with that message.
* Valid messages are sent to the newly connected client.
* Corrupted or tampered messages are rejected.
* The user is then added to the set of currently connected users.
*A system notification is broadcast to the other users.

# Sending a Message
* The user enters a message in the frontend.
* The client signs the plaintext using its private RSA key.
* The signed message is sent to the backend.
* The server verifies the signature.
* If verification fails, the message is rejected.
* If verification succeeds, the message is encrypted using AES-GCM.
* The encrypted message and its metadata are stored in SQLite.
* The message is broadcast to all connected clients.
 
# Disconnecting

When a user disconnects:

* The server removes the WebSocket connection from the active users.
* The username is removed from the active user list.
* A system message notifying the remaining users is broadcast.
  
## Database Structure

The SQLite database contains a messages table with the following fields:

* **id:**	Unique message identifier
* **username:**	Username of the sender
* **public_key:**	Public key used to verify the message signature
* **ciphertext:**	AES-GCM encrypted message
* **nonce:**	AES-GCM nonce used for encryption
* **signature:**	RSA-PSS signature of the plaintext message
* **timestamp:**	UTC timestamp of the message

The plaintext message itself is not stored in the database.

## Running the Application
# Backend

Install the Python dependencies:
```python
pip install websockets cryptography
```
Start the server:
```python
python server.py
```
The WebSocket server runs on port 9000 by default.

For secure deployment, the backend uses TLS and accepts secure WebSocket connections through:
```code
wss://<server-ip>:9000
```
# Frontend

Install the frontend dependencies:
```code
cd chat-frontend
npm install
```
Start the Vite development server:
```code
npm run dev
```
For HTTPS deployment, the Vite server is configured with the server's TLS certificate and private key.

The frontend is then accessed using:
```code
https://<server-ip>:<frontend-port>
```
The frontend connects to the backend using:
```code
wss://<server-ip>:9000
```
HTTPS and WSS

Because the browser's Web Crypto API requires a secure context, the deployed frontend is served over HTTPS.

The WebSocket connection is also secured using WSS:
```text
Browser
   │
   │ HTTPS
   ▼
React / Vite Frontend
   │
   │ WSS
   ▼
Python WebSocket Backend
```
For development, a self-signed TLS certificate may be used. Browsers will display a certificate warning because the certificate is not issued by a trusted certificate authority.
```text
Project Structure
chat-app/
├── backend
│   ├── server.py
├── chat-frontend
│   ├── eslint.config.js
│   ├── index.html
│   ├── package.json
│   ├── public
│   │   ├── favicon.svg
│   │   └── icons.svg
│   ├── src
│   │   ├── App.css
│   │   ├── App.jsx
│   │   ├── assets
│   │   │   ├── hero.png
│   │   │   ├── react.svg
│   │   │   └── vite.svg
│   │   ├── index.css
│   │   └── main.jsx
│   └── vite.config.js
│
└── README.md
```

## Technologies Used
* Python
* ``websockets``
* ``cryptography``
* SQLite
* React
* Vite
* JavaScript
* HTML/CSS
* Web Crypto API
* AES-GCM
* RSA-PSS
* HTTPS
* WSS
