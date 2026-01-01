import React, { useState, useEffect } from 'react';
import './index.css';
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
                setStatus("Error: Backend Server is Offline. Please run 'start-app.bat' or start the server manually.");
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
        <div id="app">
            <div className="ui-overlay">
                <h1>Property Layout 3D</h1>

                <div className="controls">
                    <div>
                        <div className="section-label">Select Room</div>
                        <div className="button-group">
                            <button
                                className={currentRoomId === 'living-room' ? 'active' : ''}
                                onClick={() => handleRoomSelect('living-room', 'Simple Room')}
                            >
                                <span>Simple Room</span>
                                {currentRoomId === 'living-room' && <span>●</span>}
                            </button>
                            <button
                                className={currentRoomId === 'deluxe-room' ? 'active' : ''}
                                onClick={() => handleRoomSelect('deluxe-room', 'Deluxe Room')}
                            >
                                <span>Deluxe Room</span>
                                {currentRoomId === 'deluxe-room' && <span>●</span>}
                            </button>
                        </div>
                    </div>

                    {sessionLayout && (
                        <div style={{ marginTop: '20px' }}>
                            <div className="section-label">Actions</div>
                            <div className="button-group">
                                <button className="secondary" onClick={handleCreateSession}>
                                    ⟳ Reset Session
                                </button>
                                <button className="secondary" onClick={handleModifySession}>
                                    ✥ Move Furniture
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                <div className="status-bar">
                    <div style={{ color: error ? '#ff6b6b' : '#00d2ff', marginBottom: '5px' }}>
                        {status}
                    </div>
                    {sessionLayout && (
                        <div style={{ fontSize: '0.7em', opacity: 0.5 }}>
                            UUID: {sessionLayout.group.userData.entityId} <br />
                            Type: {sessionLayout.group.userData.isMaster ? 'MASTER' : 'SESSION'}
                        </div>
                    )}
                </div>
            </div>

            <div className="viewer-container">
                {sessionLayout ? (
                    <ThreeDViewer layoutData={sessionLayout} />
                ) : (
                    <div style={{
                        height: '100vh',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#666',
                        background: '#1a1a1a',
                        flexDirection: 'column',
                        textAlign: 'center',
                        padding: '20px'
                    }}>
                        <h2>{error ? "Error Loading Layout" : "Select a Room"}</h2>
                        {error && <p style={{ color: '#ff6b6b', marginTop: '10px' }}>{error}</p>}
                    </div>
                )}
            </div>
        </div>
    );
}
export default App;
