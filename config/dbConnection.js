const { Client } = require("pg");
const mongoose = require("mongoose");

// Se connecter à la base de données PostgreSQL
const pgClient = new Client({
  connectionString: process.env.PG_URI,
  keepAlive: true,
  ssl: {
    rejectUnauthorized: false,
  },
});

// Variable pour stocker l'état de la connexion
let isConnected = false;

// Gérez les erreurs de connexion
pgClient.on('error', (err) => {
  console.error('Erreur de connexion à la base de données PostgreSQL:', err);
  isConnected = false;
  // Rétablir la connexion ou effectuer une autre action
  reconnect();
});

// Gérez les déconnexions
pgClient.on('end', () => {
  console.log('Déconnexion de la base de données PostgreSQL');
  isConnected = false;
  // Rétablir la connexion ou effectuer une autre action
  reconnect();
});

// Fonction pour rétablir la connexion
async function reconnect() {
  try {
    if (!isConnected) {
      await pgClient.connect();
      isConnected = true;
      console.log('Connexion rétablie');
    }
  } catch (err) {
    console.error('Erreur de rétablissement de la connexion:', err);
    setTimeout(reconnect, 5000); // Réessayer de se connecter dans 5 secondes
  }
}

// Fonction de connexion aux bases de données
async function connectToDB() {
  try {
    // Connexion à la bdd postgres
    await pgClient.connect();
    isConnected = true;
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