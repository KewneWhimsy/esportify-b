const bcrypt = require('bcrypt'); // importation de bcrypt pour hacher les mot de passe.
const jwt = require('jsonwebtoken'); // importation de jwt pour créer le token
const {queryDB} = require("../../config/dbConnection"); // bdd Postgresql

// ENREGISTREMENT
module.exports.register = async (req, res) => {
  // Données du formulaire front
  const { username, email, password } = req.body;

  // Vérification de l'existence de l'utilisateur
  const result = await queryDB("SELECT * FROM users WHERE email = $1", [email]);
  /// Si l'email existe déjà : return
  if (result.rows.length > 0) {
    return res.status(400).json({ error: "Email déjà utilisé" });
  }
  const resultUsername = await queryDB("SELECT * FROM users WHERE username = $1", [username]);
  /// Si le nom d'utilisateur existe déjà : return
  if (resultUsername.rows.length > 0) {
    return res.status(400).json({ error: "Nom d'utilisateur déjà pris" });
  }

  // Hashage du mot de passe
  const hashedPassword = await bcrypt.hash(password, 10);

  // Insertion de l'utilisateur dans la base de données
  await queryDB(
    "INSERT INTO users (username, email, password, role) VALUES ($1, $2, $3, 'joueur')", 
    [username, email, hashedPassword]
  );

  res.status(201).json({ message: "Utilisateur créé avec succès" });
};

// CONNEXION
module.exports.login = async (req, res) => {
  // Données du formulaire front
  const { username, password } = req.body;

  const result = await queryDB("SELECT * FROM users WHERE username = $1", [username]);
  // Si le résultat n'est pas conforme aux données attendus : return
  if (result.rows.length === 0) {
    return res.status(400).json({ error: "Nom d'utilisateur ou mot de passe incorrect" });
  }

  const user = result.rows[0];

  // Compare le mot de passe haché et non-haché
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return res.status(400).json({ error: "Mot de passe incorrect" });
  }

  // Crée le token pour la session
  const token = jwt.sign(
    { userId: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "1h" }
  );

  // Renvoi le token au front dans la réponse
  res.json({ message: "Connexion réussie", token });
};