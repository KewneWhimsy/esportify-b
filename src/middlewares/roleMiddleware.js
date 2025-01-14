// Middleware pour vérifier les rôles
function checkRole(allowedRoles) {
  return (req, res, next) => {
    if (!Array.isArray(allowedRoles)) {
      allowedRoles = [allowedRoles]; // Si on passe un seul rôle, le transforme en tableau
    }

    // Vérifie si le rôle de l'utilisateur est dans la liste des rôles autorisés
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: "Accès refusé" });
    }

    next();
  };
}

module.exports = checkRole;
