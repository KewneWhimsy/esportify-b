const jwt = require("jsonwebtoken");

// Middleware pour vérifier le token JWT
function authenticateToken(req, res, next) {
  // Récupère le token de l'en-tête Authorization
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Token manquant" });
  }

  // Vérifie le token avec la clé secrète
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).json({ error: "Token invalide" });
    }
    
    // Ajoute les informations de l'utilisateur décodé à la requête
    req.user = decoded; 
    next();
  });
}

module.exports = authenticateToken;
