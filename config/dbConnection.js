const { Client } = require("pg");
const mongoose = require("mongoose");

let pgClient = new Client({
  connectionString: process.env.PG_URI,
  keepAlive: true,
  ssl: {
    rejectUnauthorized: false,
  },
});

// Variable pour stocker l'état de la connexion
let isConnected = false;

// Fonction de réinitialisation du client PostgreSQL
function createPgClient() {
  pgClient = new Client({
    connectionString: process.env.PG_URI,
    keepAlive: true,
    ssl: {
      rejectUnauthorized: false,
    },
  });

  pgClient.on('error', (err) => {
    console.error('Erreur de connexion à la base de données PostgreSQL:', err);
    isConnected = false;
    reconnect();
  });

  pgClient.on('end', () => {
    console.log('Déconnexion de la base de données PostgreSQL');
    isConnected = false;
    reconnect();
  });
}

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
    setTimeout(reconnect, 5000); // Réessayer dans 5 secondes
  }
}

// Fonction de connexion aux bases de données
async function connectToDB() {
  try {
    // Créer et connecter un nouveau client PostgreSQL
    createPgClient();
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
