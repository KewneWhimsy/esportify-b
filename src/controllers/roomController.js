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
      return res.status(404).send("<p>Event not found</p>");
    }

    const event = result.rows[0];
    const now = Date.now() + 7200000; // +2h en millisecondes (CEST UTC+2)
    const isOngoing =
      new Date(event.start_datetime) <= now &&
      now <= new Date(event.end_datetime);

    if (!isOngoing) {
      return res
        .status(403)
        .send("<p>Access denied: the event is not currently ongoing</p>");
    }

    const specialPageHtml = `
      <div class="p-4 flex flex-col">
        <!-- Carte pour l'événement -->
        <div class="bg-[#1e1b1f] p-3 rounded-lg shadow-lg mb-2 max-w-md">
          <div class="flex justify-between">
            <h1 class="text-xl font-bold mb-2 text-[#e4e4e4]">${event.title} - Room</h1>
            <p><strong class="text-[#e4e4e4]">Organizer:</strong> ${event.organisateur}</p>
          </div>
          <p><strong class="text-[#e4e4e4]">Start:</strong> ${new Date(event.start_datetime).toLocaleString()}</p>
          <p><strong class="text-[#e4e4e4]">End:</strong> ${new Date(event.end_datetime).toLocaleString()}</p>
        </div>

        <!-- Zone du Chat -->
        <div hx-ext="ws" ws-connect="wss://esportify-backend.onrender.com/api/room/chat/${id}/${userId}" class="flex flex-col h-[600px]">
          <div id="notifications" class="mb-4 text-red-400"></div>

          <!-- Fenêtre des messages -->
          <div id="chat_room" class="flex-grow overflow-y-auto bg-[#222] p-4 rounded-lg max-h-screen">
            <ul id="chat_messages" class="space-y-2 text-gray-300"></ul>
          </div>

          <!-- Formulaire d'envoi -->
          <form id="chatForm" ws-send class="flex items-center mt-4 gap-3">
            <input class="bg-[#161215] border p-3 rounded w-full focus:outline-none" 
            id="messageInput" autocomplete="off" name="chat_message" 
            placeholder="Write your message..." required
            >
            <button class="bg-[#4d2d45] font-bold rounded p-3 transition-colors hover:bg-[#532447]" type="submit">
              Send
            </button>
          </form>
        </div>
      </div>

      <script>
        document.getElementById('chatForm').addEventListener('submit', function(event) {
          event.preventDefault();
    
        // Réinitialise le champ après soumission
        setTimeout(() => {
          const messageInput = document.getElementById("messageInput");
          if (messageInput) {
            messageInput.value = "";
          }
          }, 0);
        });
      </script>

    `;

    res.send(specialPageHtml);
  } catch (error) {
    console.error(
      "Erreur lors de la récupération de la page spéciale :",
      error
    );
    res.status(500).send("<p>Internal server error</p>");
  }
};

// --- Gestion de WebSocket pour la chatroom ---
module.exports.setupChatWebSocket = (app) => {
  app.ws("/api/room/chat/:roomId/:userId", async function connection(ws, req) {
    const { roomId, userId } = req.params;
    console.log(
      `[WS] Connexion ouverte pour la room ${roomId} | Utilisateur : ${userId}`
    );

    // Date de fin de l'événement, pour purger automatiquement l'historique du chat une fois l'événement terminé
    let eventEndDatetime = null;
    try {
      const eventResult = await queryDB(
        "SELECT end_datetime FROM events WHERE id = $1",
        [roomId]
      );
      if (eventResult.rows.length > 0) {
        eventEndDatetime = eventResult.rows[0].end_datetime;
      }
    } catch (err) {
      console.log("Erreur lors de la récupération de la fin de l'événement:", err);
    }

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
          expiresAt: eventEndDatetime,
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