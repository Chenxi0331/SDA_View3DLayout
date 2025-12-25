/**
 * 3D Real Estate Management System - Prototype Pattern Implementation
 * Definition of Prototype Interface and Entities
 */

// Mock THREE for the purpose of this structure if running in a non-browser node env without installation.
// In a real app, this would be: import * as THREE from 'three';
if (typeof THREE === 'undefined') {
    global.THREE = {
        Mesh: class { constructor() { this.uuid = Math.random().toString(36).substr(2, 9); this.userData = {}; this.position = {x:0,y:0,z:0}; } clone() { const c = new THREE.Mesh(); c.userData = {...this.userData}; c.position = {...this.position}; return c; } },
        Group: class { constructor() { this.uuid = Math.random().toString(36).substr(2, 9); this.children = []; this.userData = {}; this.position = {x:0,y:0,z:0}; } add(o) { this.children.push(o); } clone() { const c = new THREE.Group(); c.userData = {...this.userData}; c.position = {...this.position}; return c; } }
    };
}

/**
 * Interface Component acting as the Prototype
 * All entities must implement a clone() method.
 */

class Furniture {
    constructor(name, type) {
        this.name = name;
        this.type = type;
        // In Three.js, a Mesh is the visual representation
        this.mesh = new THREE.Mesh();
        this.mesh.userData = { entityId: this.generateId(), type: 'Furniture' };
    }

    generateId() {
        return Math.random().toString(36).substr(2, 9);
    }

    setPosition(x, y, z) {
        this.mesh.position.x = x;
        this.mesh.position.y = y;
        this.mesh.position.z = z;
    }

    /**
     * Deep Clone
     * Creates a new Furniture instance and clones the Three.js mesh.
     * The mesh.clone() in Three.js shares geometry/material by default (shallow copy of resources),
     * but creates a new object instance (deep copy of the node).
     */
    clone() {
        const clonedFurniture = new Furniture(this.name, this.type);
        // Deep copy the visual mesh
        clonedFurniture.mesh = this.mesh.clone();
        
        // IMPORTANT: Update unique ID for the session entity vs master
        clonedFurniture.mesh.userData.entityId = this.generateId(); 
        
        return clonedFurniture;
    }
}

class Room {
    constructor(name) {
        this.name = name;
        this.furnitureList = [];
        // A Group holds the structural hierarchy in Three.js
        this.group = new THREE.Group();
        this.group.userData = { entityId: this.generateId(), type: 'Room' };
    }

    generateId() {
        return Math.random().toString(36).substr(2, 9);
    }

    addFurniture(furniture) {
        this.furnitureList.push(furniture);
        this.group.add(furniture.mesh);
    }

    /**
     * Deep Clone
     * Iterates through all furniture in the room, cloning them recursively.
     */
    clone() {
        const clonedRoom = new Room(this.name);
        
        // Clone the Three.js Group container (without children first)
        clonedRoom.group = this.group.clone();
        // Clear children because standard .clone() might not clone children properly depending on recursive flag,
        // or we want explicit control over wrapping logic.
        clonedRoom.group.children = []; 

        // Deep clone hierarchy
        this.furnitureList.forEach(item => {
            const clonedItem = item.clone(); // Recursive call to Furniture.clone()
            clonedRoom.addFurniture(clonedItem);
        });

        // Update ID
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
     * Deep Clone
     * This is the entry point for creating a "Session Entity".
     */
    clone() {
        const clonedLayout = new Layout3D(this.id, this.description); // Keep original ID reference or generate new session ID
        
        // Clone container
        clonedLayout.group = this.group.clone();
        clonedLayout.group.children = [];
        clonedLayout.group.userData.isMaster = false; // Mark as session instance

        // Deep clone rooms
        this.rooms.forEach(room => {
            const clonedRoom = room.clone(); // Recursive call to Room.clone()
            clonedLayout.addRoom(clonedRoom);
        });

        return clonedLayout;
    }
}

/**
 * Prototype Registry
 * Manages Master Entities.
 */
class LayoutRegistry {
    constructor() {
        this.masters = new Map();
    }

    registerMaster(id, layout) {
        console.log(`[Registry] Registering Master Layout: ${id}`);
        this.masters.set(id, layout);
    }

    /**
     * getSessionClone
     * Returns a deep-cloned version of the layout.
     * The returned object is a unique "Session Entity".
     */
    getSessionClone(id) {
        const master = this.masters.get(id);
        if (!master) {
            throw new Error(`Layout ${id} not found in registry.`);
        }
        console.log(`[Registry] Creating Session Clone for: ${id}`);
        return master.clone();
    }
}

// --- Example Usage Integration ---

/**
 * Function to add layout to Three.js scene
 */
function addToScene(scene, layoutEntity) {
    if (scene && typeof scene.add === 'function') {
        scene.add(layoutEntity.group);
        console.log("Added layout to Three.js scene.");
    } else {
        console.warn("Invalid scene object provided.");
    }
}

// --- Demonstration Script ---

// 1. Setup Registry
const registry = new LayoutRegistry();

// 2. Create Master Layout (Template)
const masterLayout = new Layout3D('layout-001', 'Standard 1BHK');
const livingRoom = new Room('Living Room');
const sofa = new Furniture('Sofa', 'Seating');
sofa.setPosition(10, 0, 5);

livingRoom.addFurniture(sofa);
masterLayout.addRoom(livingRoom);

// 3. Register Master
registry.registerMaster('layout-001', masterLayout);

// 4. User starts a session -> Create Clone
const sessionLayout = registry.getSessionClone('layout-001');

// 5. Modify Session Entity
console.log("Original Master Sofa Position X:", masterLayout.rooms[0].furnitureList[0].mesh.position.x); // Should be 10
console.log("Session Clone Sofa Position X:", sessionLayout.rooms[0].furnitureList[0].mesh.position.x); // Should be 10

// Move the session sofa
sessionLayout.rooms[0].furnitureList[0].setPosition(99, 0, 5);
console.log("Moved Session Sofa to X=99");

// 6. Verify Independence
console.log("Re-checking Master Sofa Position X:", masterLayout.rooms[0].furnitureList[0].mesh.position.x); // Should still be 10!
console.log("Checking Session Sofa Position X:", sessionLayout.rooms[0].furnitureList[0].mesh.position.x); // Should be 99

if (masterLayout.rooms[0].furnitureList[0].mesh.position.x !== sessionLayout.rooms[0].furnitureList[0].mesh.position.x) {
    console.log("SUCCESS: Master and Session are decoupled.");
} else {
    console.error("FAILURE: Master was modified!");
}

module.exports = {
    Furniture,
    Room,
    Layout3D,
    LayoutRegistry
};
