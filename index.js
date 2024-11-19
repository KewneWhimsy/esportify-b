const express = require("express"); // Framework Express
const cors = require('cors'); //  Middleware CORS pour gérer les requêtes cross-origin
const { Client } = require("pg"); // Pour la connexion à PostgreSQL
const mongoose = require("mongoose"); // Pour la connexion à MongoDB Atlas
const fs = require("fs"); // Module Node.js pour interagir avec le système de fichiers
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const app = express(); // Crée une instance d'application Express

// Middleware pour parser le JSON
app.use(express.json());

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

// Middleware pour vérifier le token JWT
function authenticateToken(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1]; // Récupère le token de l'en-tête Authorization

  if (!token) {
    return res.status(401).json({ error: "Token manquant" });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).json({ error: "Token invalide" });
    }
    req.user = decoded; // Ajoute l'utilisateur décodé à la requête
    next();
  });
}

// Middleware pour vérifier les rôles
function checkRole(allowedRoles) {
  return (req, res, next) => {
    if (!Array.isArray(allowedRoles)) {
      allowedRoles = [allowedRoles]; // Si on passe un seul rôle, le transforme en tableau
    }

    // Vérifie si le rôle de l'utilisateur est dans la liste des rôles autorisés
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: "Accès refusé" });
    }

    next();
  };
}



// Middleware pour gérer les requêtes
app.get("/", (req, res) => {
  res.send("Hello World!"); // Répond avec "Hello World!" pour la route racine
});

app.get("/api/events", async (req, res) => {
  try {
    const sortField = req.query.sort || "start_datetime"; // Trie par défaut : date
    const validSortFields = ["players_count", "start_datetime", "organisateur"];
    const orderBy = validSortFields.includes(sortField) ? sortField : "start_datetime";
    const sortColumn = (orderBy === "organisateur") ? "u.username" : `e.${orderBy}`;

    // Récupére les événements depuis PostgreSQL
    const result = await pgClient.query(`
      SELECT e.id, e.title, e.description, e.players_count, e.start_datetime, e.end_datetime, u.username AS organisateur
      FROM events e
      JOIN users u ON e.user_id = u.id
      WHERE e.is_approved = TRUE
      ORDER BY ${sortColumn}  ASC
      LIMIT 10
    `);
    
    const events = result.rows; // Récupére les événements sous forme d'un tableau d'objets JavaScript
    let eventsHtml = "";
    // Génére du HTML pour chaque événement
    events.forEach(event => {
      eventsHtml += `
        <div class="flex flex-col justify-between bg-[#26232A] border 
        border-[#E5E7EB] p-4 rounded-lg w-64 shadow-md hover:shadow-lg transition-transform hover:scale-105 cursor-pointer flex-shrink-0 gap-0.5" 
        @click="setTimeout(() => { isOpen = true }, 200)"
        hx-get="https://esportify-backend.onrender.com/api/event/${event.id}"
        hx-target="#popup-content"
        hx-swap="innerHTML"

        >
          <div>
            <h2 class="text-lg font-heading text-heading leading-tight mb-2">${event.title}</h2>
          </div>
          <div>
            <p class="text-sm text-gray-400">Joueurs : ${event.players_count}</p>
            <p class="text-sm">Début : ${new Date(event.start_datetime).toLocaleString()}</p>
            <p class="text-sm">Fin : ${new Date(event.end_datetime).toLocaleString()}</p>
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

app.get("/api/event/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pgClient.query(`
      SELECT e.id, e.title, e.description, e.players_count, e.start_datetime, e.end_datetime, u.username AS organisateur
      FROM events e
      JOIN users u ON e.user_id = u.id
      WHERE e.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).send("<p>Événement non trouvé</p>");
    }

    const event = result.rows[0];

    const eventHtml = `
      <div class="bg-[#26232A] border border-[#E5E7EB] p-6 rounded-lg shadow-lg h-full w-full">
        <h2 class="text-2xl font-bold mb-4 font-heading text-heading leading-tight">${event.title}</h2>
        <p class="mb-4">${event.description}</p>
        <p><strong>Joueurs :</strong> ${event.players_count}</p>
        <p><strong>Organisateur :</strong> ${event.organisateur}</p>
        <p><strong>Début :</strong> ${new Date(event.start_datetime).toLocaleString()}</p>
        <p><strong>Fin :</strong> ${new Date(event.end_datetime).toLocaleString()}</p>
        <button class="mt-4 px-4 py-2 bg-red-700 rounded hover:bg-red-800" 
        @click="isOpen = false">
          Fermer
        </button>
      </div>
    `;

    res.send(eventHtml);
  } catch (err) {
    console.error("Erreur lors de la récupération des détails de l'événement", err);
    res.status(500).json({ error: "Erreur lors de la récupération des détails de l'événement" });
  }
});

//inscription
app.post("/api/register", async (req, res) => {
  const { username, email, password } = req.body;

  // Vérification de l'existence de l'utilisateur
  const result = await pgClient.query("SELECT * FROM users WHERE email = $1", [email]);
  if (result.rows.length > 0) {
    return res.status(400).json({ error: "Email déjà utilisé" });
  }
  const resultUsername = await pgClient.query("SELECT * FROM users WHERE username = $1", [username]);
  if (resultUsername.rows.length > 0) {
    return res.status(400).json({ error: "Nom d'utilisateur déjà pris" });
  }

  // Hashage du mot de passe
  const hashedPassword = await bcrypt.hash(password, 10);

  // Insertion de l'utilisateur dans la base de données
  await pgClient.query(
    "INSERT INTO users (username, email, password, role) VALUES ($1, $2, $3, 'joueur')",
    [username, email, hashedPassword]
  );

  res.status(201).json({ message: "Utilisateur créé avec succès" });
});

// Connexion
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;

  // Vérification de l'existence de l'utilisateur
  const result = await pgClient.query("SELECT * FROM users WHERE email = $1", [email]);
  if (result.rows.length === 0) {
    return res.status(400).json({ error: "Utilisateur introuvable" });
  }

  const user = result.rows[0];

  // Vérification du mot de passe
  if (password === user.password) {
    console.log('Connexion réussie (mot de passe en clair)');
  } else {
    const isMatch = await bcrypt.compare(password, user.password);
    if (isMatch) {
      console.log('Connexion réussie (mot de passe haché)');
    } else {
      return res.status(400).json({ error: "Mot de passe incorrect" });
    }
  }
  // Création du token JWT
  const token = jwt.sign({ userId: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "1h" });

  // Renvoi du token JWT dans la réponse
  res.json({ message: "Connexion réussie", token });
});

// Route pour les joueurs - inscription à un événement
app.post("/api/events/:id/join", authenticateToken, checkRole(['joueur', 'orga', 'admin']), async (req, res) => {
  const eventId = req.params.id;
  const userId = req.user.userId;

  // Logique pour inscrire le joueur à l'événement
  await pgClient.query("INSERT INTO event_participants (event_id, user_id) VALUES ($1, $2)", [eventId, userId]);
  res.json({ message: "Inscription réussie" });
});

// Route pour les orga - créer un événement
app.post("/api/events", authenticateToken, checkRole(['orga', 'admin']), async (req, res) => {
  const { title, description, players_count, start_datetime, end_datetime } = req.body;
  const userId = req.user.userId;

  // Logique pour créer un événement
  await pgClient.query(
    "INSERT INTO events (title, description, players_count, start_datetime, end_datetime, user_id) VALUES ($1, $2, $3, $4, $5, $6)",
    [title, description, players_count, start_datetime, end_datetime, userId]
  );
  res.json({ message: "Événement créé avec succès, en attente de validation" });
});

// Route pour les administrateurs - approuver un événement
app.post("/api/events/:id/approve", authenticateToken, checkRole('admin'), async (req, res) => {
  const eventId = req.params.id;

  // Logique pour approuver l'événement
  await pgClient.query("UPDATE events SET is_approved = TRUE WHERE id = $1", [eventId]);
  res.json({ message: "Événement approuvé" });
});



// Démarrer le serveur
const PORT = process.env.PORT || 3000; // Définit le port sur lequel le serveur doit écouter
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
