import React, { useState, useEffect } from "react";
import io from "socket.io-client";
import { QRCodeCanvas } from "qrcode.react";

const BACKEND_PORT = 3000; // Backend runs on port 3000
const FRONTEND_PORT = 3001; // Frontend runs on port 3001

function App() {
    const [file, setFile] = useState(null);
    const [receivedFile, setReceivedFile] = useState(null);
    const [url, setUrl] = useState("");
    const [socket, setSocket] = useState(null);
    
    useEffect(() => {
        // Fetch correct IP address from backend
        fetch(`http://${window.location.hostname}:${BACKEND_PORT}/get-ip`)
            .then((res) => res.json())
            .then((data) => {
                const localIP = data.ip;
                setUrl(`http://${localIP}:${FRONTEND_PORT}`);

                // Establish socket connection
                const newSocket = io(`http://${localIP}:${BACKEND_PORT}`, {
                    transports: ["websocket", "polling"],
                });

                newSocket.on("receive-file", (fileData) => {
                    console.log("File received:", fileData.name);
                    setReceivedFile(fileData);
                });

                setSocket(newSocket);
                return () => newSocket.disconnect();
            })
            .catch((err) => console.error("Error fetching IP:", err));
    }, []);

    const handleFileChange = (e) => {
        setFile(e.target.files[0]);
    };

    const sendFile = () => {
        if (!file) {
            alert("Please select a file first!");
            return;
        }

        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            if (socket) {
                console.log("Sending file:", file.name);
                socket.emit("send-file", {
                    name: file.name,
                    data: reader.result,
                });
            }
        };
    };

    return (
        <div style={{ textAlign: "center", padding: "20px" }}>
            <h2>WiFi File Transfer</h2>
            {url && <QRCodeCanvas value={url} />}
            <p>Scan the QR code or enter <b>{url}</b> on your mobile browser.</p>
            <input type="file" onChange={handleFileChange} />
            <button onClick={sendFile} style={{ marginLeft: "10px" }}>Send File</button>

            {receivedFile && (
                <div style={{ marginTop: "20px" }}>
                    <h3>Received File:</h3>
                    <a href={receivedFile.data} download={receivedFile.name}>
                        Download {receivedFile.name}
                    </a>
                </div>
            )}
        </div>
    );
}

export default App;
