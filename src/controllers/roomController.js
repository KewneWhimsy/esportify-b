// Importation des variables de configuration.
const { pgClient } = require("../../config/dbConnection.js");

// CREATION ROOM EVENT
module.exports.getEventRoom = async (req, res) => {
    // Extraction de l'ID de l'événement via les paramètres de l'URL
    const { id } = req.params;
  
    try {
      // Exécution de la requête pour récupérer les données d'un événement spécifique
      const result = await pgClient.query(
        `
        SELECT e.id, e.title, e.description, e.players_count, e.start_datetime, e.end_datetime, u.username AS organisateur
        FROM events e
        JOIN users u ON e.user_id = u.id
        WHERE e.id = $1
      `,
        [id] // Le paramètre de la requête est l'ID de l'événement
      );
      
      // Si aucun événement n'est trouvé : 404
      if (result.rows.length === 0) {
        return res.status(404).send("<p>Événement non trouvé</p>");
      }
      // Récupération de la première ligne du résultat (l'événement trouvé)
      const event = result.rows[0];
      const now = Date.now() + 3600000; // +1h en millisecondes

      // Vérification si l'événement est en cours
      const isOngoing = new Date(event.start_datetime) <= now && now <= new Date(event.end_datetime);
      // Si l'événement n'est pas en cours : 403
      if (!isOngoing) {
        return res.status(403).send("<p>Accès refusé : L'événement n'est pas en cours</p>");
      }
      // Création du contenu HTML de la page spéciale pour l'événement
      const specialPageHtml = `
        <div class="p-6">
          <h1 class="text-3xl font-bold mb-4">${event.title} - Room</h1>
          <p>${event.description}</p>
          <p><strong>Début :</strong> ${new Date(event.start_datetime).toLocaleString()}</p>
          <p><strong>Fin :</strong> ${new Date(event.end_datetime).toLocaleString()}</p>
          <p><strong>Organisateur :</strong> ${event.organisateur}</p>
        </div>
        <div hx-ext="ws" ws-connect="wss://esportify-backend.onrender.com/api/room/chat/${id}" hx-swap="beforeend">
          <div id="notifications" class="mb-4"></div>
          <!-- Chatroom container -->
          <div id="chat_room" class="flex-grow overflow-y-auto">
            <!-- Messages will be displayed here -->
          </div>

          <!-- Chat input section -->
          <div class="mt-auto"">
            <form id="chatForm" ws-send class="flex items-center mx-4 gap-2">
              <input class="bg-[#161215] ml-auto max-w-2xl border p-2 rounded w-full self-end" 
                id="messageInput" 
                autocomplete="off"
                name="chat_message" 
                placeholder="Écrivez votre message..." 
                required
              >
              <button class="bg-[#4d2d45] mr-auto rounded p-3 transition-colors hover:bg-[#532447]" type="submit">
                Envoyer
              </button>
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
  