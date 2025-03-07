const express = require("express"); // Framework Express
const cors = require("cors"); //  Middleware CORS pour gérer les requêtes cross-origin
const corsOptions = require("./config/corsOptions.js");
const routes = require("./src/routes/routes.js"); // Import des routes
const { connectToDB } = require("./config/dbConnection.js"); // Import fonction de connexion
const { initializeDbPg } = require("./initData.js"); // Import fonction d'initialisation de la bdd postgres
const roomController = require("./src/controllers/roomController.js"); // IMPORT MANQUANT

// === Initialisation d'Express avec WebSocket ===
const expressWs = require("express-ws"); 
const app = express(); 
expressWs(app); // Active WebSocket pour Express

// Middleware pour parser le JSON
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Applique CORS à toutes les requêtes
app.use(cors(corsOptions)); // L'app Express utilise CORS avec ses options configurées



// Gestion des messages et des connections par room
const chatRooms = new Map(); // Structure de données pour stocker les messages et connections par room

// Fonction asynchrone pour démarrer l'application
async function startServer() {
  try {
    // Étape 1: Connexion à la base de données
    await connectToDB();
    console.log("Connexion aux bases de données réussie.");

    // Étape 2: Initialisation de la base de données avec les données nécessaires
    //await initializeDbPg();
    //console.log("Initialisation de la base de données postgres terminée.");

    // Étape 3: Montage des routes
    app.use("/", routes);

    // Configuration WebSocket pour la chatroom
    roomController.setupChatWebSocket(app);

    // Route de vérification de l'état du serveur
    app.get("/health", (req, res) => {
      res.status(200).send({ status: "ok" });
    });

    // Route de test
    app.get("/", (req, res) => {
      res.send("Hello World!");
    });

    // Étape 4: Démarrer le serveur
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (err) {
    console.error("Erreur lors du démarrage du serveur:", err);
  }
}

// Démarrer l'application
startServer();
