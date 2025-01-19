const { Client } = require("pg");
const mongoose = require("mongoose");
const fs = require("fs");
const initializeData = require("../initData");

// Se connecter à la base de données PostgreSQL
const pgClient = new Client({
  connectionString: process.env.PG_URI,
  // Pour une db sur Neon, il est recommandé d'ajouter cette option pour SSL
  ssl: {
    rejectUnauthorized: false,
  },
});

// Fonction d'initialisation qui combine init.sql et initData.js
async function initialisation() {
  try {
    // Lire et exécuter le fichier SQL (init.sql)
    const initSql = fs.readFileSync('./init.sql').toString();

    // Exécuter le script SQL pour initialiser la base
    await pgClient.query(initSql);
    console.log('Database initialized with init.sql');
    
    // Insérer les données après l'initialisation SQL
    await initializeData();  // Assurez-vous d'attendre que l'insertion des données soit terminée
    console.log('Initial data inserted successfully.');
  } catch (err) {
    console.error('Error during initialization:', err);
    throw err; // Propager l'erreur si l'initialisation échoue
  }
}

// Connexion à PostgreSQL
pgClient
  .connect()
  .then(async () => {
    console.log('Connected to PostgreSQL database');
    module.exports = { pgClient }; // export de pgClient pour être utilisé par initialisation()

    // Appeler l'initialisation après une connexion réussie à PostgreSQL
    await initialisation(); // Attendre l'initialisation complète avant de continuer
  })
  .catch((err) => {
    console.error('PostgreSQL connection error', err);
  });

// Se connecter à MongoDB Atlas
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("Connected to MongoDB Atlas"))
  .catch((err) => console.error("MongoDB connection error", err))
;

module.exports = { mongoose };
