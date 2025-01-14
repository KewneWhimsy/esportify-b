const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pgClient = require("../../config/dbConnection");

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
  const { email, password } = req.body;

  const result = await pgClient.query("SELECT * FROM users WHERE email = $1", [email]);
  if (result.rows.length === 0) {
    return res.status(400).json({ error: "Utilisateur introuvable" });
  }

  const user = result.rows[0];

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return res.status(400).json({ error: "Mot de passe incorrect" });
  }

  const token = jwt.sign(
    { userId: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "1h" }
  );

  res.json({ message: "Connexion réussie", token });
};