const express = require("express");
const { Client } = require("pg"); // Pour la connexion à PostgreSQL
const mongoose = require("mongoose"); // Pour la connexion à MongoDB Atlas
const fs = require("fs");

const app = express();

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

const initSql = fs.readFileSync("./init.sql").toString();

pgClient
  .query(initSql)
  .then(() => console.log("Database initialized with init.sql"))
  .catch((err) => console.error("Error initializing database", err));

// Se connecter à MongoDB Atlas
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("Connected to MongoDB Atlas"))
  .catch((err) => console.error("MongoDB connection error", err));

// Middleware Express pour gérer les requêtes
app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.get("/api/events", async (req, res) => {
  try {
    const result = await pgClient.query("SELECT * FROM events");
    console.log(result.rows);
    const events = result.rows;

    const eventsHtml = events
      .map(
        (event) => `
      <div class="flex bg-blue-200 p-6 rounded-lg w-80 flex-shrink-0">
        <div class="w-24 h-24 bg-blue-300 rounded-lg overflow-hidden">
          <img src="https://via.placeholder.com/150" alt="Image de l'événement" class="object-cover w-full h-full">
        </div>
        <div class="ml-4">
          <h2 class="text-lg font-semibold">${event.title}</h2>
          <p class="text-sm text-gray-700">${event.description}</p>
        </div>
      </div>
    `
      )
      .join("");

    const responseHtml = `
      <div id="loading-message" hx-swap-oob="true:outerHTML"></div>
      <div id="events-list" hx-swap="outerHTML settle:end">
        ${eventsHtml}
      </div>
    `;

    res.send(responseHtml);
  } catch (err) {
    console.error("Erreur lors de la récupération des événements", err);
    res
      .status(500)
      .send(
        '<div id="loading-message" hx-swap-oob="true:outerHTML">Erreur de chargement</div>'
      );
  }
});

// Démarrer le serveur
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
