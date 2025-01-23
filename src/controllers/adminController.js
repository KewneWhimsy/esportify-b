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
        <tr id="event-pend-${event.id}" class="border-b">
          <td class="px-4 py-3">${event.title}</td>
          <td class="px-4 py-3 text-yellow-600">En attente</td>
          <td class="px-4 py-3 flex flex-wrap gap-2">
            <button
              hx-post="https://esportify-backend.onrender.com/admin/events/approve/${event.id}"
              hx-swap="afterbegin"
              hx-target="#approvedEvents"
              class="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
            >
              Valider
            </button>
            <button
              hx-post="https://esportify-backend.onrender.com/admin/events/reject/${event.id}"
              hx-swap="delete"
              hx-target="#event-pend-${event.id}"
              class="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Refuser
            </button>
          </td>
          <script>
            document.getElementById('event-val-${event.id}').remove();
          </script>
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
        <tr id="event-val-${event.id}" class="border-b">
          <td class="px-4 py-3">${event.title}</td>
          <td class="px-4 py-3 text-green-600">Validé</td>
          <td class="px-4 py-3">
            <button
              hx-post="https://esportify-backend.onrender.com/admin/events/suspend/${event.id}"
              hx-swap="afterbegin"
              hx-target="#pendingEvents"
              class="px-3 py-1 bg-orange-600 text-white rounded hover:bg-orange-700"
            >
              Suspendre
            </button>
          </td>
          <script>
            document.getElementById('event-pend-${event.id}').remove();
          </script>
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
      <tr id="event-val-${event.id}" class="border-b">
        <td class="px-4 py-3">${event.title}</td>
        <td class="px-4 py-3 text-green-600">Validé</td>
        <td class="px-4 py-3">
          <button
            hx-post="https://esportify-backend.onrender.com/admin/events/suspend/${event.id}"
            hx-swap="afterbegin"
            hx-target="#pendingEvents"
            class="px-3 py-1 bg-orange-600 text-white rounded hover:bg-orange-700"
          >
            Suspendre
          </button>
        </td>
        <script>
          document.getElementById('event-pend-${event.id}').remove();
        </script>
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
      <tr id="event-pend-${event.id}" class="border-b">
        <td class="px-4 py-3">${event.title}</td>
        <td class="px-4 py-3 text-yellow-600">En attente</td>
        <td class="px-4 py-3 flex flex-wrap gap-2">
          <button
            hx-post="https://esportify-backend.onrender.com/admin/events/approve/${event.id}"
            hx-swap="afterbegin"
            hx-target="#approvedEvents"
            class="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Valider
          </button>
          <button
            hx-post="https://esportify-backend.onrender.com/admin/events/reject/${event.id}"
            hx-swap="delete"
            hx-target="#event-pend-${event.id}"
            class="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Refuser
          </button>
        </td>
        <script>
          document.getElementById('event-val-${event.id}')!.remove();
        </script>
      </tr> 
      
    `);
  } catch (err) {
    console.error("Erreur dans suspendEvent :", err);
    res.status(500).send("Erreur serveur lors de la suspension de l'événement");
  }
};

// Renvoi un tableau contenant les utilisateurs et leurs droits
module.exports.getUsersWithRoles = async (req, res) => {
  console.log("Requête reçue pour récupérer les utilisateurs");
  try {
    const result = await pgClient.query(`
      SELECT u.id, u.username, r.role_name AS role
      FROM users u
      JOIN roles r ON u.role_id = r.id
    `);

    const users = result.rows;
    let usersHtml = "";

    users.forEach((user) => {
      usersHtml += `
        <tr id="user-${user.id}" class="border-b">
          <td class="px-4 py-3">${user.username}</td>
          <td class="px-4 py-3 ${user.role === 'admin' ? 'text-green-600' : user.role === 'organisateur' ? 'text-yellow-600' : 'text-white' }">
            ${user.role}
          </td>
          <td class="px-4 py-3 flex flex-wrap gap-2">
          ${user.role === 'admin' ? `
            <button
              hx-post="${apiUrl}/admin/users/demote/${user.id}/orga"
              hx-swap="outerHTML"
              class="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Rétrograder
            </button>
          ` : ''}
          ${user.role === 'orga' ? `
            <button
              hx-post="${apiUrl}/admin/users/promote/${user.id}/admin"
              hx-swap="outerHTML"
              class="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
            >
              Promouvoir
            </button>

            <button
              hx-post="${apiUrl}/admin/users/demote/${user.id}/joueur"
              hx-swap="outerHTML"
              class="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Rétrograder
            </button>
          ` : ''}
          ${user.role === 'joueur' ? `
            <button
              hx-post="${apiUrl}/admin/users/promote/${user.id}/orga"
              hx-swap="outerHTML"
              class="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
            >
              Promouvoir
            </button>

            <button
              hx-post="${apiUrl}/admin/users/demote/${user.id}/visiteur"
              hx-swap="outerHTML"
              class="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Bannir
            </button>
          ` : ''}
          ${user.role === 'visiteur' ? `
            <button
              hx-post="${apiUrl}/admin/users/promote/${user.id}/joueur"
              hx-swap="outerHTML"
              class="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
            >
              Débannir
            </button>
          ` : ''}
          </td>
        </tr>
      `;
    });

    res.send(usersHtml);
  } catch (err) {
    console.error("Erreur dans getUsersWithRoles :", err);
    res.status(500).send("Erreur serveur lors de la récupération des utilisateurs");
  }
};

// Promouvoir un utilisateur
module.exports.promoteUser = async (req, res) => {
  const userId = req.params.userId;
  const newRole = req.params.newRole;
  console.log(`Promotion de l'utilisateur ${userId} vers le rôle ${newRole}`);
  try {
    // Récupère l'ID du rôle
    const roleResult = await pgClient.query(`
      SELECT id 
      FROM roles 
      WHERE role_name = $1
    `, [newRole]);

    const roleId = roleResult.rows[0].id;

    await pgClient.query(`
      UPDATE users 
      SET role_id = $1
      WHERE id = $2
    `, [roleId, userId]);

    // Renvoie le nouveau HTML pour la ligne utilisateur
    const userResult = await pgClient.query(`
      SELECT u.id, u.username, r.role_name AS role
      FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE u.id = $1
    `, [userId]);

    const user = userResult.rows[0];
    
    res.send(`
      <tr id="user-${user.id}" class="border-b">
        <td class="px-4 py-3">${user.username}</td>
        <td class="px-4 py-3 ${user.role === 'admin' ? 'text-green-600' : user.role === 'organisateur' ? 'text-yellow-600' : 'text-white' }">
          ${user.role}
        </td>
        <td class="px-4 py-3 flex flex-wrap gap-2">
        ${user.role === 'orga' ? `
          <button
            hx-post="${apiUrl}/admin/users/promote/${user.id}/admin"
            hx-swap="outerHTML"
            class="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Promouvoir
          </button>

          <button
            hx-post="${apiUrl}/admin/users/demote/${user.id}/joueur"
            hx-swap="outerHTML"
            class="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Rétrograder
          </button>
        ` : ''}
        ${user.role === 'joueur' ? `
          <button
            hx-post="${apiUrl}/admin/users/promote/${user.id}/orga"
            hx-swap="outerHTML"
            class="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Promouvoir
          </button>

          <button
            hx-post="${apiUrl}/admin/users/demote/${user.id}/visiteur"
            hx-swap="outerHTML"
            class="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Bannir
          </button>
        ` : ''}
        ${user.role === 'visiteur' ? `
          <button
            hx-post="${apiUrl}/admin/users/promote/${user.id}/joueur"
            hx-swap="outerHTML"
            class="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Débannir
          </button>
        ` : ''}
        </td>
      </tr>
    `);
  } catch (err) {
    console.error("Erreur dans promoteUser :", err);
    res.status(500).send("Erreur serveur lors de la promotion");
  }
};

// Rétrograder un utilisateur
module.exports.demoteUser = async (req, res) => {
  const userId = req.params.userId;
  const newRole = req.params.newRole;
  console.log(`Rétrogradation de l'utilisateur ${userId} vers le rôle ${newRole}`);
  try {
    // Récupère l'ID du rôle
    const roleResult = await pgClient.query(`
      SELECT id 
      FROM roles 
      WHERE role_name = $1
    `, [newRole]);

    const roleId = roleResult.rows[0].id;

    await pgClient.query(`
      UPDATE users 
      SET role_id = $1
      WHERE id = $2
    `, [roleId, userId]);

    // Renvoie le nouveau HTML pour la ligne utilisateur
    const userResult = await pgClient.query(`
      SELECT u.id, u.username, r.role_name AS role
      FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE u.id = $1
    `, [userId]);

    const user = userResult.rows[0];
    
    res.send(`
      <tr id="user-${user.id}" class="border-b">
        <td class="px-4 py-3">${user.username}</td>
        <td class="px-4 py-3 ${user.role === 'admin' ? 'text-green-600' : user.role === 'organisateur' ? 'text-yellow-600' : 'text-white' }">
          ${user.role}
        </td>
        <td class="px-4 py-3 flex flex-wrap gap-2">
          ${user.role === 'admin' ? `
            <button
              hx-post="${apiUrl}/admin/users/demote/${user.id}/orga"
              hx-swap="outerHTML"
              class="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Rétrograder
            </button>
          ` : ''}
          ${user.role === 'orga' ? `
            <button
              hx-post="${apiUrl}/admin/users/promote/${user.id}/admin"
              hx-swap="outerHTML"
              class="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
            >
              Promouvoir
            </button>

            <button
              hx-post="${apiUrl}/admin/users/demote/${user.id}/joueur"
              hx-swap="outerHTML"
              class="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Rétrograder
            </button>
          ` : ''}
          ${user.role === 'joueur' ? `
            <button
              hx-post="${apiUrl}/admin/users/promote/${user.id}/orga"
              hx-swap="outerHTML"
              class="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
            >
              Promouvoir
            </button>

            <button
              hx-post="${apiUrl}/admin/users/demote/${user.id}/visiteur"
              hx-swap="outerHTML"
              class="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Bannir
            </button>
          ` : ''}
        </td>
      </tr>
    `);
  } catch (err) {
    console.error("Erreur dans demoteUser :", err);
    res.status(500).send("Erreur serveur lors de la rétrogradation");
  }
};