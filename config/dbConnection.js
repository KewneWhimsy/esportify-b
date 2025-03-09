const { Pool } = require("pg");
const mongoose = require("mongoose");

// Utiliser Pool au lieu de Client pour une meilleure gestion des connexions
const pgPool = new Pool({
  connectionString: process.env.PG_URI,
  ssl: {
    rejectUnauthorized: false,
  },
  // Configuration pour la gestion des connexions
  idleTimeoutMillis: 30000, // Temps d'inactivité avant fermeture (30 secondes)
  connectionTimeoutMillis: 5000, // Délai d'attente pour une connexion (5 secondes)
  max: 10, // Nombre maximum de clients dans le pool
});

// Écouter les erreurs au niveau du pool
pgPool.on('error', (err) => {
  console.error('Erreur inattendue du pool PostgreSQL:', err);
  // Ne pas tenter de reconnexion ici - le pool le fera automatiquement
});

// Fonction de connexion aux bases de données
async function connectToDB() {
  try {
    // Tester la connexion PostgreSQL (sans bloquer une connexion)
    const client = await pgPool.connect();
    client.release(); // Important: libérer le client immédiatement
    console.log("Connected to PostgreSQL database");

    // Connexion à MongoDB Atlas
    await mongoose.connect(process.env.MONGODB_URI, {
      // Options de connexion pour une meilleure résilience
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    console.log("Connected to MongoDB Atlas");
  } catch (err) {
    console.error("Database connection error", err);
    throw err;
  }
}

// Fonction pour exécuter une requête PostgreSQL de façon sécurisée
async function queryDB(text, params) {
  const client = await pgPool.connect();
  try {
    const result = await client.query(text, params);
    return result;
  } catch (err) {
    console.error('Erreur lors de l\'exécution de la requête:', err);
    throw err;
  } finally {
    client.release(); // Toujours libérer le client, même en cas d'erreur
  }
}

module.exports = { pgPool, mongoose, connectToDB, queryDB };