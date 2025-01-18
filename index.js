const express = require("express"); // Framework Express
const cors = require("cors"); //  Middleware CORS pour gérer les requêtes cross-origin
const routes = require("./src/routes/routes.js"); // Import des routes

const app = express(); // Crée une instance d'application Express

// Middleware pour parser le JSON
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configuration de CORS
const corsOptions = require("./config/corsOptions.js");
app.use(cors(corsOptions)); // L'app Express utilise CORS avec ses options configurées

// Connexion à PostgreSQL et MongoDB
require("./config/dbConnection.js");

// Montage des routes
app.use("/", routes);

// Route de test
app.get("/", (req, res) => {
  res.send("Hello World!"); // Répond avec "Hello World!" pour la route racine
});

// Démarrer le serveur
const PORT = process.env.PORT || 3000; // Définit le port sur lequel le serveur doit écouter
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
