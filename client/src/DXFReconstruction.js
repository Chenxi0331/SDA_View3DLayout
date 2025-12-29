import DxfParser from 'dxf-parser';
import * as THREE from 'three';

// --- Parser ---
export class DXFParser {
    constructor() {
        this.parser = new DxfParser();
    }

    parse(dxfContent) {
        console.log(`[Parser] Parsing DXF data...`);
        try {
            return this.parser.parseSync(dxfContent);
        } catch (err) {
            console.error('[Parser] Error parsing DXF:', err);
            throw err;
        }
    }
}

// --- Reconstruction Engine ---
export class ReconstructionEngine {
    constructor() {
        this.wallHeight = 2.5;
        this.wallColor = 0xcccccc;
    }

    /**
     * Reconstructs 3D layout from a DXF model
     */
    reconstruct(dxfModel) {
        console.log("[ReconstructionEngine] Reconstructing 3D layout from DXF...");
        const group = new THREE.Group();

        if (!dxfModel || !dxfModel.entities) return group;

        // 1. Calculate Bounding Box for Auto-Scaling
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

        const updateBounds = (v) => {
            if (v.x < minX) minX = v.x;
            if (v.y < minY) minY = v.y;
            if (v.x > maxX) maxX = v.x;
            if (v.y > maxY) maxY = v.y;
        };

        dxfModel.entities.forEach((entity) => {
            if (entity.vertices) {
                entity.vertices.forEach(updateBounds);
            }
        });

        if (minX === Infinity) {
             console.warn("No vertices found in DXF entities.");
             return group;
        }

        const width = maxX - minX;
        const height = maxY - minY;
        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;

        // Determine scale factor - aim to fit within a ~20 unit area
        const maxDimension = Math.max(width, height);
        const scale = maxDimension > 0 ? 20 / maxDimension : 1;

        console.log(`[ReconstructionEngine] Bounds: [${minX}, ${minY}] to [${maxX}, ${maxY}], Scale: ${scale}`);

        // 2. Create Floor (scaled to fit)
        const floorGeometry = new THREE.PlaneGeometry(Math.max(width * scale * 1.5, 50), Math.max(height * scale * 1.5, 50));
        const floorMaterial = new THREE.MeshPhongMaterial({ color: 0x333333, side: THREE.DoubleSide });
        const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = -0.01;
        group.add(floor);

        // 3. Process DXF Entities with scaling and centering
        const offsetAndScale = (x, y) => {
            return {
                x: (x - centerX) * scale,
                y: (y - centerY) * scale
            };
        };

        dxfModel.entities.forEach((entity) => {
            if (entity.type === 'LINE') {
                const v1 = offsetAndScale(entity.vertices[0].x, entity.vertices[0].y);
                const v2 = offsetAndScale(entity.vertices[1].x, entity.vertices[1].y);
                this.addWallSegment(v1.x, v1.y, v2.x, v2.y, group);
            } else if (entity.type === 'LWPOLYLINE' || entity.type === 'POLYLINE') {
                for (let i = 0; i < entity.vertices.length - 1; i++) {
                    const v1 = offsetAndScale(entity.vertices[i].x, entity.vertices[i].y);
                    const v2 = offsetAndScale(entity.vertices[i + 1].x, entity.vertices[i + 1].y);
                    this.addWallSegment(v1.x, v1.y, v2.x, v2.y, group);
                }
                if (entity.shape || entity.closed) {
                    const v1 = offsetAndScale(entity.vertices[entity.vertices.length - 1].x, entity.vertices[entity.vertices.length - 1].y);
                    const v2 = offsetAndScale(entity.vertices[0].x, entity.vertices[0].y);
                    this.addWallSegment(v1.x, v1.y, v2.x, v2.y, group);
                }
            }
        });

        return group;
    }

    addWallSegment(x1, y1, x2, y2, group) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const length = Math.sqrt(dx * dx + dy * dy);
        if (length < 0.001) return;

        const geometry = new THREE.BoxGeometry(length, this.wallHeight, 0.2);
        const material = new THREE.MeshPhongMaterial({ color: this.wallColor });
        const wall = new THREE.Mesh(geometry, material);

        // Map DXF XY to 3D XZ (Y is up)
        // Note: In standard DXF, Y is UP. In Three.js, Y is UP.
        // But often plans are 2D (Top Down), so DXF X,Y -> Three X, -Z (or Z)
        // Friend's code used: wall.position.set(midX, height/2, -midY);
        
        wall.position.set((x1 + x2) / 2, this.wallHeight / 2, -(y1 + y2) / 2);

        const angle = Math.atan2(-dy, dx);
        wall.rotation.y = angle;

        group.add(wall);
    }
}

// --- Helper Wrapper for Viewer ---
export class ImportedLayout {
    constructor(group) {
        this.group = group;
        this.group.userData.entityId = `dxf-import-${Date.now()}`;
        this.id = this.group.userData.entityId;
        // Mock camera view settings used by Viewer
        this.cameraView = {
            position: { x: 0, y: 20, z: 20 },
            target: { x: 0, y: 0, z: 0 }
        };
    }
    
    dispose() {
        console.log("Disposing imported layout resources...");
        // Traverse and dispose geometries and materials
        if (this.group) {
            this.group.traverse((child) => {
                if (child.isMesh) {
                    if (child.geometry) child.geometry.dispose();
                    if (child.material) {
                        if (Array.isArray(child.material)) {
                            child.material.forEach(m => m.dispose());
                        } else {
                            child.material.dispose();
                        }
                    }
                }
            });
        }
    }
}
