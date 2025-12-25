import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import * as THREE from 'three';

// Polyfill for PrototypePattern.js if it expects global THREE
window.THREE = THREE;

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);
