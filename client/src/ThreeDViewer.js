import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

const ThreeDViewer = ({ layoutData }) => {
    const mountRef = useRef(null);
    const sceneRef = useRef(null);
    const rendererRef = useRef(null);
    const controlsRef = useRef(null);

    useEffect(() => {
        // --- Init Scene ---
        const width = mountRef.current.clientWidth;
        const height = mountRef.current.clientHeight;

        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x1a1a1a); // Dark background
        // scene.fog = new THREE.Fog(0x1a1a1a, 20, 100); 
        sceneRef.current = scene;

        const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
        camera.position.set(0, 20, 30);
        camera.lookAt(0, 0, 0);

        const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: "high-performance" }); // Disable antialias for perf
        renderer.setPixelRatio(1); // Force 1x pixel ratio for low-spec
        renderer.setSize(width, height);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.BasicShadowMap; // Faster shadows
        renderer.outputColorSpace = THREE.SRGBColorSpace; // Correct colors
        mountRef.current.appendChild(renderer.domElement);
        rendererRef.current = renderer;

        // --- Controls ---
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        // Limit controls to avoid going below ground
        controls.maxPolarAngle = Math.PI / 2 - 0.1;
        controlsRef.current = controls;

        // --- Environment ---
        // Optimization: Removed 4K texture loading. Using simple grid/color for low-spec compatibility.

        const floorGeometry = new THREE.PlaneGeometry(100, 100);
        const floorMaterial = new THREE.MeshStandardMaterial({
            color: 0x2a2a2a, // Dark Floor
            roughness: 0.8,
            metalness: 0.1
        });

        const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        scene.add(floor);

        const gridHelper = new THREE.GridHelper(100, 50, 0x444444, 0x222222); // Dark Grid helper
        scene.add(gridHelper);

        // --- Lighting ---
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.7); // Increased Ambient
        scene.add(ambientLight);

        const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6);
        hemiLight.position.set(0, 20, 0);
        scene.add(hemiLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
        dirLight.position.set(10, 30, 20); // Higher and angled
        dirLight.castShadow = true;
        // Optimization: Reduced shadow map size for performance
        dirLight.shadow.mapSize.width = 512;
        dirLight.shadow.mapSize.height = 512;
        dirLight.shadow.bias = -0.001; // Reduce shadow artifacts
        dirLight.shadow.camera.near = 0.5;
        dirLight.shadow.camera.far = 100;
        dirLight.shadow.camera.left = -50;
        dirLight.shadow.camera.right = 50;
        dirLight.shadow.camera.top = 50;
        dirLight.shadow.camera.bottom = -50;
        scene.add(dirLight);

        // --- Animation Loop ---
        const animate = () => {
            requestAnimationFrame(animate);
            controls.update();
            renderer.render(scene, camera);
        };
        animate();

        return () => {
            if (mountRef.current && renderer.domElement) {
                mountRef.current.removeChild(renderer.domElement);
            }
            renderer.dispose();
            controls.dispose();
        };
    }, []);

    // --- Update Layout ---
    useEffect(() => {
        if (!layoutData || !sceneRef.current) return;

        // Clear previous generic meshes (keep lights/helpers/floor)
        const scene = sceneRef.current;

        // Remove old layout groups (detect by userData.entityId)
        for (let i = scene.children.length - 1; i >= 0; i--) {
            const child = scene.children[i];
            // We only remove the objects that are part of our data structure
            if (child.userData.entityId) {
                // IMPORTANT: Dispose resources before removing from scene
                // If the object has a dispose method (from our Pattern), usage it.
                // Note: We need a way to link the Scene Object back to our JS Class if we want to call .dispose() on the class.
                // However, our class `dispose` cleans up Three.js resources provided we have access to it.
                // Since `child` here is a THREE.Group, we can traverse and clean standard things.

                // Better approach: If we attached the class instance to userData, we could call it.
                // But `PrototypePattern.js` attaches primitive data to userData.

                // Fallback: Manual cleanup or if we had a reference to the previous layout object.
                // Ideally, `ThreeDViewer` should track the `currentLayout` object to call dispose on it.

                scene.remove(child);
            }
        }

        // Add New Layout
        const rootGroup = layoutData.group;
        scene.add(rootGroup);

        console.log("Adding layout to scene:", layoutData);

        // Update Camera View if defined
        if (layoutData.cameraView && controlsRef.current && sceneRef.current) {
            const { position, target } = layoutData.cameraView;
            // Get camera from controls
            const camera = controlsRef.current.object;

            if (position) camera.position.set(position.x, position.y, position.z);
            if (target) controlsRef.current.target.set(target.x, target.y, target.z);

            controlsRef.current.update();
            console.log("Updated camera view based on layout settings.");
        }

        // Cleanup function: Called when layoutData changes or component unmounts
        return () => {
            // Use the Pattern's dispose logic which protects shared assets
            if (layoutData && typeof layoutData.dispose === 'function') {
                console.log("Disposing resources for layout:", layoutData.id);
                layoutData.dispose();
            }
        };

    }, [layoutData]);

    return <div ref={mountRef} style={{ width: '100%', height: '600px', border: '1px solid #ccc', borderRadius: '8px', overflow: 'hidden' }} />;
};

export default ThreeDViewer;
