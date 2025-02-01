const express = require("express"); // Framework Express
const cors = require("cors"); //  Middleware CORS pour gérer les requêtes cross-origin
const corsOptions = require("./config/corsOptions.js");
const routes = require("./src/routes/routes.js"); // Import des routes
const { connectToDB } = require("./config/dbConnection.js"); // Import fonction de connexion
const { initializeDbPg } = require("./initData.js"); // Import fonction d'initialisation de la bdd postgres
const ChatMessage = require("./models/chatmessage"); // Import du modèle des messages de chat

const expressWs = require("express-ws");

const app = express(); // Crée une instance d'application Express

// Middleware pour parser le JSON
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Applique CORS à toutes les requêtes
app.use(cors(corsOptions)); // L'app Express utilise CORS avec ses options configurées

// Initialisation du serveur WebSocket
expressWs(app);

// Gestion des messages et des connections par room
const chatRooms = new Map(); // Structure de données pour stocker les messages et connections par room

// Fonction asynchrone pour démarrer l'application
async function startServer() {
  try {
    // Étape 1: Connexion à la base de données
    await connectToDB();
    console.log("Connexion aux bases de données réussie.");

    // Étape 2: Initialisation de la base de données avec les données nécessaires
    //await initializeDbPg();
    //console.log("Initialisation de la base de données postgres terminée.");

    // Étape 3: Montage des routes
    app.use("/", routes);

    // Route WebSocket pour la chatroom
    app.ws("/api/room/chat/:roomId", async function connection(ws, req) {
      const roomId = req.params.roomId;
      console.log(`[WS] Connexion ouverte pour la room ${roomId}`);

      const room = chatRooms.get(roomId) || {
        messages: [],
        connections: [],
      };

      if (!chatRooms.has(roomId)) {
        console.log(`[WS] Création de la room ${roomId}`);
        chatRooms.set(roomId, room);
      }

      // Ajout de la connection à la room
      room.connections.push(ws);

      // Charger tous les anciens messages depuis MongoDB
      try {
        const messages = await ChatMessage.find({ roomId })
          .sort({ timestamp: 1 })
          .exec();

        // Envoyer l'historique complet au client
        if (messages.length > 0) {
          const messagesList = messages
            .map((msg) => `<li>${msg.chat_message}</li>`)
            .join("");
          ws.send(`<ul id='chat_room'>${messagesList}</ul>`);
        }
      } catch (err) {
        console.error("Erreur lors de la récupération des messages:", err);
      }

      // Gestion des messages entrants
      ws.on("message", async function incoming(message) {
        console.log(`[WS] Message reçu :`, message.toString());

        const parsedMessage = JSON.parse(message.toString());
        const chatMessage = parsedMessage.chat_message;

        if (!chatMessage || chatMessage.trim() === "") {
          console.warn(`[WS] Message ignoré, contenu vide.`);
          return;
        }

        console.log(`[WS] Message parsé :`, parsedMessage);

        // Sauvegarde du message dans MongoDB
        const newMessage = new ChatMessage({
          roomId,
          chat_message: chatMessage,
        });

        await newMessage.save();
        console.log(`[WS] Message sauvegardé dans MongoDB :`, chatMessage);

        // Ajouter le message à la mémoire de la room
        room.messages.push(chatMessage);
        console.log(`[WS] Message ajouté à l'historique :`, chatMessage);

        // Diffusion du message à toutes les connexions
        const messagesList = room.messages
          .map((message) => `<li>${message}</li>`)
          .join("");
        room.connections.forEach((connection) => {
          console.log(`[WS] Envoi du message à la connexion`);
          connection.send(`<ul id='chat_room'>${messagesList}</ul>`);
        });
      });
      // Gestion de la déconnexion
      ws.on("close", () => {
        room.connections = room.connections.filter((conn) => conn !== ws);
        console.log(
          `[WS] Connexion fermée. Restant : ${room.connections.length}`
        );
      });
    });

    // Route de vérification de l'état du serveur
    app.get("/health", (req, res) => {
      res.status(200).send({ status: "ok" });
    });

    // Route de test
    app.get("/", (req, res) => {
      res.send("Hello World!");
    });

    // Étape 4: Démarrer le serveur
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (err) {
    console.error("Erreur lors du démarrage du serveur:", err);
  }
}

// Démarrer l'application
startServer();
