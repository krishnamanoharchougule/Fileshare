import React, { useState, useEffect } from "react";
import io from "socket.io-client";
import { QRCodeCanvas } from "qrcode.react";

const BACKEND_PORT = 3000; // Backend runs on port 3000
const FRONTEND_PORT = 3001; // Frontend runs on port 3001

function App() {
    const [file, setFile] = useState(null);
    const [receivedFiles, setReceivedFiles] = useState([]);
    const [url, setUrl] = useState("");
    const [socket, setSocket] = useState(null);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isUploading, setIsUploading] = useState(false);
    const [fileSize, setFileSize] = useState(null);
    const [serverAddress, setServerAddress] = useState("");

    useEffect(() => {
        // Fetch correct IP address from backend
        fetch(`http://${window.location.hostname}:${BACKEND_PORT}/get-ip`)
            .then((res) => res.json())
            .then((data) => {
                const localIP = data.ip;
                setUrl(`http://${localIP}:${FRONTEND_PORT}`);
                setServerAddress(`http://${localIP}:${BACKEND_PORT}`);

                // Establish socket connection
                const newSocket = io(`http://${localIP}:${BACKEND_PORT}`, {
                    transports: ["websocket", "polling"],
                });

                newSocket.on("receive-file", (fileData) => {
                    console.log("File received:", fileData);
                    // Add to the list of received files
                    setReceivedFiles(prev => [fileData, ...prev]);
                });

                newSocket.on("connect", () => {
                    console.log("Socket connected:", newSocket.id);
                });

                newSocket.on("connect_error", (error) => {
                    console.error("Connection error:", error);
                });

                setSocket(newSocket);
                return () => newSocket.disconnect();
            })
            .catch((err) => console.error("Error fetching IP:", err));
    }, []);

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
            setFile(selectedFile);
            setFileSize(formatFileSize(selectedFile.size));
            setUploadProgress(0);
        }
    };

    const formatFileSize = (bytes) => {
        if (bytes < 1024) return bytes + " bytes";
        else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
        else return (bytes / 1048576).toFixed(1) + " MB";
    };

    const sendFile = () => {
        if (!file) {
            alert("Please select a file first!");
            return;
        }

        setIsUploading(true);
        setUploadProgress(0);

        const reader = new FileReader();
        
        // Add progress tracking for the file read operation
        reader.onprogress = (event) => {
            if (event.lengthComputable) {
                const progress = Math.round((event.loaded / event.total) * 100);
                setUploadProgress(progress / 2); // Reading is first half of the process
                console.log(`Reading file: ${progress}%`);
            }
        };
        
        reader.readAsDataURL(file);
        
        reader.onload = () => {
            if (socket) {
                console.log("File read complete, starting upload:", file.name);
                setUploadProgress(50); // Reading complete, now starting upload
                
                // Start upload with acknowledgment
                socket.emit("send-file", {
                    name: file.name,
                    data: reader.result,
                    size: file.size,
                    type: file.type
                }, (response) => {
                    // This callback is triggered when server acknowledges receipt
                    console.log("Server response:", response);
                    
                    if (response && response.success) {
                        setUploadProgress(100);
                        setIsUploading(false);
                        console.log("Upload complete");
                    } else {
                        setUploadProgress(0);
                        setIsUploading(false);
                        alert("Upload failed: " + (response?.message || "Unknown error"));
                    }
                });
                
                // Since Socket.IO doesn't provide upload progress events,
                // simulate progress increase during upload
                let simulatedProgress = 50;
                const progressInterval = setInterval(() => {
                    simulatedProgress += Math.random() * 5;
                    if (simulatedProgress < 95) {
                        setUploadProgress(Math.round(simulatedProgress));
                    } else {
                        clearInterval(progressInterval);
                    }
                }, 200);
                
                // Set a timeout in case the server doesn't respond
                const timeoutId = setTimeout(() => {
                    if (isUploading) {
                        clearInterval(progressInterval);
                        setUploadProgress(0);
                        setIsUploading(false);
                        alert("Upload timed out. The file might be too large or the connection was lost.");
                    }
                }, 60000); // 1 minute timeout
                
                // Clear timeout when component unmounts
                return () => {
                    clearTimeout(timeoutId);
                    clearInterval(progressInterval);
                };
            }
        };
        
        reader.onerror = () => {
            console.error("Error reading file");
            setIsUploading(false);
            alert("Error reading file. Please try again.");
        };
    };

    // Progress bar component
    const ProgressBar = ({ progress, isActive }) => (
        <div style={{ marginTop: "15px", width: "100%", maxWidth: "400px", margin: "10px auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Progress: {progress}%</span>
                {isActive && <span>In progress...</span>}
            </div>
            <div style={{ 
                height: "20px", 
                backgroundColor: "#e0e0e0", 
                borderRadius: "10px",
                overflow: "hidden" 
            }}>
                <div style={{ 
                    width: `${progress}%`, 
                    height: "100%", 
                    backgroundColor: isActive ? "#007bff" : "#28a745",
                    transition: "width 0.3s ease-in-out"
                }}></div>
            </div>
        </div>
    );

    return (
        <div style={{ textAlign: "center", padding: "20px" }}>
            <h2>WiFi File Transfer</h2>
            {url && <QRCodeCanvas value={url} />}
            <p>Scan the QR code or enter <b>{url}</b> on your mobile browser.</p>
            
            <div style={{ margin: "20px 0" }}>
                <input type="file" onChange={handleFileChange} disabled={isUploading} />
                <button 
                    onClick={sendFile} 
                    style={{ marginLeft: "10px" }}
                    disabled={isUploading || !file}
                >
                    {isUploading ? "Sending..." : "Send File"}
                </button>
                
                {file && !isUploading && (
                    <div style={{ marginTop: "10px", fontSize: "14px" }}>
                        Selected file: <b>{file.name}</b> ({fileSize})
                    </div>
                )}
                
                {(uploadProgress > 0 || isUploading) && (
                    <ProgressBar 
                        progress={uploadProgress} 
                        isActive={isUploading} 
                    />
                )}
            </div>

            {receivedFiles.length > 0 && (
                <div style={{ marginTop: "20px" }}>
                    <h3>Received Files:</h3>
                    <div style={{ 
                        display: "flex", 
                        flexDirection: "column", 
                        alignItems: "center", 
                        gap: "10px" 
                    }}>
                        {receivedFiles.map((receivedFile, index) => (
                            <div key={index} style={{
                                border: "1px solid #ddd",
                                borderRadius: "5px",
                                padding: "10px",
                                width: "100%",
                                maxWidth: "400px"
                            }}>
                                <p style={{ margin: "5px 0" }}><b>{receivedFile.name}</b></p>
                                <a 
                                    href={`${serverAddress}${receivedFile.data}`} 
                                    download={receivedFile.name}
                                    style={{
                                        display: "inline-block",
                                        backgroundColor: "#4CAF50",
                                        color: "white",
                                        padding: "8px 12px",
                                        textDecoration: "none",
                                        borderRadius: "4px"
                                    }}
                                >
                                    Download
                                </a>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

export default App;