const WebSocket = require('ws');
const { pgClient } = require('../../config/dbConnection.js');

// Créer un serveur WebSocket
const wss = new WebSocket.Server({ noServer: true });

// Gérer les connexions WebSocket
wss.on('connection', (ws, req) => {
  const eventId = req.url.split('/').pop(); // Extraire l'ID de l'événement à partir de l'URL

  // Lorsque le serveur reçoit un message
  ws.on('message', (message) => {
    console.log(`Message reçu pour l'événement ${eventId}: ${message}`);
    
    // Traitement du message ou diffusion à tous les utilisateurs dans la room
    // Ici, tu peux aussi ajouter la logique pour sauvegarder les messages dans la base de données.
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(`Message de l'événement ${eventId}: ${message}`);
      }
    });
  });

  // Envoyer un message de bienvenue lors de la connexion
  ws.send('Bienvenue dans la chatroom de l\'événement!');
});

// Gérer les mises à niveau de la requête pour établir une connexion WebSocket
module.exports = (server) => {
  server.on('upgrade', (request, socket, head) => {
    // Lors d'une requête d'upgrade, on lève l'événement WebSocket
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  });
};
