const express = require('express');
const router = express.Router();

// Import des middlewares
const authenticateToken = require("../middlewares/authMiddleware.js");
const checkRole = require("../middlewares/roleMiddleware.js");

// Import des contrôleurs pour les différentes routes
const eventsController = require('../controllers/eventsController.js');
const authController = require('../controllers/authController.js');
const favoritesController = require('../controllers/favoritesController.js');
const adminController = require('../controllers/adminController.js');

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
/// Modération events
router.get("/admin/events/pending", authenticateToken, checkRole("admin"), adminController.getPendingEvents);
router.get("/admin/events/approved", authenticateToken, checkRole("admin"), adminController.getApprovedEvents);
router.post("/admin/events/approve/:eventId", authenticateToken, checkRole("admin"), adminController.approveEvent);
router.post("/admin/events/reject/:eventId", authenticateToken, checkRole("admin"), adminController.rejectEvent);
router.post("/admin/events/suspend/:eventId", authenticateToken, checkRole("admin"), adminController.suspendEvent);
/// Modération users
router.get('admin/users', authenticateToken, checkRole("admin"),UsersController.getUsersWithRoles);
router.post('admin/users/promote/:userId/:newRole', authenticateToken, checkRole("admin"),adminController.promoteUser);
router.post('admin/users/demote/:userId/:newRole', authenticateToken, checkRole("admin"),adminController.demoteUser);

module.exports = router;