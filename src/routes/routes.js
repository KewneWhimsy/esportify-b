const express = require('express');
const router = express.Router();

// Import des middlewares
const authenticateToken = require("../middlewares/authMiddleware.js");
const checkRole = require("../middlewares/roleMiddleware.js");

// Import des contrôleurs pour les différentes routes
const eventsController = require('../controllers/eventsController.js');
const authController = require('../controllers/authController.js');
const favoritesController = require('../controllers/favoritesController.js');

// === Routes publiques ===
router.get("/api/events", eventsController.getAllEvents);
router.get("/api/event/:id", eventsController.getEventById);

// === Routes d'authentification ===
router.post("/api/register", authController.register);
router.post("/api/login", authController.login);

// === Routes protégées ===
// Routes joueur+
router.post("/api/favorites", authenticateToken, checkRole(["joueur", "orga", "admin"]), favoritesController.toggleFavorite);
router.get("/api/favorites", authenticateToken, checkRole(["joueur", "orga", "admin"]), favoritesController.showFavorited);

// Routes orga+
router.post("/api/events", authenticateToken, checkRole(["orga", "admin"]), eventsController.createEvent);

// Routes admin
router.post("/admin/events/:id/approve", authenticateToken, checkRole("admin"), eventsController.approveEvent);

module.exports = router;