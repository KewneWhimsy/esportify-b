const { queryDB } = require("../../config/dbConnection.js");
const ChatMessage = require("../../models/chatmessage.js");
const chatRooms = new Map(); // Stocker les rooms en mémoire

// --- Route obtention de chatroom ---
module.exports.getEventRoom = async (req, res) => {
  const { id } = req.params;
  const { userId } = req.user;
  console.log(`user : ${userId}`);

  try {
    // Récupération des infos de l'événement
    const result = await queryDB(
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
    const now = Date.now() + 3600000; // +1h en millisecondes
    const isOngoing =
      new Date(event.start_datetime) <= now &&
      now <= new Date(event.end_datetime);

    if (!isOngoing) {
      return res
        .status(403)
        .send("<p>Accès refusé : L'événement n'est pas en cours</p>");
    }

    const specialPageHtml = `
      <div class="p-6">
        <h1 class="text-3xl font-bold mb-4">${event.title} - Room</h1>
        <p>${event.description}</p>
        <p><strong>Début :</strong> ${new Date(
          event.start_datetime
        ).toLocaleString()}</p>
        <p><strong>Fin :</strong> ${new Date(
          event.end_datetime
        ).toLocaleString()}</p>
        <p><strong>Organisateur :</strong> ${event.organisateur}</p>
      </div>
       <!-- Corps du chat -->
  <div class="flex-1 flex flex-col relative p-4 overflow-hidden" hx-ext="ws" ws-connect="wss://esportify-backend.onrender.com/api/room/chat/${id}/${userId}">
    <div id="notifications" class="mb-2 text-yellow-400"></div>
    
    <!-- Conteneur de messages avec défilement -->
    <div id="chat_room" class="flex-1 overflow-y-auto p-2 mb-20 bg-gray-800 rounded">
      <ul id="chat_messages" class="space-y-2">
        <!-- Les messages seront ajoutés ici dynamiquement -->
      </ul>
    </div>
    
    <!-- Barre d'input fixe en bas -->
    <div class="absolute bottom-4 left-4 right-4 bg-gray-800 p-3 rounded shadow-lg">
      <form id="chatForm" ws-send class="flex gap-2">
        <input class="flex-1 px-3 py-2 bg-gray-900 border border-gray-700 rounded text-gray-100 focus:outline-none focus:ring-2 focus:ring-red-500" 
          id="messageInput" 
          autocomplete="off" 
          name="chat_message" 
          placeholder="Écrivez votre message..." 
          required>
        <button class="px-4 py-2 bg-red-700 hover:bg-red-600 rounded font-medium transition-colors" type="submit">
          Envoyer
        </button>
      </form>
    </div>
  </div>
</div>

<script>
  document.getElementById('chatForm').addEventListener('submit', function(event) {
    event.preventDefault();
    
    // Réinitialiser le champ après envoi
    setTimeout(() => {
      const messageInput = document.getElementById("messageInput");
      if (messageInput) {
        messageInput.value = "";
        messageInput.focus();
      }
    }, 0);
  });
  
  // Auto-scroll vers le bas quand de nouveaux messages arrivent
  const chatObserver = new MutationObserver(function() {
    const messagesContainer = document.getElementById('chat_room');
    if (messagesContainer) {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  });
  
  // Observer les changements dans la liste de messages
  window.addEventListener('load', function() {
    const target = document.getElementById('chat_messages');
    if (target) {
      chatObserver.observe(target, { childList: true });
    }
  });
</script>
    `;

    res.send(specialPageHtml);
  } catch (error) {
    console.error(
      "Erreur lors de la récupération de la page spéciale :",
      error
    );
    res.status(500).send("<p>Erreur interne du serveur</p>");
  }
};

// --- Gestion de WebSocket pour la chatroom ---
module.exports.setupChatWebSocket = (app) => {
  app.ws("/api/room/chat/:roomId/:userId", async function connection(ws, req) {
    const { roomId, userId } = req.params;
    console.log(
      `[WS] Connexion ouverte pour la room ${roomId} | Utilisateur : ${userId}`
    );

    const room = chatRooms.get(roomId) || { messages: [], connections: [] };

    if (!chatRooms.has(roomId)) {
      console.log(`[WS] Création de la room ${roomId}`);
      chatRooms.set(roomId, room);
    }

    room.connections.push(ws);

    // Charger l'historique des messages
    try {
      const messages = await ChatMessage.find({ roomId })
        .sort({ timestamp: 1 })
        .exec();
      
      if (messages.length > 0) {
        // Envoyer tous les messages d'historique en une seule fois
        const messagesList = messages.map(
          (msg) => `<li><strong>${msg.username || "Anonyme"}</strong>: ${msg.chat_message}</li>`
        ).join("");
        
        // Initialiser la liste de messages
        ws.send(`<div hx-swap-oob="innerHTML:#chat_messages">${messagesList}</div>`);
      }
    } catch (err) {
      console.log("Erreur lors de la récupération des messages:", err);
    }

    // Gestion des messages entrants
    ws.on("message", async function incoming(message) {
      try {
        const parsedMessage = JSON.parse(message.toString());

        const chatMessage = parsedMessage.chat_message;
        if (
          !chatMessage ||
          typeof chatMessage !== "string" ||
          !chatMessage.trim()
        ) {
          console.warn(`[WS] Message ignoré : contenu invalide.`);
          return;
        }

        // Récupérer le nom d'utilisateur
        let username = "Anonyme";
        if (userId) {
          try {
            const userResult = await queryDB(
              "SELECT username FROM users WHERE id = $1",
              [userId]
            );
            if (userResult.rows.length > 0) {
              username = userResult.rows[0].username;
              console.log("Récupération du nom d'utilisateur:", username);
            }
          } catch (err) {
            console.log(
              "Erreur lors de la récupération du nom d'utilisateur:",
              err
            );
          }
        }

        // Sauvegarde en base de données
        const newMessage = new ChatMessage({
          roomId,
          chat_message: chatMessage,
          username: username,
        });
        await newMessage.save();

        // Format du message avec le nom d'utilisateur
        const formattedMessage = `<strong>${username}</strong>: ${chatMessage}`;

        // Ajouter le message à la liste en mémoire RAM
        room.messages.push(formattedMessage);

        // Créer un élément HTML pour le nouveau message uniquement
        const messageHTML = `<li>${formattedMessage}</li>`;
        
        // Envoyer uniquement le nouveau message à ajouter à la liste existante
        room.connections.forEach((connection) => {
          connection.send(`<div hx-swap-oob="beforeend:#chat_messages">${messageHTML}</div>`);
        });

      } catch (error) {
        console.log("Erreur lors de la réception du message:", error);
      }
    });

    // Gestion de la déconnexion
    ws.on("close", () => {
      room.connections = room.connections.filter((conn) => conn !== ws);
      console.log(
        `[WS] Connexion room ${roomId} fermée. Restant : ${room.connections.length}`
      );

      // Si plus personne dans la room, la supprimer de la mémoire
      if (room.connections.length === 0) {
        console.log(`[WS] Suppression de la room ${roomId} de la mémoire`);
        chatRooms.delete(roomId);
      }
    });
  });
};