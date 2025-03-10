const { queryDB } = require("../../config/dbConnection.js");
const ChatMessage = require("../../models/chatmessage.js"); // Assure-toi d'avoir ton modèle Mongoose
const chatRooms = new Map(); // Stocker les rooms en mémoire

// --- Route HTTP : Affichage de la chatroom ---
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
      new Date(event.start_datetime) <= now && now <= new Date(event.end_datetime);

    if (!isOngoing) {
      return res.status(403).send("<p>Accès refusé : L'événement n'est pas en cours</p>");
    }

    const specialPageHtml = `
      <div class="p-6">
        <h1 class="text-3xl font-bold mb-4">${event.title} - Room</h1>
        <p>${event.description}</p>
        <p><strong>Début :</strong> ${new Date(event.start_datetime).toLocaleString()}</p>
        <p><strong>Fin :</strong> ${new Date(event.end_datetime).toLocaleString()}</p>
        <p><strong>Organisateur :</strong> ${event.organisateur}</p>
      </div>
      <div hx-ext="ws" ws-connect="wss://esportify-backend.onrender.com/api/room/chat/${id}/${userId}" hx-swap="beforeend">
        <div id="notifications" class="mb-4"></div>
        <div id="chat_room" class="flex-grow overflow-y-auto"></div>
        <div class="mt-auto">
          <form id="chatForm" ws-send class="flex items-center mx-4 gap-2">
            <input class="bg-[#161215] ml-auto max-w-2xl border p-2 rounded w-full self-end" 
              id="messageInput" autocomplete="off" name="chat_message" 
              placeholder="Écrivez votre message..." required>
            <button class="bg-[#4d2d45] mr-auto rounded p-3 transition-colors hover:bg-[#532447]" type="submit">
              Envoyer
            </button>
          </form>
        </div>
      </div>
      <script>
        document.getElementById('chatForm').addEventListener('submit', function(event) {
          event.preventDefault();
        })
      </script>
    `;

    res.send(specialPageHtml);
  } catch (error) {
    console.error("Erreur lors de la récupération de la page spéciale :", error);
    res.status(500).send("<p>Erreur interne du serveur</p>");
  }
};

// --- Gestion de WebSocket pour la chatroom ---
module.exports.setupChatWebSocket = (app) => {
  app.ws("/api/room/chat/:roomId/:userId", async function connection(ws, req) {
    const roomId = req.params.roomId;
    console.log(`[WS] Connexion ouverte pour la room ${roomId}`);
    const userId = req.params.userId;
    console.log(`[WS] utilisateur : ${userId}`);

    const room = chatRooms.get(roomId) || { messages: [], connections: [] };

    if (!chatRooms.has(roomId)) {
      console.log(`[WS] Création de la room ${roomId}`);
      chatRooms.set(roomId, room);
    }

    room.connections.push(ws);

    // Charger l'historique des messages
    try {
      const messages = await ChatMessage.find({ roomId }).sort({ timestamp: 1 }).exec();
      if (messages.length > 0) {
        const messagesList = messages.map((msg) => 
          `<li><strong>${msg.username || 'Anonyme'}</strong>: ${msg.chat_message}</li>`
        ).join("");
        ws.send(`<ul id='chat_room'>${messagesList}</ul>`);
      }
    } catch (err) {
      console.log("Erreur lors de la récupération des messages:", err);
    }

    // Gestion des messages entrants
    ws.on("message", async function incoming(message) {
      try {
        const parsedMessage = JSON.parse(message.toString());
        const chatMessage = parsedMessage.chat_message;

        if (!chatMessage || typeof chatMessage !== "string" || !chatMessage.trim()) {
          console.warn(`[WS] Message ignoré : contenu invalide.`);
          return;
        }

        
    
    // Récupérer le nom d'utilisateur
    let username = "Anonyme";
    if (userId) {
      try {
        const userResult = await queryDB(
          'SELECT username FROM users WHERE id = $1',
          [userId]
        );
        if (userResult.rows.length > 0) {
          username = userResult.rows[0].username;
          console.log("Récupération du nom d'utilisateur:", username);
        }
      } catch (err) {
        console.log("Erreur lors de la récupération du nom d'utilisateur:", err);
      }
    }

        // Sauvegarde en base de données
        const newMessage = new ChatMessage({ 
          roomId, 
          chat_message: chatMessage,
          username: username, // Ajouter le nom d'utilisateur
        });
        await newMessage.save();

        // Format du message avec le nom d'utilisateur
      const formattedMessage = `<strong>${username}</strong>: ${chatMessage}`;

        // Ajouter et envoyer le message à toutes les connexions
        room.messages.push(formattedMessage);
        if (room.messages.length > 50) {
          room.messages.shift(); // Supprime le plus ancien message
        }        
        const messagesList = room.messages.map((msg) => `<li>${msg}</li>`).join("");
        room.connections.forEach((connection) => connection.send(`<ul id='chat_room'>${messagesList}</ul>`));
      } catch (error) {
        console.log("Erreur lors de la réception du message:", error);
      }
    });

    // Gestion de la déconnexion
    ws.on("close", () => {
      room.connections = room.connections.filter((conn) => conn !== ws);
      console.log(`[WS] Connexion room ${roomId} fermée. Restant : ${room.connections.length}`);
    });
  });
};
