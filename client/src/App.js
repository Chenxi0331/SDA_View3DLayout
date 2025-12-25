import React, { useState, useEffect, useRef } from 'react';
import { LayoutRegistry, Layout3D } from './PrototypePattern';
import ThreeDViewer from './ThreeDViewer';

function App() {
    const [registry] = useState(new LayoutRegistry());
    const [sessionLayout, setSessionLayout] = useState(null);
    const [status, setStatus] = useState("Initializing...");
    const [isLoaded, setIsLoaded] = useState(false);

    // Init Master Registry ONCE via API
    useEffect(() => {
        const fetchLayout = async () => {
            try {
                setStatus("Fetching Master Layout from Backend...");
                const response = await fetch('http://localhost:5000/api/layout/layout-101');
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const data = await response.json();

                // Hydrate from JSON
                const master = Layout3D.fromJSON(data);

                setStatus("Downloading 3D Models (glb)...");
                await master.loadAssets();

                registry.registerMaster('layout-101', master);
                setStatus("Master Layout 'layout-101' FETCHED, MODELS LOADED, and REGISTERED.");
                setIsLoaded(true);
            } catch (err) {
                console.error("Failed to fetch layout:", err);
                setStatus(`Error loading master: ${err.message}`);
            } // End try
        };

        fetchLayout();
    }, [registry]);

    const handleCreateSession = () => {
        try {
            if (!isLoaded) {
                setStatus("Cannot create session: Master not loaded yet.");
                return;
            }
            // PROTOTYPE PATTERN: CLONE
            // We get a fresh deep copy.
            const newSession = registry.getSessionClone('layout-101');
            setSessionLayout(newSession);
            setStatus("New Session Created. (Independent Clone)");
        } catch (e) {
            console.error(e);
            setStatus("Error: " + e.message);
        }
    };

    const handleModifySession = () => {
        if (!sessionLayout) return;

        // Modify the session entity
        // Example: Move the first furniture in the first room
        if (sessionLayout.rooms.length > 0) {
            const room = sessionLayout.rooms[0];
            if (room.furnitureList.length > 0) {
                const furniture = room.furnitureList[0];

                // Random shift to prove movement
                const newX = (Math.random() * 10) - 5;
                const newZ = (Math.random() * 10) - 5;
                furniture.setPosition(newX, 0, newZ); // Update internal position

                // Force React update
                setSessionLayout({ ...sessionLayout, _version: Date.now() });

                setStatus(`Session Modified: Moved ${furniture.name} to (${newX.toFixed(1)}, 0, ${newZ.toFixed(1)})`);
            }
        }
    };

    return (
        <div style={{ padding: '20px', fontFamily: 'Arial' }}>
            <h1>Prototype Pattern 3D Viewer</h1>

            <div style={{ marginBottom: '20px' }}>
                <button
                    onClick={handleCreateSession}
                    disabled={!isLoaded}
                    style={{ padding: '10px', marginRight: '10px', cursor: isLoaded ? 'pointer' : 'not-allowed' }}
                >
                    1. Create New Session Clone
                </button>
                <button onClick={handleModifySession} disabled={!sessionLayout} style={{ padding: '10px' }}>
                    2. Modify Furniture Position (Session Only)
                </button>
            </div>

            <div style={{ padding: '10px', background: '#eee', marginBottom: '20px' }}>
                <strong>Status:</strong> {status} <br />
                {sessionLayout && (
                    <small>Session ID: {sessionLayout.group.userData.entityId} (IsMaster: {String(sessionLayout.group.userData.isMaster)})</small>
                )}
            </div>

            <ThreeDViewer layoutData={sessionLayout} />

            <div style={{ marginTop: '20px', color: '#666' }}>
                <p>Instructions:</p>
                <ol>
                    <li>Wait for "Master Layout REGISTERED".</li>
                    <li>Click "Create New Session Clone" to instantiate a deep copy of the Master.</li>
                    <li>You should see boxes representing furniture (from Database).</li>
                    <li>Click "Modify Furniture" to move the furniture randomly.</li>
                    <li>Click "Create New Session Clone" again to revert to the original Master state.</li>
                </ol>
            </div>
        </div>
    );
}

export default App;
