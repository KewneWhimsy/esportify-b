const { pgClient } = require("../../config/dbConnection.js");

module.exports.getEventRoom = async (req, res) => {
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
      const now = new Date();

      // Vérification si l'événement est en cours
      const isOngoing = new Date(event.start_datetime) <= now && now <= new Date(event.end_datetime);
  
      if (!isOngoing) {
        return res.status(403).send("<p>Accès refusé : L'événement n'est pas en cours</p>");
      }
      // Générez le contenu HTML de la page spéciale
      const specialPageHtml = `
        <div class="p-6">
          <h1 class="text-3xl font-bold mb-4">${event.title} - Room</h1>
          <p>${event.description}</p>
          <p><strong>Début :</strong> ${new Date(event.start_datetime).toLocaleString()}</p>
          <p><strong>Fin :</strong> ${new Date(event.end_datetime).toLocaleString()}</p>
          <p><strong>Organisateur :</strong> ${event.organisateur}</p>
        </div>
        <div hx-ext="ws" ws-connect="wss://esportify-backend.onrender.com/api/room/chat/${id}" hx-swap="beforeend">
          <div id="notifications"></div>
          <div id="chat_room">
            ...
          </div>
          <div class="chat-input w-full h-100%">
            <form id="chatForm" ws-send>
              <input class="bg-background" id="messageInput" name="chat_message" placeholder="Écrivez votre message..." required>
              <button class="bg-[#4d2d45] p-6 rounded" type="submit">Envoyer</button>
            </form>
          </div>
        </div>
        <script>
          document.getElementById('chatForm').addEventListener('submit', function(event) {
            event.preventDefault(); // Empêche le rechargement de la page
          })
        </script>
      `;
  
      res.send(specialPageHtml);
    } catch (error) {
      console.error("Erreur lors de la récupération de la page spéciale :", error);
      res.status(500).send("<p>Erreur interne du serveur</p>");
    }
  };
  