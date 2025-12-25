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
        scene.background = new THREE.Color(0xf0f0f0); // Soft grey background
        // scene.fog = new THREE.Fog(0xf0f0f0, 20, 100); 
        sceneRef.current = scene;

        const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
        camera.position.set(0, 20, 30);
        camera.lookAt(0, 0, 0);

        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(width, height);
        renderer.shadowMap.enabled = true; // Enable Shadows
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.outputColorSpace = THREE.SRGBColorSpace; // Correct colors
        mountRef.current.appendChild(renderer.domElement);
        rendererRef.current = renderer;

        // --- Controls ---
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controlsRef.current = controls;

        // --- Environment ---
        // Floor
        const floorGeometry = new THREE.PlaneGeometry(100, 100);
        const floorMaterial = new THREE.MeshStandardMaterial({
            color: 0xeeeeee,
            roughness: 0.8,
            metalness: 0.2
        });
        const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        scene.add(floor);

        const gridHelper = new THREE.GridHelper(100, 50, 0xcccccc, 0xeeeeee);
        scene.add(gridHelper);

        // --- Lighting ---
        const ambientLight = new THREE.AmbientLight(0xffffff, 1.5); // Soft white light
        scene.add(ambientLight);

        const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1.5);
        hemiLight.position.set(0, 20, 0);
        scene.add(hemiLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, 3);
        dirLight.position.set(10, 20, 10);
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.width = 2048;
        dirLight.shadow.mapSize.height = 2048;
        dirLight.shadow.camera.near = 0.5;
        dirLight.shadow.camera.far = 50;
        dirLight.shadow.camera.left = -25;
        dirLight.shadow.camera.right = 25;
        dirLight.shadow.camera.top = 25;
        dirLight.shadow.camera.bottom = -25;
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
                scene.remove(child);
            }
        }

        // Add New Layout
        const rootGroup = layoutData.group;
        scene.add(rootGroup);

        console.log("Adding layout to scene:", layoutData);

        // --- Initial Transform for loaded models ---
        // Some models might be huge or tiny, typically we don't auto-scale here 
        // because we want real dimensions, but for this demo check:
        // (We rely on the data in layout.json to set scale)

    }, [layoutData]);

    return <div ref={mountRef} style={{ width: '100%', height: '600px', border: '1px solid #ccc', borderRadius: '8px', overflow: 'hidden' }} />;
};

export default ThreeDViewer;
