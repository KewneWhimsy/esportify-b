const { pgClient } = require("../../config/dbConnection.js");
const jwt = require("jsonwebtoken");
const { backendUrl } = require("../../config/backendUrl.js");

//Renvoi un tableau contenant tout les événements
module.exports.getAllEvents = async (req, res) => {
  console.log("GET AllEvents");
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
        hx-get="${backendUrl}/api/event/${event.id}"
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
  console.log("GET EventById");
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
    let userRole = req.user || "visiteur";
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
    const isFavorited = userId
      ? (
          await pgClient.query(
            "SELECT 1 FROM favorites WHERE user_id = $1 AND event_id = $2",
            [userId, id]
          )
        ).rowCount > 0
      : false;

    const now = Date.now() + 3600000; // +1h en millisecondes
    const startTime = new Date(event.start_datetime).getTime();
    const endTime = new Date(event.end_datetime).getTime();

    const isOngoing = startTime <= now && now <= endTime;

    console.log("isOngoing :", isOngoing);
    console.log("start_datetime (DB):", event.start_datetime);
    console.log("end_datetime (DB):", event.end_datetime);
    console.log("start:", new Date(startTime).toISOString());
    console.log("end:", new Date(endTime).toISOString());
    console.log("now:", now);
    console.log("isOngoing condition 1:", startTime <= now);
    console.log("isOngoing condition 2:", now <= endTime);
    console.log("Final isOngoing:", isOngoing);

    const eventHtml = `
  <div x-data="{ rolee: '${userRole}', favorite: ${isFavorited}, ongoing: ${isOngoing} }" 
  x-init="console.log('Initialisation :', { rolee, favorite, ongoing })"
  class="border border-gray-300 p-6 rounded-lg shadow-lg w-full"
  >
    <h2 class="text-2xl font-bold mb-4 font-heading text-heading leading-tight">${
      event.title
    }</h2>
    <p class="mb-4">${event.description}</p>
    <p><strong>Joueurs :</strong> ${event.players_count}</p>
    <p><strong>Organisateur :</strong> ${event.organisateur}</p>
    <p><strong>Début :</strong> ${new Date(
      event.start_datetime
    ).toLocaleString()}</p>
    <p><strong>Fin :</strong> ${new Date(
      event.end_datetime
    ).toLocaleString()}</p>

    <div class="flex justify-between mt-10">
      <!-- Boutons pour participer -->
      <div x-show="rolee === 'joueur' || rolee === 'admin' || rolee === 'orga'" 
      
      :class="{ 'hidden': rolee === 'visiteur' }"
      >
        <div class="flex gap-2">
          <!-- Bouton pour ajouter aux favoris -->
          <div id="favorite-button" class="contents">
          <button
            x-show="!favorite"
            hx-post="${backendUrl}/api/favorites"
            hx-target="#favorite-button"
            hx-vals='${JSON.stringify({
              event_id: id,
              user_id: userId,
              isFavorited: true,
            })}'
            hx-headers='{"Content-Type": "application/json"}'
            hx-encoding="json"
            hx-swap="innerHTML"
            class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            Je participe
          </button>

          <!-- Bouton pour retirer des favoris -->
          <button
            x-show="favorite"
            hx-post="${backendUrl}/api/favorites"
            hx-target="#favorite-button"
            hx-vals='${JSON.stringify({
              event_id: id,
              user_id: userId,
              isFavorited: false,
            })}'
            hx-headers='{"Content-Type": "application/json"}'
            hx-encoding="json"
            hx-swap="innerHTML"
            class="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors select-none"
          >
            Plus intéressé
          </button>
          </div>
          <!-- Bouton Rejoindre -->
          <div x-show="ongoing">
          <button  
            id="boutonRejoindre"
            hx-get="${backendUrl}/api/room/${id}"
            hx-target="#chatcontain"
            class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors select-none"
          >
            Rejoindre
          </button>
        </div>
       </div> 
      </div>
      <!-- Bouton Fermer -->
      <button
        @click="isOpen = false"
        class="ml-auto bg-red-700 text-white px-4 py-2 rounded hover:bg-red-800 transition-colors select-none"
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
  console.log("POST createEvent");
  const { title, description, players_count, start_datetime, end_datetime } =
    req.body;
  const { userId, role } = req.user;

  // Validation des données

  if (new Date(start_datetime) >= new Date(end_datetime)) {
    return res.send(
      '<p class="text-red-500">La date de début doit être avant la date de fin.</p>'
    );
  }

  if (isNaN(new Date(start_datetime)) || isNaN(new Date(end_datetime))) {
    return res.send(
      '<p class="text-red-500">Les dates fournies ne sont pas valides.</p>'
    );
  }

  try {
    // Déterminer la valeur de is_approved
    const is_approved = role === "admin" ? true : false;

    // Insérer dans la base de données
    const result = await pgClient.query(
      `INSERT INTO events (title, description, players_count, is_approved, start_datetime, end_datetime, user_id) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [
        title,
        description,
        players_count,
        is_approved,
        start_datetime,
        end_datetime,
        userId,
      ]
    );

    res
      .status(200)
      .send(
        `<p class="text-green-500">Événement créé avec succès !<br>(en attente de modération)</p>`
      );
  } catch (err) {
    console.error(err);
    console.error("Code d'erreur :", err.code);
    console.error("Message d'erreur :", err.message);
    // Gérer les erreurs spécifiques de la base de données
    if (err.code === "P0001") {
      // Custom PostgreSQL error code for overlap
      return res.send(`<div class="text-red-500">
        Il existe déjà un événement qui se chevauche avec celui-ci.
      </div>`);
    } else if (err.code === "23505") {
      return res.send(
        '<p class="text-red-500">Un événement similaire existe déjà.</p>'
      );
    } else if (err.code === "23514") {
      return res.send(
        '<p class="text-red-500">Les données fournies ne respectent pas les contraintes.</p>'
      );
    } else if (err.code === "23503") {
      return res.send(
        '<p class="text-red-500">Utilisateur non trouvé. Veuillez vous reconnecter.</p>'
      );
    } else {
      return res.send(
        '<p class="text-red-500">Erreur interne du serveur. Veuillez réessayer plus tard.</p>'
      );
    }
  }
};

module.exports.getMyEvents = async (req, res) => {
  console.log("GET MyEvents");
  // Tentative de décoder le token JWT si présent pour savoir si l'utilisateur est connecté
  let userId = req.user || null;
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const token = authHeader.split(" ")[1];
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      userId = decoded.userId;
    } catch (err) {
      console.error("Erreur lors du décodage du token JWT", err);
    }
  }

  try {
    console.log("userId :", userId);
    const sortField = req.query.sort || "start_datetime"; // Tri par défaut : date
    const validSortFields = ["players_count", "start_datetime", "organisateur"];
    const orderBy = validSortFields.includes(sortField)
      ? sortField
      : "start_datetime";
    const sortColumn =
      orderBy === "organisateur" ? "u.username" : `e.${orderBy}`;

    // Récupère les événements créés par l'utilisateur connecté
    console.log("Sort Column :", sortColumn);
    const result = await pgClient.query(
      `
      SELECT e.id, e.title, e.description, e.players_count, e.start_datetime, e.end_datetime, e.is_approved, u.username AS organisateur
      FROM events e
      JOIN users u ON e.user_id = u.id
      WHERE e.user_id = $1
      ORDER BY ${sortColumn} DESC
      LIMIT 10
    `,
      [userId]
    );

    const events = result.rows; // Récupère les événements sous forme d'un tableau d'objets JavaScript
    let eventsHtml = "";

    if (events.length === 0) {
      // Si aucun événement n'est trouvé, afficher un message
      eventsHtml = `
        <div class="flex text-center mx-auto">
          <p class="text-2xl">⬆️</p>
        </div>
      `;
    } else {
      // Génère du HTML pour chaque événement
      events.forEach((event) => {
        const approvalStatus = event.is_approved ? "Accepté" : "En attente"; // Affiche le statut d'acceptation
        eventsHtml += `
        <div class="flex flex-col justify-between bg-[#26232A] border 
        border-[#E5E7EB] p-4 rounded-lg w-64 shadow-md hover:shadow-lg transition-transform hover:scale-105 cursor-pointer flex-shrink-0 gap-0.5" 
        @click="setTimeout(() => { isOpen = true }, 200)"
        hx-get="${backendUrl}/api/myevent/${event.id}"
        hx-target="#popup-content"
        hx-swap="innerHTML"
        >
          <div>
            <h2 id="titreMyEvent" class="text-lg font-heading text-myEvent leading-tight mb-2">
              ${event.title}
            </h2>
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
            <p class="text-sm text-yellow-600">Statut : ${approvalStatus}</p>  <!-- Affiche le statut d'acceptation -->
          </div>
        </div>
      `;
      });
    }

    // Renvoie le fragment HTML à HTMX
    console.log("Événements récupérés avec succès");
    res.send(eventsHtml);
  } catch (err) {
    console.error("Erreur dans getMyEvents :", err);
    res.status(500).json({
      error: "Erreur serveur lors de la récupération de vos événements",
    });
  }
};

//Renvoie la vue détaillée d'un événement + bouton toggle favoris pour l'utilisateur connecté
module.exports.myEventById = async (req, res) => {
  console.log("GET myEventById");
  const eventId = req.params.eventId;
  console.log(eventId);

  try {
    const result = await pgClient.query(
      `
      SELECT e.id, e.title, e.description, e.players_count, e.start_datetime, e.end_datetime, u.username AS organisateur
      FROM events e
      JOIN users u ON e.user_id = u.id
      WHERE e.id = $1
    `,
      [eventId]
    );
    if (result.rows.length === 0) {
      return res.status(404).send("<p>Événement non trouvé</p>");
    }
    const event = result.rows[0];

    const eventHtml = `
  <div
  class="relative border border-gray-300 rounded-lg shadow-lg overflow-y-auto"
  >
    <button class="absolute p-1 right-1 text-xl select-none" @click="isOpen = false">X</button>
    <form
    class="inset-0 w-full rounded max-w-[900px] max-h-[90vh] mx-auto items-center justify-center z-50 px-5 pt-3 transition-opacity"
    hx-post="${backendUrl}/api/events/update/${
      event.id
    }"
    hx-on::after-request="htmx.trigger('body', 'refresh')"
    hx-target="#form-messageup"
    hx-swap="innerHTML"
    class="space-y-4"
  >
    <!-- Titre -->
    <div>
      <label for="title" class="block text-sm font-medium"
        >Titre</label
      >
      <input
        type="text"
        id="title"
        name="title"
        class="bg-[#161215] text-text w-full mt-1 border rounded px-3 py-2"
        value="${event.title}"
      />
    </div>

    <!-- Description -->
    <div>
      <label for="description" class="block text-sm font-medium"
        >Description</label
      >
      <textarea
        id="description"
        name="description"
        class="bg-[#161215] text-text mt-1 border rounded px-3 py-2 w-full min-h-60 min-w-72"
      >${event.description}</textarea>
    </div>

    <!-- Nombre de joueurs -->
    <div>
      <label for="players_count" class="block text-sm font-medium"
        >Nombre de joueurs</label
      >
      <input
        type="number"
        id="players_count"
        name="players_count"
        min="2"
        class="bg-[#161215] text-text w-full mt-1 border rounded px-3 py-2"
        value="${event.players_count}"
      />
    </div>

    <!-- Date et heure de début -->
    <div>
      <label for="start_datetime" class="block text-sm font-medium"
        >Date et heure de début</label
      >
      <input
        type="datetime-local"
        id="start_datetime"
        name="start_datetime"
        class="bg-[#161215] text-text w-full mt-1 border rounded px-3 py-2"
        value="${new Date(event.start_datetime).toISOString().slice(0, -1)}"
      />
    </div>

    <!-- Date et heure de fin -->
    <div>
      <label for="end_datetime" class="block text-sm font-medium"
        >Date et heure de fin</label
      >
      <input
        type="datetime-local"
        id="end_datetime"
        name="end_datetime"
        class="bg-[#161215] text-text w-full mt-1 border rounded px-3 py-2"
        value="${new Date(event.end_datetime).toISOString().slice(0, -1)}"
      />
    </div>
    <div class="flex flex-col gap-4 justify-center">
    <!-- Soumettre -->
    <div>
      <button
        type="submit"
        class="w-full bg-[#5e3554] hover:bg-yellow-600 hover:text-shadow px-4 py-2 mt-5 rounded transition-colors select-none"
      >
        Mettre à jour
      </button>
    </div>
    <!-- Supprimer -->
    
      <button
        type="button"
        class="ml-auto bg-red-900 gap-1 px-1 py-1 rounded hover:bg-red-800 transition-colors select-none"
        hx-delete="${backendUrl}/api/events/deleteMy/${
          event.id
        }"
        hx-confirm="Êtes-vous sûr de vouloir supprimer cet événement ?"
        hx-on::after-request="htmx.trigger('body', 'refresh')"
        hx-target="#form-messageup"
        hx-swap="innerHTML"
      >
        🔥
      </button>
      
    
    </div>
    <!-- Message de retour -->
    <div id="form-messageup" class="text-sm text-center mt-4"></div>
    <style>
    input[type="datetime-local"]::-webkit-calendar-picker-indicator {
      filter: invert(1); /* Icone blanche */
    }
    </style>
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

module.exports.updateEvent = async (req, res) => {
  console.log("POST updateEvent");
  const { title, description, players_count, start_datetime, end_datetime } =
    req.body;
  const { userId, role } = req.user;
  console.log(userId);
  const eventId = req.params.eventId;
  console.log(eventId);

  // Validation des données
  if (new Date(start_datetime) >= new Date(end_datetime)) {
    return res.send(
      '<p class="text-red-500">La date de début doit être avant la date de fin.</p>'
    );
  }

  if (isNaN(new Date(start_datetime)) || isNaN(new Date(end_datetime))) {
    return res.send(
      '<p class="text-red-500">Les dates fournies ne sont pas valides.</p>'
    );
  }

  try {
    // Vérifier si l'événement existe
    const eventResult = await pgClient.query(
      "SELECT * FROM events WHERE id = $1 AND user_id = $2",
      [eventId, userId]
    );
    if (eventResult.rowCount === 0) {
      return res.send(
        '<p class="text-red-500">Événement non trouvé ou vous n\'êtes pas autorisé à le modifier.</p>'
      );
    }

    const overlappingEvents = await pgClient.query(
      `SELECT * FROM events 
       WHERE user_id = $4 AND id != $1 AND (
         (start_datetime < $2 AND end_datetime > $2) OR
         (start_datetime < $3 AND end_datetime > $3) OR
         (start_datetime >= $2 AND end_datetime <= $3)
       )`,
      [eventId, start_datetime, end_datetime, userId]
    );
    if (overlappingEvents.rowCount > 0) {
      return res.send(
        '<p class="text-red-500">Il existe déjà un événement qui se chevauche avec celui-ci.</p>'
      );
    }
    if (new Date(start_datetime) >= new Date(end_datetime)) {
      return res.send("La date de début doit être avant la date de fin.");
    }
    // Déterminer la valeur de is_approved
    const is_approved = role === "admin" ? true : false;

    // Mettre à jour l'événement
    const updateResult = await pgClient.query(
      `UPDATE events 
       SET title = $1, description = $2, players_count = $3, is_approved = $4, start_datetime = $5, end_datetime = $6
       WHERE id = $7 AND user_id = $8 RETURNING id`,
      [
        title,
        description,
        players_count,
        is_approved,
        start_datetime,
        end_datetime,
        eventId,
        userId,
      ]
    );

    if (updateResult.rowCount === 0) {
      return res.send(
        '<p class="text-red-500">Erreur lors de la mise à jour de l\'événement.</p>'
      );
    }

    res
      .status(200)
      .send(
        '<p class="text-green-500">Événement mis à jour avec succès !<br/>(en attente de modération)</p>'
      );
  } catch (err) {
    console.error(err);
    console.error("Code d'erreur :", err.code);
    console.error("Message d'erreur :", err.message);
    // Gérer les erreurs spécifiques de la base de données
    if (err.code === "P0001") {
      // Custom PostgreSQL error code for overlap
      return res.send(`<div class="text-red-500">
        Il existe déjà un événement qui se chevauche avec celui-ci.É
      </div>`);
    } else if (err.code === "23505") {
      return res.send(
        '<p class="text-red-500">Un événement similaire existe déjà.</p>'
      );
    } else if (err.code === "23514") {
      return res.send(
        '<p class="text-red-500">Les données fournies ne respectent pas les contraintes.</p>'
      );
    } else if (err.code === "23503") {
      return res.send(
        '<p class="text-red-500">Utilisateur non trouvé. Veuillez vous reconnecter.</p>'
      );
    } else {
      return res.send(
        '<p class="text-red-500">Erreur interne du serveur. Veuillez réessayer plus tard.</p>'
      );
    }
  }
};

module.exports.deleteMy = async (req, res) => {
  console.log("DELETE deleteMy");
  const eventId = req.params.eventId;
  console.log(`Refus de l'événement ${eventId}`);
  try {
    await pgClient.query(
      `
      DELETE FROM events 
      WHERE id = $1
    `,
      [eventId]
    );

    res.send('<p class="text-red-500">Événement supprimé.</p>');
  } catch (err) {
    console.error("Erreur dans rejectEvent :", err);
    res.status(500).send("Erreur serveur lors du refus de l'événement");
  }
};
