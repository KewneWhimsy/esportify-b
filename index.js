const express = require("express"); // Framework Express
const cors = require('cors'); //  Middleware CORS pour gérer les requêtes cross-origin
const { Client } = require("pg"); // Pour la connexion à PostgreSQL
const mongoose = require("mongoose"); // Pour la connexion à MongoDB Atlas
const fs = require("fs"); // Module Node.js pour interagir avec le système de fichiers

const app = express(); // Crée une instance d'application Express

// Se connecter à la base de données PostgreSQL
const pgClient = new Client({
  host: process.env.PG_HOST, // Adresse privée PostgreSQL (configurée dans Render)
  user: process.env.PG_USER, // Utilisateur PostgreSQL (configuré dans Render)
  password: process.env.PG_PASSWORD, // Mot de passe PostgreSQL (configuré dans Render)
  database: process.env.PG_DATABASE, // Nom de la base PostgreSQL (configuré dans Render)
  port: process.env.PG_PORT || 5432, // Port PostgreSQL (par défaut 5432)
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

// Configuration de CORS
const corsOptions = {
  origin: 'http://localhost:4321', // Origines autorisées pour les requêtes CORS
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'], // Méthodes HTTP autorisées
  allowedHeaders: ['Content-Type', 'Authorization', 'HX-Request', 'HX-Trigger', 'HX-Target', 'HX-Trigger-Name', 'HX-Current-URL'], // entêtes spécifiques de HTMX
  credentials: true, // en prévision des cookies pour les sessions d'utilisation
};

app.use(cors(corsOptions)); // L'app Express utilise CORS avec ses options configurées

// Middleware Express pour gérer les requêtes
app.get("/", (req, res) => {
  res.send("Hello World!"); // Répond avec "Hello World!" pour la route racine
});

app.get("/api/testHtmx", (req, res) => {
  res.send(`
    <div class="flex bg-blue-200 p-6 rounded-lg w-80 flex-shrink-0">
      <div class="w-24 h-24 bg-blue-300 rounded-lg overflow-hidden">
        <img src="/img/logoevent.png" alt="Image de l'événement" class="object-cover w-full h-full">
      </div>
      <div class="ml-4">
        <h2 class="text-lg font-semibold">Exemple statique</h2>
        <p class="text-sm text-gray-700">Ceci est un exemple d'événement statique.</p>
      </div>
    </div>
  `); // Répond avec un exemple statique d'événement en HTML
});


app.get("/api/events", async (req, res) => {
  try {
    // Récupére les événements depuis PostgreSQL
    const result = await pgClient.query(`
      SELECT e.id, e.title, e.description, e.players_count, e.start_datetime, e.end_datetime, u.username AS proposer
      FROM events e
      JOIN users u ON e.user_id = u.id
      WHERE e.is_approved = TRUE
      ORDER BY e.start_datetime ASC
      LIMIT 10
    `);
    
    const events = result.rows; // Récupére les événements sous forme d'un tableau d'objets JavaScript

    // Génére du HTML pour chaque événement
    let eventsHtml = "";
    events.forEach(event => {
      eventsHtml += `
        <div class="flex flex-col justify-between bg-[#26232A] border border-[#E5E7EB] p-4 rounded-lg w-64 shadow-md hover:shadow-lg transition-transform hover:scale-105 cursor-pointer flex-shrink-0">
          <div>
            <h2 class="text-lg text-wrap-balance font-heading text-heading truncate-2-lines leading-tight mb-2">${event.title}</h2>
          </div>
          <div>
            <p class="text-sm text-gray-400">Joueurs : ${event.players_count}</p>
            <p class="text-sm text-gray-500">Début : ${new Date(event.start_datetime).toLocaleString()}</p>
            <p class="text-sm text-gray-500">Fin : ${new Date(event.end_datetime).toLocaleString()}</p>
          </div>
        </div>
      `;
    });

    // Renvoi le fragment HTML à HTMX
    res.send(eventsHtml);
  } catch (err) {
    console.error("Erreur lors de la récupération des événements", err);
    res.status(500).json({ error: "Erreur lors de la récupération des événements" });
  }
});


// Démarrer le serveur
const PORT = process.env.PORT || 3000; // Définit le port sur lequel le serveur doit écouter
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
