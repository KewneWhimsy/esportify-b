const mongoose = require("mongoose");

// Schéma du message de chat
const ChatMessageSchema = new mongoose.Schema({
  roomId: { type: String, required: true }, // Identifiant de la room
  chat_message: { type: String, required: true }, // Contenu du message
  timestamp: { type: Date, default: Date.now }, // Date d'envoi du message
});

const ChatMessage = mongoose.model("ChatMessage", ChatMessageSchema);
module.exports = ChatMessage;