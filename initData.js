const { queryDB } = require("./config/dbConnection.js");
const bcrypt = require("bcrypt");
const fs = require("fs");

// Données des utilisateurs à insérer
const users = [
    { username: "admin", email: "admin@web3summit.local", password: "admin", role: "admin", score: 0 },
    { username: "GoMAN", email: "gogogo@gomail.gom", password: "123456", role: "orga", score: 100 },
    { username: "Gigi", email: "gigilafleche@web3summit.local", password: "123456", role: "orga", score: 77 },
    { username: "privacy_fan", email: "privacy@web3summit.local", password: "123456", role: "orga", score: 46 },
    { username: "Mclaire", email: "mclaire@edu.fr", password: "123456", role: "orga", score: 0 },
    { username: "testuser", email: "web3summittest@yopmail.com", password: "123456", role: "orga", score: 0 },
    { username: "Attendee", email: "attendee@yopmail.com", password: "123456", role: "orga", score: 0 },
];

// Fonction pour hacher les mots de passe et insérer les utilisateurs test de manière idempotente
async function initializeUsers() {
    try {
        console.log("Initialisation des utilisateurs...");
        for (const user of users) {
            // Hachage du mot de passe
            const hashedPassword = await bcrypt.hash(user.password, 10);

            // Insertion de l'utilisateur dans la base
            const query = `
                INSERT INTO users (username, email, password, role, score)
                VALUES ($1, $2, $3, $4, $5)
                ON CONFLICT DO NOTHING;
            `;
            const values = [user.username, user.email, hashedPassword, user.role, user.score];

            await queryDB(query, values);
            console.log(`Utilisateur ${user.username} inséré avec succès.`);
        }
        console.log("Tous les utilisateurs ont été initialisés.");
    } catch (error) {
        console.error("Erreur lors de l'initialisation des utilisateurs :", error);
    }
}

// Fonction pour insérer les événements de test de manière idempotente
async function initializeEvents() {
    const eventsQuery = `
        INSERT INTO events (title, description, players_count, is_approved, start_datetime, end_datetime, user_id, created_at, updated_at)
        VALUES
            ('Privacy is Dignity: keynote', 'Talk d''ouverture sur la confidentialité comme condition de base de la vie numérique', 80, TRUE, '2026-06-18 10:00'::timestamp, '2026-06-18 11:00'::timestamp, 1, NOW(), NOW()),
            ('Workshop : auto-héberger son identité décentralisée', 'Atelier pratique pour mettre en place son propre système d''identité souveraine', 20, TRUE, '2026-06-18 11:30'::timestamp, '2026-06-18 13:00'::timestamp, 2, NOW(), NOW()),
            ('Unconference : résistance à la censure', 'Session improvisée ouverte à toutes et tous, proposez vos sujets sur place', 30, FALSE, '2026-06-18 14:00'::timestamp, '2026-06-18 15:00'::timestamp, 3, NOW(), NOW()),
            ('Pop-up talk : usabilité des wallets', 'Discussion courte et spontanée sur les frictions UX du Web3', 25, TRUE, '2026-06-18 15:30'::timestamp, '2026-06-18 16:00'::timestamp, 4, NOW(), NOW()),
            ('Atelier gouvernance communautaire', 'Modèles alternatifs de prise de décision collective', 35, TRUE, '2026-06-19 09:00'::timestamp, '2026-06-19 11:00'::timestamp, 3, NOW(), NOW()),
            ('Installation artistique interactive', 'Performance et création collaborative autour de la souveraineté numérique', 100, FALSE, '2026-06-19 12:00'::timestamp, '2026-06-19 18:00'::timestamp, 5, NOW(), NOW()),
            ('Pop-up talk : pétanque entre deux sessions', 'Pause détente pour celles et ceux qui veulent souffler entre deux talks', 8, TRUE, '2026-06-19 13:00'::timestamp, '2026-06-19 14:00'::timestamp, 2, NOW(), NOW()),
            ('événement test', 'à accepter', 20, FALSE, '2024-11-17 00:00'::timestamp, '2024-12-17 23:59'::timestamp, 6, NOW(), NOW())
        ON CONFLICT DO NOTHING;
    `;
    try {
        console.log("Insertion des événements...");
        await queryDB(eventsQuery);
        console.log("Les événements ont été insérés.");
    } catch (error) {
        console.error("Erreur lors de l'insertion des événements :", error);
    }
}

// Fonction d'initialisation des données complète
async function initializeData() {
    try {
        // Initialiser les utilisateurs
        await initializeUsers();
        
        // Initialiser les événements
        await initializeEvents();

        console.log("Initialisation de la db postgres réussie");
    } catch (error) {
        console.error("Erreur lors de l'initialisation des données :", error);
    }
}

// Fonction d'initialisation, init.sql(structure) + initializeData(données)
async function initializeDbPg() {
  try {
    // Lire et convertir le fichier SQL en String
    const initSql = fs.readFileSync('./init.sql').toString();

    // Exécuter le script SQL pour initialiser la base
    await queryDB(initSql);
    console.log('Database postgres initialisée avec init.sql');
    
    // Insérer les données après l'initialisation SQL
    await initializeData();
    console.log('Données initiales insérées avec succès.');
  } catch (err) {
    console.error("Erreur durant initialisation de postgres", err);
    throw err; // Propager l'erreur si l'initialisation échoue
  }
}

module.exports = { initializeDbPg };