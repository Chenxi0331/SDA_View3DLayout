import React, { useState, useEffect } from 'react';
import { LayoutRegistry, Layout3D } from './PrototypePattern';
import ThreeDViewer from './ThreeDViewer';

function App() {
    const [registry] = useState(new LayoutRegistry());
    const [sessionLayout, setSessionLayout] = useState(null);
    const [currentRoomId, setCurrentRoomId] = useState(null);
    const [status, setStatus] = useState("Select a room to view 3D Layout");
    const [error, setError] = useState(null);

    // Function to handle Room Selection
    const handleRoomSelect = async (roomId, roomName) => {
        if (currentRoomId === roomId && sessionLayout) return; // Already loaded

        try {
            setSessionLayout(null);
            setCurrentRoomId(roomId);
            setError(null);
            setStatus(`Loading ${roomName}...`);

            // 1. Fetch Master Layout
            const response = await fetch(`http://localhost:5000/api/layout/${roomId}`);

            // AF1: 404 Handling
            if (response.status === 404) {
                throw new Error("Layout not found (404)");
            }

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (!data || Object.keys(data).length === 0) {
                throw new Error("Layout Empty");
            }

            // 2. Hydrate Master
            const master = Layout3D.fromJSON(data);

            setStatus(`Downloading 3D Models for ${roomName}...`);

            // EF1: Loading Error Handling
            try {
                await master.loadAssets();
            } catch (assetErr) {
                console.warn("Some assets failed to load", assetErr);
                setStatus("Warning: Some furniture models failed to load.");
            }

            // 3. Register & Clone
            registry.registerMaster(roomId, master);
            const session = registry.getSessionClone(roomId);

            setSessionLayout(session);
            setStatus(`Showing 3D Layout for: ${roomName}`);

        } catch (err) {
            console.error("Room load error:", err);
            setError(err.message);
            // AF1 & EF1 UI Feedback
            if (err.message.includes("404") || err.message.includes("Empty")) {
                setStatus(`Status: No 3D layout available for ${roomName}.`);
            } else {
                setStatus("Error loading 3D layout. Please retry or contact support.");
            }
        }
    };

    const handleCreateSession = () => {
        // Re-clone existing master if currentRoomId is set
        if (currentRoomId) {
            try {
                const session = registry.getSessionClone(currentRoomId);
                setSessionLayout(session);
                setStatus("Session Reset (New Clone Created).");
            } catch (e) {
                console.error(e);
            }
        }
    };

    const handleModifySession = () => {
        if (!sessionLayout) return;
        if (sessionLayout.rooms.length > 0) {
            const room = sessionLayout.rooms[0];
            if (room.furnitureList.length > 0) {
                const furniture = room.furnitureList[0];
                const newX = (Math.random() * 5) - 2.5;
                const newZ = (Math.random() * 5) - 2.5;
                furniture.setPosition(newX, 0, newZ);
                setSessionLayout({ ...sessionLayout, _version: Date.now() });
                setStatus(`Moved ${furniture.name} to (${newX.toFixed(1)}, 0, ${newZ.toFixed(1)})`);
            }
        }
    };

    // Auto-load Living Room on Mount
    useEffect(() => {
        handleRoomSelect('living-room', 'Living Room');
    }, []); // Run once on mount

    return (
        <div style={{ padding: '20px', fontFamily: 'Arial' }}>
            <h1>Realistic 3D Property Layout</h1>

            {/* Room Selection Tabs */}
            <div style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
                <button
                    onClick={() => handleRoomSelect('living-room', 'Simple Room')}
                    style={{ padding: '10px 20px', fontWeight: 'bold', background: currentRoomId === 'living-room' ? '#ddd' : '#f9f9f9', cursor: 'pointer' }}
                >
                    Simple Room
                </button>
                <button
                    onClick={() => handleRoomSelect('deluxe-room', 'Deluxe Room')}
                    style={{ padding: '10px 20px', fontWeight: 'bold', background: currentRoomId === 'deluxe-room' ? '#ddd' : '#f9f9f9', cursor: 'pointer' }}
                >
                    Deluxe Room
                </button>
            </div>

            {/* Controls */}
            <div style={{ marginBottom: '10px', display: sessionLayout ? 'block' : 'none' }}>
                <button onClick={handleCreateSession} style={{ padding: '8px', marginRight: '10px' }}>
                    Reset Layout (Re-Clone)
                </button>
                <button onClick={handleModifySession} style={{ padding: '8px' }}>
                    Modify Furniture (Session)
                </button>
            </div>

            {/* Status Bar */}
            <div style={{ padding: '10px', background: error ? '#ffe6e6' : '#e6ffe6', marginBottom: '20px', border: error ? '1px solid red' : '1px solid green', borderRadius: '4px' }}>
                <strong>Status:</strong> {status} <br />
                {sessionLayout && (
                    <small>Session ID: {sessionLayout.group.userData.entityId} (IsMaster: {String(sessionLayout.group.userData.isMaster)})</small>
                )}
            </div>

            {/* Viewer */}
            <div style={{ border: '1px solid #ccc', borderRadius: '8px', overflow: 'hidden', minHeight: '600px', background: '#f5f5f5' }}>
                {sessionLayout ? (
                    <ThreeDViewer layoutData={sessionLayout} />
                ) : (
                    <div style={{ height: '600px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999', fontSize: '1.2em' }}>
                        {error ? "No Layout to Display" : "Select a room above to preview 3D model"}
                    </div>
                )}
            </div>

            <div style={{ marginTop: '20px', color: '#666', fontSize: '0.9em' }}>
                <p><strong>Prototype Pattern Demo:</strong></p>
                <ul>
                    <li>Switching rooms fetches a "Master" layout from the server (Mock).</li>
                    <li>The Viewer displays a "Session Clone" of that master.</li>
                    <li>You can interact with furniture without affecting the Master.</li>
                </ul>
            </div>
        </div>
    );
}
export default App;
