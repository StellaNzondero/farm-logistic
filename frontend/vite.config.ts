import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    // Allowedhost elatable-defection-trapeze.ngrok-free.dev
    allowedHosts: ["relatable-defection-trapeze.ngrok-free.dev"],
  }
});

