const { Client } = require("pg");
const mongoose = require("mongoose");

// Se connecter à la base de données PostgreSQL
let pgClient = null; // Déclarer pgClient globalement, mais sans initialiser immédiatement

// Fonction pour rétablir la connexion si nécessaire
async function reconnect() {
  try {
    if (pgClient && pgClient._connected) {
      console.log("Le client PostgreSQL est déjà connecté.");
      return; // Si le client est déjà connecté, ne pas tenter de nouvelle connexion
    }

    if (!pgClient) {
      pgClient = new Client({
        connectionString: process.env.PG_URI,
        keepAlive: true,
        ssl: {
          rejectUnauthorized: false,
        },
      });
    }

    await pgClient.connect();
    console.log('Connexion PostgreSQL rétablie');
  } catch (err) {
    console.error('Erreur de rétablissement de la connexion PostgreSQL:', err);
    setTimeout(reconnect, 5000); // Réessayer dans 5 secondes
  }
}

// Gestion des erreurs de connexion
pgClient?.on('error', (err) => {
  console.error('Erreur de connexion à la base de données PostgreSQL:', err);
  // Si une déconnexion se produit, tenter une reconnexion
  if (err.code === 'ECONNRESET' || err.code === '08006') {
    console.log("Tentative de reconnexion...");
    reconnect();
  }
});

// Fonction de connexion aux bases de données
async function connectToDB() {
  try {
    // Connexion à PostgreSQL
    await reconnect();
    console.log("Connected to PostgreSQL database");

    // Connexion à MongoDB Atlas
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB Atlas");
  } catch (err) {
    console.error("Database connection error", err);
    throw err;  // Propager l'erreur pour qu'elle soit gérée ailleurs
  }
}

// Fonction pour démarrer le serveur
async function startServer() {
  try {
    // Connexion aux bases de données
    await connectToDB();

    // Démarrer ton serveur Express ici (routes, WebSocket, etc.)
    const express = require("express");
    const app = express();
    
    // Ajouter des routes, middlewares, etc. 
    app.get("/", (req, res) => {
      res.send("Hello World!");
    });

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