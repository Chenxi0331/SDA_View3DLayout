/**
 * 3D Real Estate Management System - Prototype Pattern Implementation
 * Definition of Prototype Interface and Entities
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils';

/**
 * Interface Component acting as the Prototype
 * All entities must implement a clone() method.
 */

class Wall {
    // Static resources to be shared across all Wall instances
    static geometry = null;
    static material = null;

    constructor(width, height, depth) {
        this.width = width;
        this.height = height;
        this.depth = depth;

        // Initialize shared resources if they don't exist
        if (!Wall.geometry) {
            // Create a unit cube that we can scale
            Wall.geometry = new THREE.BoxGeometry(1, 1, 1);
        }
        if (!Wall.material) {
            Wall.material = new THREE.MeshStandardMaterial({
                color: 0xf5f5f5, // Off-white
                roughness: 0.8,
                side: THREE.DoubleSide
            });
        }

        // Use shared geometry/material
        this.mesh = new THREE.Mesh(Wall.geometry, Wall.material);
        this.mesh.scale.set(width, height, depth); // Scale to dimensions
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;
        this.mesh.userData = { entityId: this.generateId(), type: 'Wall' };
    }

    generateId() {
        return Math.random().toString(36).substr(2, 9);
    }

    setPosition(x, y, z) {
        this.mesh.position.set(x, y, z);
    }

    clone() {
        const clonedWall = new Wall(this.width, this.height, this.depth);
        clonedWall.mesh.position.copy(this.mesh.position);
        clonedWall.mesh.rotation.copy(this.mesh.rotation);
        clonedWall.mesh.userData.entityId = this.generateId();
        return clonedWall;
    }

    dispose() {
        // We do NOT dispose static geometry/material here as they are shared.
        // Only dispose if we created unique materials per instance (not the case here yet).
    }
}

class Furniture {
    // Shared placeholder resources
    static placeholderGeometry = null;
    static placeholderMaterial = null;

    constructor(name, type, modelUrl = null) {
        this.name = name;
        this.type = type;
        this.modelUrl = modelUrl;

        // Init Shared Placeholder Resources
        if (!Furniture.placeholderGeometry) {
            Furniture.placeholderGeometry = new THREE.BoxGeometry(2, 2, 2);
        }
        if (!Furniture.placeholderMaterial) {
            Furniture.placeholderMaterial = new THREE.MeshStandardMaterial({ color: 0x888888 });
        }

        // Default Mesh (Box) until model is loaded
        this.mesh = new THREE.Mesh(Furniture.placeholderGeometry, Furniture.placeholderMaterial);
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;
        this.mesh.userData = { entityId: this.generateId(), type: 'Furniture', name: name };

        this.root = new THREE.Group();
        this.root.add(this.mesh); // Add placeholder initially
        this.root.userData = { entityId: this.generateId(), type: 'Furniture', name: name };
    }

    generateId() {
        return Math.random().toString(36).substr(2, 9);
    }

    setPosition(x, y, z) {
        this.root.position.set(x, y, z);
    }

    setScale(x, y, z) {
        this.root.scale.set(x, y, z);
    }

    setRotation(x, y, z) {
        this.root.rotation.set(x, y, z);
    }

    /**
     * Async Load Model
     */
    async loadModel(loader) {
        if (!this.modelUrl) return;

        try {
            const gltf = await loader.loadAsync(this.modelUrl);
            const model = gltf.scene;

            // Enable shadows
            model.traverse((node) => {
                if (node.isMesh) {
                    node.castShadow = true;
                    node.receiveShadow = true;
                }
            });

            // --- NORMALIZATION START ---
            // Auto-Center and normalize scale to fit in a 1x1x1 box roughly, then apply this.scale.
            // This prevents giant models from "exploding" the view.

            const box = new THREE.Box3().setFromObject(model);
            const size = new THREE.Vector3();
            box.getSize(size);
            const center = new THREE.Vector3();
            box.getCenter(center);

            // Center the model geometry
            model.position.sub(center);
            // Important: we shift the internal model, so the parent 'root' position is still valid.

            // Optional: Auto-scale if model is huge or tiny
            // Let's normalize it so the largest dimension is approx 1 unit, 
            // then we rely on this.root.scale to size it up to real-world meters.
            // However, our JSON scale is roughly "meters" if the base is 1.
            // Most GLTF models are in meters, but some are millimeters or arbitrary.

            // Heuristic: If largest dim > 10, it's probably wrong scale (mm), or huge building.
            // If < 0.1, it's probably too small.
            // For safety in this demo, let's normalize base to max dim = 1.

            const maxDim = Math.max(size.x, size.y, size.z);
            if (maxDim > 0) {
                const scaleFactor = 1.0 / maxDim;
                model.scale.multiplyScalar(scaleFactor);
            }

            // --- NORMALIZATION END ---

            // Replace placeholder with real model
            this.root.remove(this.mesh);
            this.root.add(model);
            this.mesh = model;

            console.log(`Loaded and normalized model for ${this.name}`);
        } catch (err) {
            console.error(`Failed to load model for ${this.name}`, err);
        }
    }

    /**
     * Factory method to create instance from JSON data
     */
    static fromJSON(data) {
        const furniture = new Furniture(data.name, data.type, data.modelUrl);
        if (data.position) furniture.setPosition(data.position.x, data.position.y, data.position.z);
        if (data.rotation) furniture.setRotation(data.rotation.x, data.rotation.y, data.rotation.z);
        if (data.scale) furniture.setScale(data.scale.x, data.scale.y, data.scale.z);
        return furniture;
    }

    /**
     * Deep Clone
     */
    clone() {
        // Create new instance with same metadata
        const clonedFurniture = new Furniture(this.name, this.type, this.modelUrl);

        // Deep Clone the visual root using SkeletonUtils for GLTF support
        const clonedRoot = SkeletonUtils.clone(this.root);

        clonedFurniture.root = clonedRoot;

        // IMPORTANT: Update unique ID
        clonedFurniture.root.userData.entityId = this.generateId();
        clonedFurniture.root.userData.type = 'Furniture';
        clonedFurniture.root.userData.name = this.name;

        return clonedFurniture;
    }

    dispose() {
        // If the mesh is NOT the shared placeholder, it's a loaded model -> dipose it
        if (this.mesh && this.mesh !== Furniture.placeholderGeometry && this.modelUrl) {
            this.mesh.traverse((node) => {
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
}

class Room {
    constructor(name, width = 20, depth = 20) {
        this.name = name;
        this.width = width;
        this.depth = depth;
        this.furnitureList = [];
        this.walls = [];
        this.group = new THREE.Group();
        this.group.userData = { entityId: this.generateId(), type: 'Room', name: name };

        // Generate Walls automatically
        this.generateWalls();
    }

    generateId() {
        return Math.random().toString(36).substr(2, 9);
    }

    generateWalls() {
        const h = 3.5; // Wall Height (Increased slightly from 2.5 as requested)
        const t = 0.5; // Wall Thickness

        // Remove old walls if any
        this.walls.forEach(w => this.group.remove(w.mesh));
        this.walls = [];

        // 1. Back Wall
        const back = new Wall(this.width, h, t);
        back.setPosition(0, h / 2, -this.depth / 2);
        this.addWall(back);

        // 2. Front Wall
        const front = new Wall(this.width, h, t);
        front.setPosition(0, h / 2, this.depth / 2);
        this.addWall(front);

        // 3. Left Wall
        const left = new Wall(t, h, this.depth);
        left.setPosition(-this.width / 2, h / 2, 0);
        this.addWall(left);

        // 4. Right Wall
        const right = new Wall(t, h, this.depth);
        right.setPosition(this.width / 2, h / 2, 0);
        this.addWall(right);
    }

    addWall(wall) {
        this.walls.push(wall);
        this.group.add(wall.mesh);
    }

    addFurniture(furniture) {
        this.furnitureList.push(furniture);
        this.group.add(furniture.root);
    }

    /**
     * Factory method to create instance from JSON data
     */
    static fromJSON(data) {
        const room = new Room(data.name, data.width, data.depth);
        if (data.furniture) {
            data.furniture.forEach(itemData => {
                const furniture = Furniture.fromJSON(itemData);
                room.addFurniture(furniture);
            });
        }
        return room;
    }

    /**
     * Deep Clone
     */
    clone() {
        const clonedRoom = new Room(this.name, this.width, this.depth);

        // Clone Furniture
        this.furnitureList.forEach(item => {
            const clonedItem = item.clone();
            clonedRoom.addFurniture(clonedItem);
        });

        // Copy room transform
        clonedRoom.group.position.copy(this.group.position);
        clonedRoom.group.userData.entityId = this.generateId();

        // Note: Walls are generated by constructor, so they are fresh and correct size. 
        // No need to manually clone them unless we support custom wall modifications.

        return clonedRoom;
    }

    dispose() {
        // Dispose walls
        this.walls.forEach(w => w.dispose());
        // Dispose furniture
        this.furnitureList.forEach(f => f.dispose());
    }
}

class Layout3D {
    constructor(id, description) {
        this.id = id;
        this.description = description;
        this.rooms = [];
        this.cameraView = null; // Default camera settings
        this.group = new THREE.Group();
        this.group.userData = { entityId: id, type: 'Layout3D', isMaster: true };
    }

    addRoom(room) {
        this.rooms.push(room);
        this.group.add(room.group);
    }

    /**
     * Async Load all assets
     */
    async loadAssets() {
        const loader = new GLTFLoader();
        const promises = [];

        this.rooms.forEach(room => {
            room.furnitureList.forEach(furniture => {
                promises.push(furniture.loadModel(loader));
            });
        });

        await Promise.all(promises);
    }

    static fromJSON(data) {
        const layout = new Layout3D(data.id, data.name);
        if (data.cameraView) {
            layout.cameraView = data.cameraView;
        }
        if (data.rooms) {
            data.rooms.forEach(roomData => {
                const room = Room.fromJSON(roomData);
                layout.addRoom(room);
            });
        }
        return layout;
    }

    clone() {
        const clonedLayout = new Layout3D(this.id, this.description);

        // Copy camera view
        if (this.cameraView) {
            clonedLayout.cameraView = { ...this.cameraView };
        }

        // Deep clone rooms
        this.rooms.forEach(room => {
            const clonedRoom = room.clone();
            clonedLayout.addRoom(clonedRoom);
        });

        clonedLayout.group.userData.isMaster = false;

        return clonedLayout;
    }

    dispose() {
        this.rooms.forEach(r => r.dispose());
    }
}

/**
 * Prototype Registry
 */
class LayoutRegistry {
    constructor() {
        this.masters = new Map();
    }

    registerMaster(id, layout) {
        console.log(`[Registry] Registering Master Layout: ${id}`);
        this.masters.set(id, layout);
    }

    getSessionClone(id) {
        const master = this.masters.get(id);
        if (!master) {
            throw new Error(`Layout ${id} not found in registry.`);
        }
        // console.log(`[Registry] Creating Session Clone for: ${id}`);
        return master.clone();
    }
}

export {
    Furniture,
    Wall,
    Room,
    Layout3D,
    LayoutRegistry
};
