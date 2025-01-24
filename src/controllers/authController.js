const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const {pgClient} = require("../../config/dbConnection");

module.exports.register = async (req, res) => {
  const { username, email, password } = req.body;

  // Vérification de l'existence de l'utilisateur
  const result = await pgClient.query("SELECT * FROM users WHERE email = $1", [email]);
  if (result.rows.length > 0) {
    return res.status(400).json({ error: "Email déjà utilisé" });
  }
  const resultUsername = await pgClient.query("SELECT * FROM users WHERE username = $1", [username]);
  if (resultUsername.rows.length > 0) {
    return res.status(400).json({ error: "Nom d'utilisateur déjà pris" });
  }

  // Hashage du mot de passe
  const hashedPassword = await bcrypt.hash(password, 10);

  // Insertion de l'utilisateur dans la base de données
  await pgClient.query("INSERT INTO users (username, email, password, role) VALUES ($1, $2, $3, 'joueur')", [username, email, hashedPassword]);

  res.status(201).json({ message: "Utilisateur créé avec succès" });
};

module.exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Recherche de l'utilisateur dans la base de données
    const result = await pgClient.query("SELECT * FROM users WHERE username = $1", [username]);
    if (result.rows.length === 0) {
      return res.status(400).json({ error: "Nom d'utilisateur ou mot de passe incorrect" });
    }

    const user = result.rows[0];

    // Vérification du mot de passe
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: "Nom d'utilisateur ou mot de passe incorrect" });
    }

    // Génération du token JWT
    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    // Envoi de la réponse avec le token et les détails utilisateur
    res.json({
      message: "Connexion réussie",
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("Erreur lors de la connexion :", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
};