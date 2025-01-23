const { pgClient } = require("../../config/dbConnection.js");

// Renvoi un tableau contenant les événements en attente de modération
module.exports.getPendingEvents = async (req, res) => {
  console.log("Requête reçue pour récupérer les événements en attente");
  try {
    const result = await pgClient.query(`
      SELECT e.id, e.title, e.description, e.players_count, 
             e.start_datetime, e.end_datetime, u.username AS organisateur
      FROM events e
      JOIN users u ON e.user_id = u.id
      WHERE e.is_approved = FALSE
      ORDER BY e.start_datetime DESC
    `);

    const events = result.rows;
    let eventsHtml = "";

    events.forEach((event) => {
      eventsHtml += `
        <tr class="border-b">
          <td class="px-4 py-3">${event.title}</td>
          <td class="px-4 py-3 text-yellow-600">En attente</td>
          <td class="px-4 py-3 flex flex-wrap gap-2">
            <button
              hx-post="/admin/events/approve/${event.id}"
              hx-swap="outerHTML"
              class="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
            >
              Valider
            </button>
            <button
              hx-post="/admin/events/reject/${event.id}"
              hx-swap="outerHTML"
              class="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Refuser
            </button>
          </td>
        </tr>
      `;
    });

    res.send(eventsHtml);
  } catch (err) {
    console.error("Erreur dans getPendingEvents :", err);
    res.status(500).send("Erreur serveur lors de la récupération des événements");
  }
};

// Renvoi un tableau contenant les événements validés
module.exports.getApprovedEvents = async (req, res) => {
  console.log("Requête reçue pour récupérer les événements validés");
  try {
    const result = await pgClient.query(`
      SELECT e.id, e.title, e.description, e.players_count, 
             e.start_datetime, e.end_datetime, u.username AS organisateur
      FROM events e
      JOIN users u ON e.user_id = u.id
      WHERE e.is_approved = TRUE
      ORDER BY e.start_datetime DESC
    `);

    const events = result.rows;
    let eventsHtml = "";

    events.forEach((event) => {
      eventsHtml += `
        <tr class="border-b">
          <td class="px-4 py-3">${event.title}</td>
          <td class="px-4 py-3 text-green-600">Validé</td>
          <td class="px-4 py-3">
            <button
              hx-post="/admin/events/suspend/${event.id}"
              hx-swap="outerHTML"
              class="px-3 py-1 bg-orange-600 text-white rounded hover:bg-orange-700"
            >
              Suspendre
            </button>
          </td>
        </tr>
      `;
    });

    res.send(eventsHtml);
  } catch (err) {
    console.error("Erreur dans getApprovedEvents :", err);
    res.status(500).send("Erreur serveur lors de la récupération des événements");
  }
};

// Approuver un événement
module.exports.approveEvent = async (req, res) => {
  const eventId = req.params.eventId;
  console.log(`Approbation de l'événement ${eventId}`);
  try {
    await pgClient.query(`
      UPDATE events 
      SET is_approved = TRUE
      WHERE id = $1
    `, [eventId]);

    // Renvoi le nouvel état de la ligne
    const result = await pgClient.query(`
      SELECT e.id, e.title, e.description, e.players_count, 
             e.start_datetime, e.end_datetime, u.username AS organisateur
      FROM events e
      JOIN users u ON e.user_id = u.id
      WHERE e.id = $1
    `, [eventId]);

    const event = result.rows[0];
    res.send(`
      <tr class="border-b">
        <td class="px-4 py-3">${event.title}</td>
        <td class="px-4 py-3 text-green-600">Validé</td>
        <td class="px-4 py-3">
          <button
            hx-post="/admin/events/suspend/${event.id}"
            hx-swap="outerHTML"
            class="px-3 py-1 bg-orange-600 text-white rounded hover:bg-orange-700"
          >
            Suspendre
          </button>
        </td>
      </tr>
    `);
  } catch (err) {
    console.error("Erreur dans approveEvent :", err);
    res.status(500).send("Erreur serveur lors de l'approbation de l'événement");
  }
};

// Refuser un événement
module.exports.rejectEvent = async (req, res) => {
  const eventId = req.params.eventId;
  console.log(`Refus de l'événement ${eventId}`);
  try {
    await pgClient.query(`
      DELETE FROM events 
      WHERE id = $1
    `, [eventId]);

    res.send("");
  } catch (err) {
    console.error("Erreur dans rejectEvent :", err);
    res.status(500).send("Erreur serveur lors du refus de l'événement");
  }
};

// Suspendre un événement (réinitialiser is_approved à FALSE)
module.exports.suspendEvent = async (req, res) => {
  const eventId = req.params.eventId;
  console.log(`Suspension de l'événement ${eventId}`);
  try {
    // Met à jour l'état de l'événement à "non apprové"
    await pgClient.query(`
      UPDATE events 
      SET is_approved = FALSE
      WHERE id = $1
    `, [eventId]);

    // Renvoi le nouvel état de la ligne
    const result = await pgClient.query(`
      SELECT e.id, e.title, e.description, e.players_count, 
             e.start_datetime, e.end_datetime, u.username AS organisateur
      FROM events e
      JOIN users u ON e.user_id = u.id
      WHERE e.id = $1
    `, [eventId]);

    const event = result.rows[0];
    
    // Génère le HTML pour la ligne modifiée
    res.send(`
      <tr class="border-b">
        <td class="px-4 py-3">${event.title}</td>
        <td class="px-4 py-3 text-yellow-600">En attente</td>
        <td class="px-4 py-3 flex flex-wrap gap-2">
          <button
            hx-post="/api/events/approve/${event.id}"
            hx-swap="outerHTML"
            class="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Valider
          </button>
          <button
            hx-post="/api/events/reject/${event.id}"
            hx-swap="outerHTML"
            class="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Refuser
          </button>
        </td>
      </tr>
    `);
  } catch (err) {
    console.error("Erreur dans suspendEvent :", err);
    res.status(500).send("Erreur serveur lors de la suspension de l'événement");
  }
};