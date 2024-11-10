const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

// Route simple pour tester
app.get('/api/hello', (req, res) => {
  res.json({ message: 'Hello from Express!' });
});

// Démarrer le serveur
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
