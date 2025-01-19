const express = require("express"); // Framework Express
const cors = require("cors"); //  Middleware CORS pour gérer les requêtes cross-origin
const routes = require("./src/routes/routes.js"); // Import des routes
const { connectToDB } = require("./config/dbConnection.js"); // Import fonction de connexion
const { initializeDbPg } = require("./initData.js"); // Import fonction d'initialisation de la bdd postgres

const app = express(); // Crée une instance d'application Express

// Middleware pour parser le JSON
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configuration de CORS
const corsOptions = require("./config/corsOptions.js");
app.use(cors(corsOptions)); // L'app Express utilise CORS avec ses options configurées

// Fonction asynchrone pour démarrer l'application
async function startServer() {
  try {
    // Étape 1: Connexion à la base de données
    await connectToDB();
    console.log("Connexion aux bases de données réussie.");

    // Étape 2: Initialisation de la base de données avec les données nécessaires
    await initializeDbPg();
    console.log("Initialisation de la base de données postgres terminée.");

    // Étape 3: Montage des routes
    app.use("/", routes);

    // Route de test
    app.get("/", (req, res) => {
      res.send("Hello World!");
    });

    // Étape 4: Démarrer le serveur
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (err) {
    console.error("Erreur lors du démarrage du serveur:", err);
  }
}

// Démarrer l'application
startServer();