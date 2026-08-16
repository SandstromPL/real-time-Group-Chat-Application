import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from "fs";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],

  server: {
    host: "0.0.0.0",
    port: 6000,

    https: {
      key: fs.readFileSync("/home/student/chat-ssl/key.pem"),
      cert: fs.readFileSync("/home/student/chat-ssl/cert.pem"),
    },
  },
});
