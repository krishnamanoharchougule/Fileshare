const express = require("express");
const http = require("http");
const cors = require("cors");
const socketIo = require("socket.io");
const os = require("os");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: "*" } });

app.use(cors());
app.use(express.json());

// Serve React build files if needed
app.use(express.static(path.join(__dirname, "../frontend/build")));

// Function to get local IP address dynamically
const getLocalIP = () => {
    const interfaces = os.networkInterfaces();
    for (let iface in interfaces) {
        for (let config of interfaces[iface]) {
            if (config.family === "IPv4" && !config.internal) {
                return config.address;
            }
        }
    }
    return "localhost"; // Fallback if no IP found
};

// Endpoint to send local IP to frontend
app.get("/get-ip", (req, res) => {
    res.json({ ip: getLocalIP() });
});

io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("send-file", (fileData) => {
        console.log("Received file:", fileData.name);
        socket.broadcast.emit("receive-file", fileData);
    });

    socket.on("disconnect", () => {
        console.log("User disconnected:", socket.id);
    });
});

// Use 0.0.0.0 to allow external devices to connect
server.listen(3000, "0.0.0.0", () => console.log(`✅ Server running on http://${getLocalIP()}:3000`));
