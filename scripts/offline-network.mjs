// Test-only preload: block non-loopback TCP connections in the child process.
// This is a rehearsal tool, not an operating-system network sandbox.
import net from "node:net";
const originalConnect = net.Socket.prototype.connect;
net.Socket.prototype.connect = function (...args) {
  const first = args[0];
  let host;
  if (typeof first === "object" && first !== null) {
    if (first.path) return originalConnect.apply(this, args);
    host = first.host ?? first.hostname ?? "localhost";
  } else {
    if (typeof first === "string" && !/^\d+$/.test(first)) return originalConnect.apply(this, args);
    host = typeof args[1] === "string" ? args[1] : "localhost";
  }
  if (!["localhost", "127.0.0.1", "::1", "[::1]"].includes(host)) {
    const error = new Error("External TCP connection blocked by offline rehearsal");
    error.code = "OFFLINE_BLOCKED";
    throw error;
  }
  return originalConnect.apply(this, args);
};
