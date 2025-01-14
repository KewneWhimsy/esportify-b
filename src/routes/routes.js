const express = require('express');
const router = express.Router();

// Import des middlewares
const authenticateToken = require("../middlewares/authMiddleware.js");
const checkRole = require("../middlewares/roleMiddleware.js");

// Import des contrôleurs pour les différentes routes
const eventsController = require('../controllers/eventsController.js');
const authController = require('../controllers/authController.js');
const favoritesController = require('../controllers/favoritesController.js');

// Routes publiques (pas besoin d'authentification)
router.get("/api/events", eventsController.getAllEvents);
router.get("/event/:id", eventsController.getEventById);

// Routes liées à l'authentification
router.post("/api/register", authController.register);
router.post("/api/login", authController.login);

// Routes protégées par authentification et rôle
router.post("/api/events", authenticateToken, checkRole(["orga", "admin"]), eventsController.createEvent);
router.post("/api/favorites", authenticateToken, checkRole(["joueur", "orga", "admin"]), favoritesController.toggleFavorite);

// Route d'admin - approuver un événement
router.post("/api/events/:id/approve", authenticateToken, checkRole("admin"), adminController.approveEvent);

module.exports = router;