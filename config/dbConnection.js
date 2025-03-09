const { Client } = require("pg");
const mongoose = require("mongoose");

// Se connecter à la base de données PostgreSQL
let pgClient = null; // Déclarer pgClient globalement mais sans initialisation immédiate

// Fonction pour rétablir la connexion si nécessaire
async function reconnect() {
  try {
    // Vérifier si le client PostgreSQL est déjà connecté
    if (pgClient && pgClient._connected) {
      console.log("Le client PostgreSQL est déjà connecté.");
      return; // Si le client est déjà connecté, on ne tente pas de se reconnecter
    }

    // Si le client n'est pas encore initialisé, on le crée
    if (!pgClient) {
      pgClient = new Client({
        connectionString: process.env.PG_URI,
        keepAlive: true,
        ssl: {
          rejectUnauthorized: false,
        },
      });
    }

    // Si le client n'est pas encore connecté, on essaie de se connecter
    if (!pgClient._connected) {
      await pgClient.connect();
      console.log('Connexion PostgreSQL rétablie');
    }

  } catch (err) {
    console.error('Erreur de rétablissement de la connexion PostgreSQL:', err);
    setTimeout(reconnect, 5000); // Réessayer dans 5 secondes
  }
}

// Fonction de gestion des erreurs de connexion
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
    await reconnect(); // Tentative de connexion ou reconnexion
    console.log("Connected to PostgreSQL database");

    // Connexion à MongoDB Atlas
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB Atlas");

  } catch (err) {
    console.error("Database connection error", err);
    throw err;  // Propager l'erreur pour qu'elle soit gérée ailleurs
  }
}

module.exports = { pgClient, mongoose, connectToDB };