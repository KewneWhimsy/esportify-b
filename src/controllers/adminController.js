const { queryDB } = require("../../config/dbConnection.js");
const { backendUrl } = require("../../config/backendUrl.js");

// Renvoi un tableau contenant les événements en attente de modération
module.exports.getPendingEvents = async (req, res) => {
  console.log("Requête reçue pour récupérer les événements en attente");
  try {
    const result = await queryDB(`
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
          <td class="px-4 py-3">
            ${event.title}
            <button @click="setTimeout(() => { isOpen = true }, 200)"
            class="ml-1 text-lg hover:text-yellow-600 transition-colors select-none"
            hx-get="${backendUrl}/api/event/${event.id}"
            hx-target="#popup-content"
            hx-swap="innerHTML">
              +
            </button>
          </td>
          <td class="px-4 py-3 text-yellow-600">En attente</td>
          <td class="px-4 py-3 flex flex-wrap gap-2">
            <button
              hx-post="${backendUrl}/admin/events/approve/${event.id}"
              hx-on::after-request="htmx.trigger('body', 'refresh')"
              hx-swap="afterbegin"
              hx-target="#approvedEvents"
              class="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition-colors select-none"
            >
              Valider
            </button>
            <button
              hx-delete="${backendUrl}/admin/events/reject/${event.id}"
              hx-on::after-request="htmx.trigger('body', 'refresh')"
              hx-swap="delete"
              hx-target="#event-pend-${event.id}"
              class="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors select-none"
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
  console.log("GET ApprovedEvents");
  try {
    const result = await queryDB(`
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
          <td class="px-4 py-3">
            ${event.title}
            <button @click="setTimeout(() => { isOpen = true }, 200)"
            class="ml-1 text-lg hover:text-yellow-600 transition-colors select-none"
            hx-get="${backendUrl}/api/event/${event.id}"
            hx-target="#popup-content"
            hx-swap="innerHTML">
              +
            </button>
          </td>
          <td class="px-4 py-3 text-green-600">Validé</td>
          <td class="px-4 py-3">
            <button
              hx-post="${backendUrl}/admin/events/suspend/${event.id}"
              hx-on::after-request="htmx.trigger('body', 'refresh')"
              hx-swap="afterbegin"
              hx-target="#pendingEvents"
              class="px-3 py-1 bg-orange-600 text-white rounded hover:bg-orange-700 transition-colors select-none"
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
  console.log("POST ApprovedEvents");
  const eventId = req.params.eventId;
  console.log(`Approbation de l'événement ${eventId}`);
  try {
    await queryDB(`
      UPDATE events 
      SET is_approved = TRUE
      WHERE id = $1
    `, [eventId]);

    // Renvoi le nouvel état de la ligne
    const result = await queryDB(`
      SELECT e.id, e.title, e.description, e.players_count, 
             e.start_datetime, e.end_datetime, u.username AS organisateur
      FROM events e
      JOIN users u ON e.user_id = u.id
      WHERE e.id = $1
    `, [eventId]);

    const event = result.rows[0];
    res.send(`
      <tr id="event-val-${event.id}" class="border-b">
        <td class="px-4 py-3">
          ${event.title}
          <button @click="setTimeout(() => { isOpen = true }, 200)" 
            class="ml-1 text-lg hover:text-yellow-600 transition-colors select-none"
            hx-get="${backendUrl}/api/event/${event.id}"
            hx-target="#popup-content"
            hx-swap="innerHTML">
              +
          </button>
        </td>
        <td class="px-4 py-3 text-green-600">Validé</td>
        <td class="px-4 py-3">
          <button
            hx-post="${backendUrl}/admin/events/suspend/${event.id}"
            hx-on::after-request="htmx.trigger('body', 'refresh')"
            hx-swap="afterbegin"
            hx-target="#pendingEvents"
            class="px-3 py-1 bg-orange-600 text-white rounded hover:bg-orange-700 transition-colors select-none"
          >
            Suspendre
          </button>
        </td>
        <script>
          try {
            document.getElementById('event-pend-${event.id}').remove();
          } catch (error) {
          // Gérer l'erreur si l'élément n'existe pas
          console.error('Élément non trouvé:', error);
          }        
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
  console.log("DELETE rejectEvent");
  const eventId = req.params.eventId;
  console.log(`Refus de l'événement ${eventId}`);
  try {
    await queryDB(`
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
  console.log("POST suspendEvent");
  const eventId = req.params.eventId;
  console.log(`Suspension de l'événement ${eventId}`);
  try {
    // Met à jour l'état de l'événement à "non apprové"
    await queryDB(`
      UPDATE events 
      SET is_approved = FALSE
      WHERE id = $1
    `, [eventId]);

    // Renvoi le nouvel état de la ligne
    const result = await queryDB(`
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
        <td class="px-4 py-3">
          ${event.title}
          <button @click="setTimeout(() => { isOpen = true }, 200)"
            class="ml-1 text-lg hover:text-yellow-600 transition-colors select-none"
            hx-get="${backendUrl}/api/event/${event.id}"
            hx-target="#popup-content"
            hx-swap="innerHTML">
              +
          </button>
        </td>
        <td class="px-4 py-3 text-yellow-600">En attente</td>
        <td class="px-4 py-3 flex flex-wrap gap-2">
          <button
            hx-post="${backendUrl}/admin/events/approve/${event.id}"
            hx-on::after-request="htmx.trigger('body', 'refresh')"
            hx-swap="afterbegin"
            hx-target="#approvedEvents"
            class="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition-colors select-none"
          >
            Valider
          </button>
          <button
            hx-delete="${backendUrl}/admin/events/reject/${event.id}"
            hx-on::after-request="htmx.trigger('body', 'refresh')"
            hx-swap="delete"
            hx-target="#event-pend-${event.id}"
            class="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors select-none"
          >
            Refuser
          </button>
        </td>
        <script>
          try {
            document.getElementById('event-val-${event.id}').remove();
          } catch (error) {
          // Gérer l'erreur si l'élément n'existe pas
          console.error('Élément non trouvé:', error);
          }        
        </script>
      </tr> 
      
    `);
  } catch (err) {
    console.error("Erreur dans suspendEvent :", err);
    res.status(500).send("Erreur serveur lors de la suspension de l'événement");
  }
};

// Fonction pour déterminer la couleur du texte en fonction du rôle
function getUserRoleColor(role) {
  if (role === 'admin') return 'text-green-600';
  if (role === 'orga') return 'text-yellow-600';
  return 'text-white';
}

// Fonction pour générer les boutons de rôle
function getRoleButtons(currentRole, userId) {
  if (currentRole === 'admin') {
    return `
      <button
        hx-post="${backendUrl}/admin/users/demote/${userId}/orga"
        hx-swap="outerHTML"
        hx-target="#user-${userId}"
        class="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-700 transition-colors select-none"
      >
        Rétrograder
      </button>
    `;
  } else if (currentRole === 'orga') {
    return `
      <button
        hx-post="${backendUrl}/admin/users/promote/${userId}/admin"
        hx-swap="outerHTML"
        hx-target="#user-${userId}"
        class="px-3 py-1 bg-blue-900 text-white rounded hover:bg-yellow-600 transition-colors select-none"
      >
        Promouvoir
      </button>
      <button
        hx-post="${backendUrl}/admin/users/demote/${userId}/joueur"
        hx-swap="outerHTML"
        hx-target="#user-${userId}"
        class="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-700 transition-colors select-none"
      >
        Rétrograder
      </button>
    `;
  } else if (currentRole === 'joueur') {
    return `
      <button
        hx-post="${backendUrl}/admin/users/promote/${userId}/orga"
        hx-swap="outerHTML"
        hx-target="#user-${userId}"
        class="px-3 py-1 bg-blue-900 text-white rounded hover:bg-yellow-600 transition-colors select-none"
      >
        Promouvoir
      </button>
      <button
        hx-post="${backendUrl}/admin/users/demote/${userId}/visiteur"
        hx-swap="outerHTML"
        hx-target="#user-${userId}"
        class="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 tranistion-colors select-none"
      >
        Bannir
      </button>
    `;
  } else if (currentRole === 'visiteur') {
    return `
      <button
        hx-post="${backendUrl}/admin/users/promote/${userId}/joueur"
        hx-swap="outerHTML"
        hx-target="#user-${userId}"
        class="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition colors select-none"
      >
        Débannir
      </button>
    `;
  }
  return '';
}

// Renvoi un tableau contenant les utilisateurs et leurs droits
module.exports.getUsersWithRoles = async (req, res) => {
  console.log("GET UsersWithRoles");
  try {
    //récupére tout les utilisateurs sauf le compte admin id=1
    const result = await queryDB(`
      SELECT id, username, role
      FROM users
      WHERE id != 1
    `);

    const users = result.rows;

    let usersHtml = "";
    users.forEach((user) => {
      usersHtml += `
        <tr id="user-${user.id}" class="border-b">
          <td class="px-4 py-3">${user.username}</td>
          <td class="px-4 py-3 ${getUserRoleColor(user.role)}">
            ${user.role}
          </td>
          <td>
            ${getRoleButtons(user.role, user.id)}
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
  console.log("POST promoteUser");
  const { userId, newRole } = req.params;
  console.log(`Promotion de l'utilisateur ${userId} vers le rôle ${newRole}`);
  try {
    // Met à jour le rôle
    await queryDB(
      'UPDATE users SET role = $1 WHERE id = $2',
      [newRole, userId]
    );

    // Récupère les informations mises à jour de l'utilisateur
    const result = await queryDB(
      'SELECT id, username, role FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).send("Utilisateur introuvable");
    }

    const user = result.rows[0];
    
    res.send(`
      <tr id="user-${user.id}" class="border-b">
          <td class="px-4 py-3">${user.username}</td>
          <td class="px-4 py-3 ${getUserRoleColor(user.role)}">
            ${user.role}
          </td>
          <td>
            ${getRoleButtons(user.role, user.id)}
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
  console.log("POST demoteUser");
  const { userId, newRole } = req.params;
  console.log(`Rétrogradation de l'utilisateur ${userId} vers le rôle ${newRole}`);
  if (userId == 1) {
    return res.send("Utilisateur super admin");
  }
  try {
    // Met à jour le rôle
    await queryDB(
      'UPDATE users SET role = $1 WHERE id = $2',
      [newRole, userId]
    );

    // Récupère les informations mises à jour de l'utilisateur
    const result = await queryDB(
      'SELECT id, username, role FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).send("Utilisateur introuvable");
    }
    
    const user = result.rows[0];

    res.send(`
      <tr id="user-${user.id}" class="border-b">
          <td class="px-4 py-3">${user.username}</td>
          <td class="px-4 py-3 ${getUserRoleColor(user.role)}">
            ${user.role}
          </td>
          <td>
            ${getRoleButtons(user.role, user.id)}
          </td>
        </tr>
    `);
  } catch (err) {
    console.error("Erreur dans demoteUser :", err);
    res.status(500).send("Erreur serveur lors de la rétrogradation");
  }
};