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

// Fonction pour rétablir la connexion si nécessaire
async function reconnect() {
  try {
    if (!isConnected) {
      await pgClient.connect();
      isConnected = true;
      console.log('Connexion rétablie');
    }
  } catch (err) {
    console.error('Erreur de rétablissement de la connexion:', err);
    setTimeout(reconnect, 5000); // Réessayer dans 5 secondes
  }
}

// Gestion des erreurs de connexion
pgClient.on('error', (err) => {
  console.error('Erreur de connexion à la base de données PostgreSQL:', err);
  // Si une déconnexion se produit, tenter une reconnexion
  if (err.code === 'ECONNRESET' || err.code === '08006') {
    // Ces codes indiquent une connexion interrompue, donc on tente une reconnexion
    isConnected = false;
    reconnect();
  }
});



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