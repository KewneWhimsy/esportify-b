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
    // Sessions de l'agenda officiel du Web3 Summit 2026 (18-19 juin, Funkhaus Berlin),
    // hors espaces/installations qui tournent toute la journée (Chill Space, Developer
    // Playground, etc). Toutes rattachées au compte admin (user_id=1) : le trigger anti-
    // chevauchement est désactivé pour cet insert car ce sont des sessions en parallèle
    // dans des salles différentes, pas un humain qui se double-booke.
    const eventsQuery = `
        ALTER TABLE events DISABLE TRIGGER trg_check_event_overlap;
        INSERT INTO events (title, description, players_count, is_approved, start_datetime, end_datetime, user_id, created_at, updated_at)
        VALUES
            ('Opening & Housekeeping', 'Session de l''agenda officiel du Web3 Summit 2026 - Salle : Studio 1', NULL, TRUE, '2026-06-18 10:00'::timestamp, '2026-06-18 10:05'::timestamp, 1, NOW(), NOW()),
            ('Say Hello to the Web3 Summit Apps', 'Session de l''agenda officiel du Web3 Summit 2026 - Salle : Studio 1', NULL, TRUE, '2026-06-18 10:05'::timestamp, '2026-06-18 10:50'::timestamp, 1, NOW(), NOW()),
            ('The Hidden Price of Free', 'Session de l''agenda officiel du Web3 Summit 2026 - Salle : Studio 1', NULL, TRUE, '2026-06-18 10:50'::timestamp, '2026-06-18 11:15'::timestamp, 1, NOW(), NOW()),
            ('Introducing the exit to community cookbook', 'Session de l''agenda officiel du Web3 Summit 2026 - Salle : Room H1', NULL, TRUE, '2026-06-18 11:00'::timestamp, '2026-06-18 12:00'::timestamp, 1, NOW(), NOW()),
            ('Under the hood', 'Session de l''agenda officiel du Web3 Summit 2026 - Salle : Studio 2', NULL, TRUE, '2026-06-18 11:15'::timestamp, '2026-06-18 12:00'::timestamp, 1, NOW(), NOW()),
            ('More Truth - What Web3 Was Chasing', 'Session de l''agenda officiel du Web3 Summit 2026 - Salle : Studio 1', NULL, TRUE, '2026-06-18 11:30'::timestamp, '2026-06-18 11:55'::timestamp, 1, NOW(), NOW()),
            ('Polkadot 2030', 'Session de l''agenda officiel du Web3 Summit 2026 - Salle : Studio 1', NULL, TRUE, '2026-06-18 12:00'::timestamp, '2026-06-18 13:00'::timestamp, 1, NOW(), NOW()),
            ('Live-Coding Music workshop', 'Session de l''agenda officiel du Web3 Summit 2026 - Salle : Studio 4', NULL, TRUE, '2026-06-18 13:30'::timestamp, '2026-06-18 15:30'::timestamp, 1, NOW(), NOW()),
            ('The Neutral Ground', 'Session de l''agenda officiel du Web3 Summit 2026 - Salle : Studio 1', NULL, TRUE, '2026-06-18 14:00'::timestamp, '2026-06-18 14:30'::timestamp, 1, NOW(), NOW()),
            ('Build & deploy your first next-gen Web3 product', 'Session de l''agenda officiel du Web3 Summit 2026 - Salle : Studio 2', NULL, TRUE, '2026-06-18 14:00'::timestamp, '2026-06-18 14:45'::timestamp, 1, NOW(), NOW()),
            ('The K-Hole Economy', 'Session de l''agenda officiel du Web3 Summit 2026 - Salle : Studio 1', NULL, TRUE, '2026-06-18 14:30'::timestamp, '2026-06-18 15:00'::timestamp, 1, NOW(), NOW()),
            ('Scalable Web3 Storage for Products', 'Session de l''agenda officiel du Web3 Summit 2026 - Salle : Studio 2', NULL, TRUE, '2026-06-18 14:45'::timestamp, '2026-06-18 15:30'::timestamp, 1, NOW(), NOW()),
            ('Play, Own, Build: The New Foundations of Gaming', 'Session de l''agenda officiel du Web3 Summit 2026 - Salle : Room H1-4', NULL, TRUE, '2026-06-18 15:00'::timestamp, '2026-06-18 16:00'::timestamp, 1, NOW(), NOW()),
            ('Closing Keynote', 'Session de l''agenda officiel du Web3 Summit 2026 - Salle : Studio 1', NULL, TRUE, '2026-06-18 15:30'::timestamp, '2026-06-18 16:30'::timestamp, 1, NOW(), NOW()),
            ('Product-sdk: Building', 'Session de l''agenda officiel du Web3 Summit 2026 - Salle : Studio 2', NULL, TRUE, '2026-06-18 15:30'::timestamp, '2026-06-18 16:00'::timestamp, 1, NOW(), NOW()),
            ('Manifesto for a Dark Renaissance', 'Session de l''agenda officiel du Web3 Summit 2026 - Salle : Studio 1', NULL, TRUE, '2026-06-18 16:30'::timestamp, '2026-06-18 17:00'::timestamp, 1, NOW(), NOW()),
            ('Closing & Housekeeping', 'Session de l''agenda officiel du Web3 Summit 2026 - Salle : Studio 1', NULL, TRUE, '2026-06-18 17:00'::timestamp, '2026-06-18 17:15'::timestamp, 1, NOW(), NOW()),
            ('Tee Ceremony', 'Session de l''agenda officiel du Web3 Summit 2026 - Salle : Room H1', NULL, TRUE, '2026-06-18 17:20'::timestamp, '2026-06-18 17:40'::timestamp, 1, NOW(), NOW()),
            ('The Plural Monolith', 'Session de l''agenda officiel du Web3 Summit 2026 - Salle : Studio 4', NULL, TRUE, '2026-06-18 18:00'::timestamp, '2026-06-18 19:30'::timestamp, 1, NOW(), NOW()),
            ('Art performance', 'Session de l''agenda officiel du Web3 Summit 2026 - Salle : Room H1-4', NULL, TRUE, '2026-06-18 18:45'::timestamp, '2026-06-18 20:45'::timestamp, 1, NOW(), NOW()),
            ('Live-Coding Music performance', 'Session de l''agenda officiel du Web3 Summit 2026 - Salle : Studio 4', NULL, TRUE, '2026-06-18 20:00'::timestamp, '2026-06-18 21:00'::timestamp, 1, NOW(), NOW()),
            ('Mobile Kino Pop Up Cinema', 'Session de l''agenda officiel du Web3 Summit 2026 - Salle : Outdoor', NULL, TRUE, '2026-06-18 21:45'::timestamp, '2026-06-19 00:00'::timestamp, 1, NOW(), NOW()),
            ('Opening & Housekeeping', 'Session de l''agenda officiel du Web3 Summit 2026 - Salle : Studio 1', NULL, TRUE, '2026-06-19 10:00'::timestamp, '2026-06-19 10:05'::timestamp, 1, NOW(), NOW()),
            ('People Don''t Use Technology', 'Session de l''agenda officiel du Web3 Summit 2026 - Salle : Studio 1', NULL, TRUE, '2026-06-19 10:05'::timestamp, '2026-06-19 10:35'::timestamp, 1, NOW(), NOW()),
            ('The Fight For The Future Of AI', 'Session de l''agenda officiel du Web3 Summit 2026 - Salle : Studio 1', NULL, TRUE, '2026-06-19 10:35'::timestamp, '2026-06-19 11:05'::timestamp, 1, NOW(), NOW()),
            ('Unstoppable Voices', 'Session de l''agenda officiel du Web3 Summit 2026 - Salle : Room H1-4', NULL, TRUE, '2026-06-19 11:00'::timestamp, '2026-06-19 13:00'::timestamp, 1, NOW(), NOW()),
            ('SimpleX Community Credits', 'Session de l''agenda officiel du Web3 Summit 2026 - Salle : Studio 2', NULL, TRUE, '2026-06-19 11:05'::timestamp, '2026-06-19 11:30'::timestamp, 1, NOW(), NOW()),
            ('Artists Should Be Running This', 'Session de l''agenda officiel du Web3 Summit 2026 - Salle : Studio 1', NULL, TRUE, '2026-06-19 11:20'::timestamp, '2026-06-19 12:05'::timestamp, 1, NOW(), NOW()),
            ('Scaling Human Intelligence', 'Session de l''agenda officiel du Web3 Summit 2026 - Salle : Studio 2', NULL, TRUE, '2026-06-19 11:30'::timestamp, '2026-06-19 12:00'::timestamp, 1, NOW(), NOW()),
            ('Frame Transaction (deep dive)', 'Session de l''agenda officiel du Web3 Summit 2026 - Salle : Studio 2', NULL, TRUE, '2026-06-19 12:00'::timestamp, '2026-06-19 12:30'::timestamp, 1, NOW(), NOW()),
            ('Rewriting the Rules Before the Rules Rewrite Us', 'Session de l''agenda officiel du Web3 Summit 2026 - Salle : Studio 1', NULL, TRUE, '2026-06-19 12:05'::timestamp, '2026-06-19 12:40'::timestamp, 1, NOW(), NOW()),
            ('Privacy Won the Argument', 'Session de l''agenda officiel du Web3 Summit 2026 - Salle : Studio 1', NULL, TRUE, '2026-06-19 12:40'::timestamp, '2026-06-19 13:10'::timestamp, 1, NOW(), NOW()),
            ('Tee Ceremony', 'Session de l''agenda officiel du Web3 Summit 2026 - Salle : Room H1', NULL, TRUE, '2026-06-19 13:30'::timestamp, '2026-06-19 13:50'::timestamp, 1, NOW(), NOW()),
            ('Art performance', 'Session de l''agenda officiel du Web3 Summit 2026 - Salle : Room H1-4', NULL, TRUE, '2026-06-19 14:00'::timestamp, '2026-06-19 15:50'::timestamp, 1, NOW(), NOW()),
            ('Cypherpunk Culture Within Blockchain Communities', 'Session de l''agenda officiel du Web3 Summit 2026 - Salle : Studio 1', NULL, TRUE, '2026-06-19 14:15'::timestamp, '2026-06-19 14:45'::timestamp, 1, NOW(), NOW()),
            ('Decentralised, privacy-preserving Twitter clone', 'Session de l''agenda officiel du Web3 Summit 2026 - Salle : Studio 2', NULL, TRUE, '2026-06-19 14:30'::timestamp, '2026-06-19 15:00'::timestamp, 1, NOW(), NOW()),
            ('The Future of Truth on the Internet', 'Session de l''agenda officiel du Web3 Summit 2026 - Salle : Studio 1', NULL, TRUE, '2026-06-19 14:45'::timestamp, '2026-06-19 15:15'::timestamp, 1, NOW(), NOW()),
            ('Belonging before identity', 'Session de l''agenda officiel du Web3 Summit 2026 - Salle : Studio 2', NULL, TRUE, '2026-06-19 15:00'::timestamp, '2026-06-19 15:30'::timestamp, 1, NOW(), NOW()),
            ('Music Performance', 'Session de l''agenda officiel du Web3 Summit 2026 - Salle : Studio 4', NULL, TRUE, '2026-06-19 15:00'::timestamp, '2026-06-19 15:50'::timestamp, 1, NOW(), NOW()),
            ('Developer Playground: Awards and closing', 'Session de l''agenda officiel du Web3 Summit 2026 - Salle : Foyer', NULL, TRUE, '2026-06-19 15:00'::timestamp, '2026-06-19 16:00'::timestamp, 1, NOW(), NOW()),
            ('The JAM Demo', 'Session de l''agenda officiel du Web3 Summit 2026 - Salle : Studio 1', NULL, TRUE, '2026-06-19 15:40'::timestamp, '2026-06-19 16:10'::timestamp, 1, NOW(), NOW()),
            ('Fireside chat', 'Session de l''agenda officiel du Web3 Summit 2026 - Salle : Outdoor', NULL, TRUE, '2026-06-19 16:10'::timestamp, '2026-06-19 16:50'::timestamp, 1, NOW(), NOW()),
            ('JAM Fireside', 'Session de l''agenda officiel du Web3 Summit 2026 - Salle : Studio 1', NULL, TRUE, '2026-06-19 16:15'::timestamp, '2026-06-19 17:15'::timestamp, 1, NOW(), NOW()),
            ('Closing', 'Session de l''agenda officiel du Web3 Summit 2026 - Salle : Studio 1', NULL, TRUE, '2026-06-19 17:15'::timestamp, '2026-06-19 17:20'::timestamp, 1, NOW(), NOW())
        ON CONFLICT DO NOTHING;
        ALTER TABLE events ENABLE TRIGGER trg_check_event_overlap;
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