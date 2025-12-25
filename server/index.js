const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

// Load layout data
const layoutPath = path.join(__dirname, 'db', 'layout.json');

app.get('/api/layout/:id', (req, res) => {
    const { id } = req.params;

    // In a real app, we would query the DB by ID.
    // For this prototype, we just return the file content if the ID matches what we have or just return the file.

    console.log(`Received request for layout: ${id}`);

    fs.readFile(layoutPath, 'utf8', (err, data) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Internal Server Error' });
        }

        try {
            const jsonData = JSON.parse(data);
            // Simple validation simulation
            if (jsonData.id === id || id === 'layout-101') {
                res.json(jsonData);
            } else {
                res.status(404).json({ error: 'Layout not found' });
            }
        } catch (parseErr) {
            console.error(parseErr);
            res.status(500).json({ error: 'Failed to parse layout data' });
        }
    });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
