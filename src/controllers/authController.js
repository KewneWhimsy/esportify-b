const bcrypt = require('bcrypt'); // importation de bcrypt pour hacher les mot de passe.
const jwt = require('jsonwebtoken'); // importation de jwt pour créer le token
const crypto = require('crypto'); // génération d'un mot de passe aléatoire pour les comptes créés par pseudo
const {queryDB} = require("../../config/dbConnection"); // bdd Postgresql

// ENREGISTREMENT
module.exports.register = async (req, res) => {
  // Données du formulaire front (email facultatif : pas besoin d'adresse mail pour s'inscrire)
  const { username, email, password } = req.body;

  // Email factice et unique généré quand l'utilisateur n'en fournit pas, pour respecter la contrainte UNIQUE/NOT NULL en base sans migration de schéma
  const finalEmail = email || `${username}.${Date.now()}@web3summit.local`;

  // Vérification de l'existence de l'utilisateur
  const result = await queryDB("SELECT * FROM users WHERE email = $1", [finalEmail]);
  /// Si l'email existe déjà : return
  if (result.rows.length > 0) {
    return res.status(400).json({ error: "Email already in use" });
  }
  const resultUsername = await queryDB("SELECT * FROM users WHERE username = $1", [username]);
  /// Si le nom d'utilisateur existe déjà : return
  if (resultUsername.rows.length > 0) {
    return res.status(400).json({ error: "Username already taken" });
  }

  // Hashage du mot de passe
  const hashedPassword = await bcrypt.hash(password, 10);

  // Insertion de l'utilisateur dans la base de données : rôle 'orga' direct pour créer/éditer ses propres événements
  await queryDB(
    "INSERT INTO users (username, email, password, role) VALUES ($1, $2, $3, 'orga')",
    [username, finalEmail, hashedPassword]
  );

  res.status(201).json({ message: "User created successfully" });
};

// CONNEXION
module.exports.login = async (req, res) => {
  // Données du formulaire front
  const { username, password } = req.body;

  const result = await queryDB("SELECT * FROM users WHERE username = $1", [username]);
  // Si le résultat n'est pas conforme aux données attendus : return
  if (result.rows.length === 0) {
    return res.status(400).json({ error: "Incorrect username or password" });
  }

  const user = result.rows[0];

  // Compare le mot de passe haché et non-haché
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return res.status(400).json({ error: "Incorrect password" });
  }

  // Crée le token pour la session
  const token = jwt.sign(
    { userId: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "1h" }
  );

  // Renvoi le token au front dans la réponse
  res.json({ message: "Login successful", token });
};

// CONNEXION RAPIDE (pseudo uniquement, sans mot de passe : popup d'arrivée de l'app Polkadot)
module.exports.quickLogin = async (req, res) => {
  const { username } = req.body;

  if (!username || typeof username !== "string" || !username.trim() || username.trim().length > 30) {
    return res.status(400).json({ error: "Please enter a name (max 30 characters)." });
  }
  const cleanUsername = username.trim();

  // Refuse si le pseudo est déjà pris, qu'il appartienne à un vrai compte (mot de passe) ou
  // à un autre arrivant : pas de tentative de connexion sur un compte existant sans mot de passe.
  const resultUsername = await queryDB("SELECT id FROM users WHERE username = $1", [cleanUsername]);
  if (resultUsername.rows.length > 0) {
    return res.status(400).json({ error: "This name is already taken, please choose another one." });
  }

  const finalEmail = `${cleanUsername}.${Date.now()}@web3summit.local`;
  const randomPassword = await bcrypt.hash(crypto.randomBytes(32).toString("hex"), 10);

  let user;
  try {
    const insertResult = await queryDB(
      "INSERT INTO users (username, email, password, role) VALUES ($1, $2, $3, 'orga') RETURNING id, role",
      [cleanUsername, finalEmail, randomPassword]
    );
    user = insertResult.rows[0];
  } catch (error) {
    // Course entre deux arrivants prenant le même pseudo en même temps (contrainte UNIQUE)
    if (error.code === "23505") {
      return res.status(400).json({ error: "This name is already taken, please choose another one." });
    }
    throw error;
  }

  // Session longue (durée du festival) : pas de mot de passe à retaper si le token expire
  const token = jwt.sign(
    { userId: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "3d" }
  );

  res.json({ message: "Login successful", token, role: user.role });
};