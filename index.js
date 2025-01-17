const express = require("express"); // Framework Express
const cors = require("cors"); //  Middleware CORS pour gérer les requêtes cross-origin
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const authenticateToken = require("./src/middlewares/authMiddleware.js"); // Import du middleware d'authentification
const checkRole = require("./src/middlewares/roleMiddleware.js"); // Import du middleware de vérification des rôles
const routes = require("./src/routes/routes.js"); // Import des routes

const app = express(); // Crée une instance d'application Express

// Middleware pour parser le JSON
app.use(express.json());

// Configuration de CORS
const corsOptions = require("./config/corsOptions.js");
app.use(cors(corsOptions)); // L'app Express utilise CORS avec ses options configurées

// Connexion à PostgreSQL et MongoDB
require("./config/dbConnection.js");

// Montage des routes
app.use("/", routes);

// Route de test
app.get("/", (req, res) => {
  res.send("Hello World!"); // Répond avec "Hello World!" pour la route racine
});



app.get("/api/event/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pgClient.query(
      `
      SELECT e.id, e.title, e.description, e.players_count, e.start_datetime, e.end_datetime, u.username AS organisateur
      FROM events e
      JOIN users u ON e.user_id = u.id
      WHERE e.id = $1
    `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).send("<p>Événement non trouvé</p>");
    }

    const event = result.rows[0];

    // Tentative de décoder le token JWT si présent pour savoir si l'utilisateur est connecté
    let userRole = 'visiteur';
    let userId = null;
    const authHeader = req.headers.authorization;
    if (authHeader) {
      const token = authHeader.split(" ")[1];
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        userRole = decoded.role;
        userId = decoded.userId;
      } catch (err) {
        console.error("Erreur lors du décodage du token JWT", err);
      }
    }

    // Vérifier si l'utilisateur a déjà favorisé cet événement
    let isFavorited = false;
    if (userId) {
      const favoriteCheck = await pgClient.query(
        "SELECT * FROM favorites WHERE user_id = $1 AND event_id = $2",
        [userId, id]
      );
      if (favoriteCheck.rowCount > 0) {
        isFavorited = true; // L'événement est déjà un favori de cet utilisateur
      }
    }

    const eventHtml = `
      <div x-data="{ rolee: window.role }" x-init="
      console.log('Initialisation du rôle:', rolee);
      window.addEventListener('role-changed', (event) => {
      console.log('Rôle mis à jour immédiatement:', event.detail.role);
      rolee = event.detail.role;
      });" class="bg-[#26232A] border border-[#E5E7EB] p-6 rounded-lg shadow-lg h-full w-full">
        <h2 class="text-2xl font-bold mb-4 font-heading text-heading leading-tight">${event.title}</h2>
        <p class="mb-4">${event.description}</p>
        <p><strong>Joueurs :</strong> ${event.players_count}</p>
        <p><strong>Organisateur :</strong> ${event.organisateur}</p>
        <p><strong>Début :</strong> ${new Date(event.start_datetime).toLocaleString()}</p>
        <p><strong>Fin :</strong> ${new Date(event.end_datetime).toLocaleString()}</p>

        <div class="flex justify-between">
        
          <!-- Utilisation de Alpine.js pour gérer l'état du favori -->
          <div x-show="rolee !== 'visiteur'" x-data="{ favorite: ${isFavorited} }">
            <button
              x-show="!favorite"
              hx-post="/api/favorites"
              hx-target="#favorite-button"
              hx-vals='{ "eventId": "${id}", "userId": "${userId}" }'
              hx-on="htmx:beforeRequest: this.disabled = true"
              hx-on="htmx:afterRequest: this.disabled = false"
              class="px-4 py-2 bg-blue-500 rounded hover:bg-opacity-80"
              @click="favorite = true"
            >
              Je participe
            </button>

            <button
              x-show="favorite"
              hx-post="/api/favorites"
              hx-target="#favorite-button"
              hx-vals='{ "eventId": "${id}", "userId": "${userId}" }'
              hx-on="htmx:beforeRequest: this.disabled = true"
              hx-on="htmx:afterRequest: this.disabled = false"
              class="px-4 py-2 bg-red-900 rounded hover:bg-opacity-80"
              @click="favorite = false"
            >
              Plus intéressé
            </button>
          </div>
          <button @click="isOpen = false" class="ml-auto bg-red-700 hover:bg-red-800 px-4 py-2 rounded mt-4">
            Fermer
          </button>

        </div>
      </div>
    `;

    res.send(eventHtml);  // Envoi de la vue complète à la demande
  } catch (err) {
    console.error("Erreur lors de la récupération des détails de l'événement", err);
    res.status(500).json({
      error: "Erreur lors de la récupération des détails de l'événement",
    });
  }
});


//inscription
app.post("/api/register", async (req, res) => {
  const { username, email, password } = req.body;

  // Vérification de l'existence de l'utilisateur
  const result = await pgClient.query("SELECT * FROM users WHERE email = $1", [
    email,
  ]);
  if (result.rows.length > 0) {
    return res.status(400).json({ error: "Email déjà utilisé" });
  }
  const resultUsername = await pgClient.query(
    "SELECT * FROM users WHERE username = $1",
    [username]
  );
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
  const result = await pgClient.query("SELECT * FROM users WHERE email = $1", [
    email,
  ]);
  if (result.rows.length === 0) {
    return res.status(400).json({ error: "Utilisateur introuvable" });
  }

  const user = result.rows[0];

  // Vérification du mot de passe
  if (password === user.password) {
    console.log("Connexion réussie (mot de passe en clair)");
  } else {
    const isMatch = await bcrypt.compare(password, user.password);
    if (isMatch) {
      console.log("Connexion réussie (mot de passe haché)");
    } else {
      return res.status(400).json({ error: "Mot de passe incorrect" });
    }
  }
  // Création du token JWT
  const token = jwt.sign(
    { userId: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "1h" },
    console.log("token créé")
  );

  // Renvoi du token JWT dans la réponse
  res.json({ message: "Connexion réussie", token });
});

// Route pour les orga - créer un événement
app.post(
  "/api/events",
  authenticateToken,
  checkRole(["orga", "admin"]),
  async (req, res) => {
    const { title, description, players_count, start_datetime, end_datetime } = req.body;
    const userId = req.user.userId;

    // Logique pour créer un événement
    await pgClient.query(
      "INSERT INTO events (title, description, players_count, start_datetime, end_datetime, user_id) VALUES ($1, $2, $3, $4, $5, $6)",
      [title, description, players_count, start_datetime, end_datetime, userId]
    );
    res.json({
      message: "Événement créé avec succès, en attente de validation",
    });
  }
);


// Démarrer le serveur
const PORT = process.env.PORT || 3000; // Définit le port sur lequel le serveur doit écouter
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
