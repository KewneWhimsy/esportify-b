const express = require('express');
const router = express.Router();

// Import des contrôleurs pour les différentes routes
const eventsController = require('../src/controllers/eventsController.js');
const authController = require('../src/controllers/authController.js');
const favoritesController = require('./src/controllers/favoritesController.js');

// Routes publiques (pas besoin d'authentification)
router.get("/events", eventsController.getAllEvents);
router.get("/event/:id", eventsController.getEventById);

// Routes liées à l'authentification
router.post("/register", authController.register);
router.post("/login", authController.login);

// Routes protégées par authentification et rôle
router.post("/events", authenticateToken, checkRole(["orga", "admin"]), eventsController.createEvent);
router.post("/favorites", authenticateToken, checkRole(["joueur", "orga", "admin"]), favoritesController.toggleFavorite);

// Route d'admin - approuver un événement
router.post("/events/:id/approve", authenticateToken, checkRole("admin"), adminController.approveEvent);

module.exports = router;