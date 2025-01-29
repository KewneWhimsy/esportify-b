const { pgClient } = require("../../config/dbConnection.js");
const jwt = require("jsonwebtoken");

// Route pour ajouter ou retirer un favori
module.exports.toggleFavorite = async (req, res) => {
  const { event_id, user_id, isFavorited } = req.body;

  console.log("isFavorited:", isFavorited, "Type:", typeof isFavorited);
  let isFavoritedBool = isFavorited === true || isFavorited === "true";
  console.log("isFavoritedBool:", isFavoritedBool);

  try {
    // Fonction pour mettre à jour les favoris
    if (isFavoritedBool) {
      // Ajouter un favori
      await pgClient.query(
        `INSERT INTO favorites (user_id, event_id) VALUES ($1, $2)
         ON CONFLICT (user_id, event_id) DO NOTHING`, // Empêche les doublons
        [user_id, event_id]
      );
      console.log(`Favori ajouté : user_id=${user_id}, event_id=${event_id}`);
    } else {
      // Supprimer un favori
      await pgClient.query(
        `DELETE FROM favorites WHERE user_id = $1 AND event_id = $2`,
        [user_id, event_id]
      );
    }
    console.log(
      `Favori mis à jour : user_id=${user_id}, event_id=${event_id}, isFavorited=${isFavorited}`
    );
  } catch (error) {
    console.error(
      "Erreur lors de la mise à jour de la base de données :",
      error
    );
    throw error;
  }
  // Génération du bouton mis à jour

  const buttonHtml = isFavoritedBool
    ? `<div x-show="favorite">
          <!-- Bouton pour retirer des favoris -->
          <button
            x-show="!ongoing"
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
          <!-- Bouton Rejoindre -->
          <button
            x-show="ongoing"
            id="boutonRejoindre"
            hx-get="https://esportify-backend.onrender.com/api/room/${event_id}"
            hx-target="body"
            hx-push-url="/event/${event_id}/room"
            class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Rejoindre
          </button>
        </div>`
    : `<button
           hx-post="https://esportify-backend.onrender.com/api/favorites"
           hx-target="#favorite-button"
          hx-vals='${JSON.stringify({
            event_id: event_id,
            user_id: user_id,
            isFavorited: true,
          })}'
          hx-headers='{"Content-Type": "application/json"}'
          hx-encoding="json"
           hx-swap="innerHTML"
           class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
         >
           Je participe
         </button>`;

  console.log("HTML envoyé au client :", buttonHtml);
  res.send(buttonHtml);
};

module.exports.showFavorited = async (req, res) => {
  let userRole = "visiteur";
  let userId = null;
  const authHeader = req.headers.authorization;

  if (authHeader) {
    const token = authHeader.split(" ")[1];
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      userRole = decoded.role;
      userId = decoded.userId;
      console.log("Rôle userRole après décodage jwt :", userRole);
    } catch (err) {
      console.error("Erreur lors du décodage du token JWT", err);
    }
  }

  console.log(
    `Requête reçue pour les événements favoris de l'utilisateur ${userId}`
  );

  try {
    const sortField = req.query.sort || "start_datetime";
    const validSortFields = ["players_count", "start_datetime", "organisateur"];
    const orderBy = validSortFields.includes(sortField)
      ? sortField
      : "start_datetime";
    const sortColumn = orderBy === "organisateur" ? "u.username" : `e.${orderBy}`;

    const result = await pgClient.query(
      `
      SELECT 
        e.id, 
        e.title, 
        e.description, 
        e.players_count, 
        e.start_datetime, 
        e.end_datetime, 
        u.username AS organisateur
      FROM events e
      JOIN users u ON e.user_id = u.id
      JOIN favorites f ON f.event_id = e.id
      WHERE f.user_id = $1
      ORDER BY ${sortColumn} ASC
      `,
      [userId]
    );

    const events = result.rows;
    let eventsHtml = "";

    if (events.length === 0) {
      // Si aucun événement favori n'est trouvé, afficher un message
      eventsHtml = `
        <div class="flex text-center mx-auto">
          <p>Pas encore d'événement favoris</p>
        </div>
      `;
    } else {
      // Sinon, générer le HTML pour les événements
      events.forEach((event) => {
        eventsHtml += `
          <div id="event-${event.id}" class="flex flex-col justify-between bg-[#26232A] border 
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
    }

    res.send(eventsHtml);
  } catch (err) {
    console.error("Erreur dans showFavorited :", err);
    res.status(500).json({
      error: "Erreur serveur lors de la récupération des événements favoris",
    });
  }
};

