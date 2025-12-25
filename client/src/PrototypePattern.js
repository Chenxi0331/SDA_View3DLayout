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

class Furniture {
    constructor(name, type, modelUrl = null) {
        this.name = name;
        this.type = type;
        this.modelUrl = modelUrl;

        // Default Mesh (Box) until model is loaded
        this.mesh = new THREE.Mesh(
            new THREE.BoxGeometry(2, 2, 2),
            new THREE.MeshStandardMaterial({ color: 0x888888 })
        );
        this.mesh.userData = { entityId: this.generateId(), type: 'Furniture', name: name };

        // If loaded model exists, it will replace/attach to this.mesh or be a child
        // Better: this.mesh IS the container.
        // We can swap the content of this.mesh or add the loaded model to it.
        // Let's make this.mesh a Group if we expect to hold a model.
        // But for compatibility with existing code which expects a Mesh or Object3D:
        // Let's use a Group as the root for Furniture now.
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

            // Replace placeholder with real model
            this.root.remove(this.mesh); // Remove box
            this.root.add(model);
            this.mesh = model; // Update reference for cloning logic if needed

            console.log(`Loaded model for ${this.name}`);
        } catch (err) {
            console.error(`Failed to load model for ${this.name}`, err);
            // Keep placeholder
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
        // Standard .clone() loses bone connections and animations often.
        const clonedRoot = SkeletonUtils.clone(this.root);

        clonedFurniture.root = clonedRoot;

        // IMPORTANT: Update unique ID
        clonedFurniture.root.userData.entityId = this.generateId();
        clonedFurniture.root.userData.type = 'Furniture'; // Re-assign if lost
        clonedFurniture.root.userData.name = this.name;

        return clonedFurniture;
    }
}

class Room {
    constructor(name, width = 20, depth = 20) {
        this.name = name;
        this.width = width;
        this.depth = depth;
        this.furnitureList = [];
        this.group = new THREE.Group();
        this.group.userData = { entityId: this.generateId(), type: 'Room', name: name };
    }

    generateId() {
        return Math.random().toString(36).substr(2, 9);
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

        // We don't just clone the group because we want to maintain the Furniture class structure
        // So we clone the structure manually.

        this.furnitureList.forEach(item => {
            const clonedItem = item.clone();
            clonedRoom.addFurniture(clonedItem);
        });

        // Copy room transform if any
        clonedRoom.group.position.copy(this.group.position);
        clonedRoom.group.userData.entityId = this.generateId();

        return clonedRoom;
    }
}

class Layout3D {
    constructor(id, description) {
        this.id = id;
        this.description = description;
        this.rooms = [];
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

        // Deep clone rooms
        this.rooms.forEach(room => {
            const clonedRoom = room.clone();
            clonedLayout.addRoom(clonedRoom);
        });

        clonedLayout.group.userData.isMaster = false;

        return clonedLayout;
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
    Room,
    Layout3D,
    LayoutRegistry
};
