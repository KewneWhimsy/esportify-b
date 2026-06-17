const mongoose = require("mongoose");

// Schéma du message de chat
const ChatMessageSchema = new mongoose.Schema({
  roomId: { type: String, required: true }, // Identifiant de la room
  chat_message: { type: String, required: true }, // Contenu du message
  username: { type: String, default: 'Anonyme' },
  timestamp: { type: Date, default: Date.now }, // Date d'envoi du message
  // Date de fin de l'événement : MongoDB supprime automatiquement le message une fois cette date passée (TTL index, expires: 0 = pas de délai supplémentaire)
  expiresAt: { type: Date, index: { expires: 0 } },
});

const ChatMessage = mongoose.model("ChatMessage", ChatMessageSchema);
module.exports = ChatMessage;