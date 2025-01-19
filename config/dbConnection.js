const { Client } = require("pg");
const mongoose = require("mongoose");

// Se connecter à la base de données PostgreSQL
const pgClient = new Client({
  connectionString: process.env.PG_URI,
  // Pour une db sur Neon, il est recommandé d'ajouter cette option pour SSL
  ssl: {
    rejectUnauthorized: false,
  },
});


// Fonction de connexion aux bases de données
async function connectToDB() {
  try {

    // Connexion à la bdd postgres
    await pgClient.connect(); 
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