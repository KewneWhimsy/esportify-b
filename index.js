const express = require('express');
const { Client } = require('pg'); // Pour la connexion à PostgreSQL
const mongoose = require('mongoose'); // Pour la connexion à MongoDB Atlas

const app = express();

// Se connecter à la base de données PostgreSQL
const pgClient = new Client({
  host: process.env.PG_HOST, // Adresse privée PostgreSQL (configurée dans Render)
  user: process.env.PG_USER, // Utilisateur PostgreSQL (configuré dans Render)
  password: process.env.PG_PASSWORD, // Mot de passe PostgreSQL (configuré dans Render)
  database: process.env.PG_DATABASE, // Nom de la base PostgreSQL (configuré dans Render)
  port: process.env.PG_PORT || 5432, // Port PostgreSQL (par défaut 5432)
});

pgClient.connect()
  .then(() => console.log('Connected to PostgreSQL database'))
  .catch(err => console.error('PostgreSQL connection error', err.stack));

// Se connecter à MongoDB Atlas
mongoose.connect(process.env.MONGODB_URI, { 
  useNewUrlParser: true, 
  useUnifiedTopology: true 
})
  .then(() => console.log('Connected to MongoDB Atlas'))
  .catch(err => console.error('MongoDB connection error', err));

// Middleware Express pour gérer les requêtes
app.get('/', (req, res) => {
  res.send('Hello World!');
});

// Démarrer le serveur
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
