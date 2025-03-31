const express = require("express");
const http = require("http");
const cors = require("cors");
const socketIo = require("socket.io");
const os = require("os");
const path = require("path");
const fs = require("fs");

const app = express();
const server = http.createServer(app);
<<<<<<< HEAD

const PORT = process.env.PORT || 3000; // ✅ Use Railway-assigned port

// Create uploads directory (⚠️ Note: Railway resets local storage on restart)
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure Socket.IO
const io = socketIo(server, {
    cors: { origin: "*" },
    maxHttpBufferSize: 100 * 1024 * 1024, // 100MB limit
    pingTimeout: 120000, // 2 min timeout
});
=======
>>>>>>> f823fb5 (Updated backend start script for Railway)

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
<<<<<<< HEAD
app.use(express.json({ limit: "100mb" }));
app.use(express.urlencoded({ extended: true, limit: "100mb" }));
=======
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));
>>>>>>> f823fb5 (Updated backend start script for Railway)

// Serve uploaded files (⚠️ Use Cloud Storage in production)
app.use("/uploads", express.static(uploadsDir));

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
<<<<<<< HEAD
            if (!matches || matches.length !== 3) {
                return reject(new Error("Invalid data URL format"));
            }

            const base64Data = matches[2];
            const buffer = Buffer.from(base64Data, "base64");

            // Create a unique filename
            const uniqueFileName = `${Date.now()}-${fileName}`;
            const filePath = path.join(uploadsDir, uniqueFileName);

=======
            
            if (!matches || matches.length !== 3) {
                return reject(new Error('Invalid data URL format'));
            }
            
            const base64Data = matches[2];
            const buffer = Buffer.from(base64Data, 'base64');
            
            // Create a unique filename to avoid overwrites
            const uniqueFileName = `${Date.now()}-${fileName}`;
            const filePath = path.join(uploadsDir, uniqueFileName);
            
>>>>>>> f823fb5 (Updated backend start script for Railway)
            fs.writeFile(filePath, buffer, (err) => {
                if (err) return reject(err);
                resolve({
                    originalName: fileName,
                    savedAs: uniqueFileName,
                    path: filePath,
<<<<<<< HEAD
                    url: `/uploads/${uniqueFileName}`,
                    fullUrl: `${process.env.BASE_URL || "http://localhost:3000"}/uploads/${uniqueFileName}`, // ✅ Updated URL for hosted server
=======
                    url: `/uploads/${uniqueFileName}`
>>>>>>> f823fb5 (Updated backend start script for Railway)
                });
            });
        } catch (error) {
            reject(error);
        }
    });
};

io.on("connection", (socket) => {
    console.log("User connected:", socket.id);
<<<<<<< HEAD

    socket.on("send-file", async (fileData, callback) => {
        console.log(`Receiving file: ${fileData.name}, processing...`);

        try {
            const savedFile = await saveFile(fileData.name, fileData.data);
            console.log(`File saved: ${savedFile.originalName} as ${savedFile.savedAs}`);

            // Send file URL instead of local path
            socket.broadcast.emit("receive-file", {
                name: fileData.name,
                data: savedFile.fullUrl, // ✅ Updated to use absolute URL
                size: fileData.data.length,
                timestamp: Date.now(),
            });

            if (callback && typeof callback === "function") {
                callback({ success: true, message: "File successfully received and processed" });
            }
        } catch (error) {
            console.error("Error processing file:", error);
            if (callback && typeof callback === "function") {
                callback({ success: false, message: "Error processing file" });
=======
    
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
>>>>>>> f823fb5 (Updated backend start script for Railway)
            }
        }
    });
    
    socket.on("disconnect", () => {
        console.log("User disconnected:", socket.id);
    });
});

<<<<<<< HEAD
// ✅ Use 0.0.0.0 for Railway Deployment
server.listen(PORT, "0.0.0.0", () => console.log(`✅ Server running on http://0.0.0.0:${PORT}`));
=======
// Use 0.0.0.0 to allow external devices to connect
server.listen(3000, "0.0.0.0", () => console.log(`✅ Server running on http://${getLocalIP()}:3000`));
>>>>>>> f823fb5 (Updated backend start script for Railway)
