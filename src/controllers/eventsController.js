const { pgClient } = require("../../config/dbConnection.js");
const jwt = require('jsonwebtoken');

//Renvoi un tableau contenant tout les événements
module.exports.getAllEvents = async (req, res) => {
  console.log("Requête reçue pour récupérer tous les événements");
  try {
    const sortField = req.query.sort || "start_datetime"; // Tri par défaut : date
    const validSortFields = ["players_count", "start_datetime", "organisateur"];
    const orderBy = validSortFields.includes(sortField)
      ? sortField
      : "start_datetime";
    const sortColumn =
      orderBy === "organisateur" ? "u.username" : `e.${orderBy}`;

    // Récupére les événements depuis PostgreSQL
    const result = await pgClient.query(`
      SELECT e.id, e.title, e.description, e.players_count, e.start_datetime, e.end_datetime, u.username AS organisateur
      FROM events e
      JOIN users u ON e.user_id = u.id
      WHERE e.is_approved = TRUE
      ORDER BY ${sortColumn} DESC
      LIMIT 10
    `);

    const events = result.rows; // Récupére les événements sous forme d'un tableau d'objets JavaScript
    let eventsHtml = "";
    // Génére du HTML pour chaque événement
    events.forEach((event) => {
      eventsHtml += `
        <div class="flex flex-col justify-between bg-[#26232A] border 
        border-[#E5E7EB] p-4 rounded-lg w-64 shadow-md hover:shadow-lg transition-transform hover:scale-105 cursor-pointer flex-shrink-0 gap-0.5" 
        @click="setTimeout(() => { isOpen = true }, 200)"
        hx-get="https://esportify-backend.onrender.com/api/event/${event.id}"
        hx-target="#popup-content"
        hx-swap="innerHTML"
        >
          <div>
            <h2 class="text-lg font-heading text-heading leading-tight mb-2">${
              event.title
            }</h2>
          </div>
          <div>
            <p class="text-sm text-gray-400">Joueurs : ${
              event.players_count
            }</p>
            <p class="text-sm">Début : ${new Date(
              event.start_datetime
            ).toLocaleString()}</p>
            <p class="text-sm">Fin : ${new Date(
              event.end_datetime
            ).toLocaleString()}</p>
          </div>
        </div>
      `;
    });

    // Renvoi le fragment HTML à HTMX
    console.log("Événements récupérés avec succès");
    res.send(eventsHtml);
  } catch (err) {
    console.error("Erreur dans getAllEvents :", err);
    res
      .status(500)
      .json({ error: "Erreur serveur lors de la récupération des événements" });
  }
};

//Renvoie la vue détaillée d'un événement + bouton toggle favoris pour l'utilisateur connecté
module.exports.getEventById = async (req, res) => {
  const { id } = req.params;

  try {
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
    let userRole = req.user || 'visiteur';
    console.log("Rôle userRole avant décodage jwt :", userRole);
    let userId = req.user || null;
    const authHeader = req.headers.authorization;
    if (authHeader) {
      const token = authHeader.split(" ")[1];
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        userRole = decoded.role;
        userId = decoded.userId;

        console.log("Rôle userRole après  décodage jwt :", userRole);

      } catch (err) {
        console.error("Erreur lors du décodage du token JWT", err);
      }
    }

    // Vérifier si l'utilisateur a déjà favorisé cet événement
    const isFavorited = userId? (await pgClient.query(
      "SELECT 1 FROM favorites WHERE user_id = $1 AND event_id = $2",
      [userId, id]
    )).rowCount > 0 : false;

    const eventHtml = `
  <div x-data="{ rolee: '${userRole}', favorite: ${isFavorited} }" 
  class="border border-gray-300 p-6 rounded-lg shadow-lg w-full"
  >
    <h2 class="text-2xl font-bold mb-4 text-white">${event.title}</h2>
    <p class="text-lg text-gray-300 my-10>${event.description}</p>
    <p class="text-gray-300"><strong>Joueurs :</strong> ${event.players_count}</p>
    <p class="text-gray-300"><strong>Organisateur :</strong> ${event.organisateur}</p>
    <p class="text-gray-300"><strong>Début :</strong> ${new Date(event.start_datetime).toLocaleString()}</p>
    <p class="text-gray-300"><strong>Fin :</strong> ${new Date(event.end_datetime).toLocaleString()}</p>

    <div class="flex justify-between mt-10">
      <!-- Boutons pour participer -->
      <div x-show="rolee === 'joueur' || rolee === 'admin' || rolee === 'orga'" 
      id="favorite-button"
      :class="{ 'hidden': rolee === 'visiteur' }"
      >
        <!-- Bouton pour ajouter aux favoris -->
        <button
          x-show="!favorite"
          hx-post="https://esportify-backend.onrender.com/api/favorites"
          hx-target="#favorite-button"
          hx-vals='${JSON.stringify({
            event_id: id,
            user_id: userId,
            isFavorited: true,
          })}'
          hx-headers='{"Content-Type": "application/json"}'
          hx-encoding="json"
          hx-swap="innerHTML"
          class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Je participe
        </button>

        <!-- Bouton pour retirer des favoris -->
        <button
          x-show="favorite"
          hx-post="https://esportify-backend.onrender.com/api/favorites"
          hx-target="#favorite-button"
          hx-vals='${JSON.stringify({
            event_id: id,
            user_id: userId,
            isFavorited: false,
          })}'
          hx-headers='{"Content-Type": "application/json"}'
          hx-encoding="json"
          hx-swap="innerHTML"
          class="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Plus intéressé
        </button>
      </div>
      <button
        @click="isOpen = false"
        class="ml-auto bg-red-700 text-white px-4 py-2 rounded hover:bg-red-800"
      >
        Fermer
      </button>
    </div>
  </div>
`;

    res.send(eventHtml);
  } catch (err) {
    console.error(
      "Erreur lors de la récupération des détails de l'événement",
      err
    );
    res.status(500).json({
      error: "Erreur lors de la récupération des détails de l'événement",
    });
  }
};

module.exports.createEvent = async (req, res) => {
  const { title, description, players_count, start_datetime, end_datetime } = req.body;
  const { userId } = req.user;

  // Validation des données
  
  if (new Date(start_datetime) >= new Date(end_datetime)) {
    res.send('<p class="text-red-500">La date de début doit être avant la date de fin.</p>');
    return res.status(400).send('<p class="text-red-500">La date de début doit être avant la date de fin.</p>');
  }

  if (isNaN(new Date(start_datetime)) || isNaN(new Date(end_datetime))) {
    res.send('<p class="text-red-500">Les dates fournies ne sont pas valides.</p>');
    return res.status(400).send('<p class="text-red-500">Les dates fournies ne sont pas valides.</p>');
  }  

  try {
    // Insérer dans la base de données
    const result = await pgClient.query(
      `INSERT INTO events (title, description, players_count, start_datetime, end_datetime, user_id) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [title, description, players_count, start_datetime, end_datetime, userId]
    );

    res.status(200).send(`<p class="text-green-500">Événement créé avec succès !</p>`);
  } catch (err) {
    console.error(err);
    console.error('Code d\'erreur :', err.code);
    console.error('Message d\'erreur :', err.message);
    // Gérer les erreurs spécifiques de la base de données
    if (err.code === 'P0001') {  // Custom PostgreSQL error code for overlap
      return res.send(`<div class="text-red-500 text-white p-4 rounded">
        Il existe déjà un événement qui se chevauche avec celui-ci.
      </div>`);
    } else if (err.code === '23505') {
      return res.send('<p class="text-red-500">Un événement similaire existe déjà.</p>');
    } else if (err.code === '23514') {
      return res.send('<p class="text-red-500">Les données fournies ne respectent pas les contraintes.</p>');
    } else if (err.code === '23503') {
      return res.send('<p class="text-red-500">Utilisateur non trouvé. Veuillez vous reconnecter.</p>');
    } else {
      return res.send('<p class="text-red-500">Erreur interne du serveur. Veuillez réessayer plus tard.</p>');
    }
  }
};

// Route pour les administrateurs - approuver un événement
module.exports.approveEvent = async (req, res) => {
  const eventId = req.params.id;

  // Logique pour approuver l'événement
  await pgClient.query("UPDATE events SET is_approved = TRUE WHERE id = $1", [
    eventId,
  ]);
  res.json({ message: "Événement approuvé" });
};
