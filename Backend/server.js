const express = require("express");
const http = require("http");
const cors = require("cors");
const socketIo = require("socket.io");
const os = require("os");
const path = require("path");
const fs = require("fs");

const app = express();
const server = http.createServer(app);

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure Socket.IO with increased buffer size
const io = socketIo(server, {
    cors: { origin: "*" },
    maxHttpBufferSize: 100 * 1024 * 1024,  // Increase to 100MB
    pingTimeout: 120000  // Increase ping timeout to 120 seconds
});

// Configure Express with increased limits
app.use(cors());
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// Serve React build files if needed
app.use(express.static(path.join(__dirname, "../frontend/build")));

// Serve uploaded files
app.use('/uploads', express.static(uploadsDir));

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

// Function to save base64 data to a file
const saveFile = (fileName, dataString) => {
    return new Promise((resolve, reject) => {
        try {
            // Extract actual base64 data from the dataURL
            const matches = dataString.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
            
            if (!matches || matches.length !== 3) {
                return reject(new Error('Invalid data URL format'));
            }
            
            const base64Data = matches[2];
            const buffer = Buffer.from(base64Data, 'base64');
            
            // Create a unique filename to avoid overwrites
            const uniqueFileName = `${Date.now()}-${fileName}`;
            const filePath = path.join(uploadsDir, uniqueFileName);
            
            fs.writeFile(filePath, buffer, (err) => {
                if (err) return reject(err);
                resolve({
                    originalName: fileName,
                    savedAs: uniqueFileName,
                    path: filePath,
                    url: `/uploads/${uniqueFileName}`
                });
            });
        } catch (error) {
            reject(error);
        }
    });
};

io.on("connection", (socket) => {
    console.log("User connected:", socket.id);
    
    socket.on("send-file", async (fileData, callback) => {
        console.log(`Receiving file: ${fileData.name}, processing...`);
        
        try {
            // Save the file to disk
            const savedFile = await saveFile(fileData.name, fileData.data);
            console.log(`File saved: ${savedFile.originalName} as ${savedFile.savedAs}`);
            
            // Send file information to other connected clients
            socket.broadcast.emit("receive-file", {
                name: fileData.name,
                data: savedFile.url,  // Send URL instead of raw data
                size: fileData.data.length,
                timestamp: Date.now()
            });
            
            // Acknowledge successful receipt
            if (callback && typeof callback === 'function') {
                callback({ 
                    success: true, 
                    message: "File successfully received and processed" 
                });
            }
        } catch (error) {
            console.error("Error processing file:", error);
            
            // Send error to client if callback exists
            if (callback && typeof callback === 'function') {
                callback({ 
                    success: false, 
                    message: "Error processing file" 
                });
            }
        }
    });
    
    socket.on("disconnect", () => {
        console.log("User disconnected:", socket.id);
    });
});

// Use 0.0.0.0 to allow external devices to connect
server.listen(3000, "0.0.0.0", () => console.log(`✅ Server running on http://${getLocalIP()}:3000`));