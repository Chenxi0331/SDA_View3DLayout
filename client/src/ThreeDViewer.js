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
        // Limit controls to avoid going below ground
        controls.maxPolarAngle = Math.PI / 2 - 0.1;
        controlsRef.current = controls;

        // --- Environment ---
        // Floor with Wood Texture
        const textureLoader = new THREE.TextureLoader();
        // Assuming file exists in public/wooden_table_02_4k.blend/textures/... 
        // Note: The path structure in public seems to be a raw copy of files.
        const woodTexture = textureLoader.load('/wooden_table_02_4k.blend/textures/wooden_table_02_diff_4k.jpg',
            (texture) => {
                texture.wrapS = THREE.RepeatWrapping;
                texture.wrapT = THREE.RepeatWrapping;
                texture.repeat.set(10, 10);
                texture.colorSpace = THREE.SRGBColorSpace;
                console.log("Floor texture loaded");
            },
            undefined,
            (err) => console.error("Error loading floor texture", err)
        );

        const floorGeometry = new THREE.PlaneGeometry(100, 100);
        const floorMaterial = new THREE.MeshStandardMaterial({
            map: woodTexture,
            roughness: 0.8,
            metalness: 0.1,
            color: 0xffffff // Modify tint if needed
        });

        const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        scene.add(floor);

        const gridHelper = new THREE.GridHelper(100, 50, 0xcccccc, 0xeeeeee);
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
        dirLight.shadow.mapSize.width = 1024;
        dirLight.shadow.mapSize.height = 1024;
        dirLight.shadow.bias = -0.0001; // Reduce shadow artifacts
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

            // Clean up scene
            scene.traverse((object) => {
                if (object.geometry) object.geometry.dispose();
                if (object.material) {
                    if (Array.isArray(object.material)) {
                        object.material.forEach(m => m.dispose());
                    } else {
                        object.material.dispose();
                    }
                }
            });
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

                // Generic Three.js deep clean for this subtree
                child.traverse((node) => {
                    if (node.isMesh) {
                        if (node.geometry) node.geometry.dispose();
                        if (node.material) {
                            if (Array.isArray(node.material)) {
                                node.material.forEach(m => m.dispose());
                            } else {
                                node.material.dispose();
                            }
                        }
                    }
                });
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

    }, [layoutData]);

    return <div ref={mountRef} style={{ width: '100%', height: '600px', border: '1px solid #ccc', borderRadius: '8px', overflow: 'hidden' }} />;
};

export default ThreeDViewer;
