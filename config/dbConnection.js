const { Client } = require("pg");
const mongoose = require("mongoose");
const fs = require("fs");

// Se connecter à la base de données PostgreSQL
const pgClient = new Client({
  connectionString: process.env.PG_URI,
  // Pour une db sur Neon, il est recommandé d'ajouter cette option pour SSL
  ssl: {
    rejectUnauthorized: false,
  },
});

pgClient
  .connect()
  .then(() => console.log("Connected to PostgreSQL database"))
  .catch((err) => console.error("PostgreSQL connection error", err.stack));

const initSql = fs.readFileSync("./init.sql").toString(); // Lit le contenu du fichier init.sql et le convertit en String

pgClient
  .query(initSql)
  .then(() => console.log("Database initialized with init.sql"))
  .catch((err) => console.error("Error initializing database", err));

// Se connecter à MongoDB Atlas
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("Connected to MongoDB Atlas"))
  .catch((err) => console.error("MongoDB connection error", err));
