# 3D Real Estate Management System - UC 001 View 3D Layout

This project demonstrates a professional 3D layout viewer for real estate management, focusing on **UC 001: View 3D Property Layout**. The core architectural highlight is the implementation of the **Prototype Design Pattern** to manage complex 3D scenes efficiently.

## 🚀 Overview

In 3D architectural systems, loading and parsing assets like `.glb` models is a performance-heavy operation. This system utilizes a **Master-Clone** architecture to ensure high performance, memory efficiency, and data integrity during user viewing sessions.

## 🏗️ Design Pattern: Prototype

We implemented the **Prototype Pattern** to handle the replication of 3D entities including Layouts, Rooms, and Furniture.

### 1. Core Concept
Instead of recreating objects from scratch—which involves expensive network requests and redundant parsing—the system creates a **Master** instance once and **Clones** it whenever a new viewing session is requested.

### 2. Key Components
* **Prototype Interface (`clone`)**: All major entities (`Layout3D`, `Room`, `Furniture`) implement a recursive `clone()` method to perform a **Deep Copy** of the object hierarchy.
* **Prototype Registry (`LayoutRegistry`)**: Acts as a centralized cache that stores "Master" templates and generates independent "Session Clones" for the UI.
* **Recursive Cloning Logic**:
    * **Furniture.clone()**: Duplicates the 3D Mesh while sharing heavy geometry and material resources in memory.
    * **Room.clone()**: Automatically clones all internal furniture entities recursively.
    * **Layout3D.clone()**: The primary entry point for creating a full-scale independent session copy.

### 3. Technical Benefits
* **Performance**: 3D assets are loaded and parsed only once per property type.
* **Memory Efficiency**: Three.js clones share underlying buffers and textures, significantly reducing the GPU memory footprint.
* **Data Independence**: Modifications made in a "Session Clone" (e.g., moving a sofa) do not affect the original "Master" template stored in the registry.

## 🛠️ Tech Stack
* **Frontend Framework**: React.js
* **3D Engine**: Three.js
* **Language**: JavaScript (ES6+)
* **Architecture**: Prototype Design Pattern

## 📖 Use Case: UC 001 - View 3D Property Layout
The implementation strictly adheres to the UC 001 business flow:
1.  **Retrieve**: System fetches the raw layout JSON from the backend API.
2.  **Initialize**: The "Master" layout is hydrated from JSON and registered in the `LayoutRegistry`.
3.  **Clone & Display**: A session-specific clone is generated and passed to the `ThreeDViewer` component.
4.  **Interact**: Users can explore the layout using `OrbitControls` to rotate, zoom, and pan.

## 🚦 Getting Started

### Prerequisites
* Node.js and npm installed.

### Installation
1.  Clone the repository.
2.  Install dependencies:
    ```bash
    npm install three react react-dom
    ```
3.  Start the development server:
    ```bash
    npm start
    ```

---
*This project serves as a practical implementation of software design patterns in 3D web applications.*
