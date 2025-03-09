const { Client } = require("pg");
const mongoose = require("mongoose");

// Configuration PostgreSQL
const pgConfig = {
  connectionString: process.env.PG_URI,
  keepAlive: true,
  ssl: { rejectUnauthorized: false },
};

// Variable de connexion PostgreSQL
let pgClient = new Client(pgConfig);
let isConnected = false; // État de la connexion PostgreSQL

// Fonction pour établir la connexion PostgreSQL
async function connectPostgres() {
  if (isConnected) {
    console.log("✅ PostgreSQL already connected.");
    return; // Si déjà connecté, on ne fait rien
  }

  try {
    await pgClient.connect();
    isConnected = true;
    console.log("✅ Connected to PostgreSQL database");

    // Gestion des erreurs et reconnexion automatique
    pgClient.on("error", async (err) => {
      console.error("❌ PostgreSQL error:", err);
      isConnected = false;
      await reconnectPostgres();
    });

    pgClient.on("end", async () => {
      console.log("🔌 PostgreSQL connection ended.");
      isConnected = false;
      await reconnectPostgres();
    });
  } catch (err) {
    console.error("🚨 PostgreSQL connection error:", err);
    setTimeout(reconnectPostgres, 5000); // Réessaye dans 5s
  }
}

// Fonction pour rétablir la connexion PostgreSQL
async function reconnectPostgres() {
  console.log("🔄 Attempting to reconnect to PostgreSQL...");
  if (isConnected) return; // Si déjà connecté, ne rien faire

  try {
    // Réinitialise le client uniquement si la connexion a échoué
    pgClient = new Client(pgConfig); // Création d'un nouveau client
    await connectPostgres(); // Essayer de se reconnecter
  } catch (err) {
    console.error("❌ Reconnection failed:", err);
    setTimeout(reconnectPostgres, 5000); // Réessaye dans 5s
  }
}

// Fonction pour connecter les bases de données (PostgreSQL + MongoDB)
async function connectToDB() {
  try {
    // Connexion à PostgreSQL
    await connectPostgres();

    // Connexion à MongoDB Atlas
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB Atlas");
  } catch (err) {
    console.error("🚨 Database connection error:", err);
    throw err; // Propager l'erreur
  }
}

module.exports = { pgClient, mongoose, connectToDB };
