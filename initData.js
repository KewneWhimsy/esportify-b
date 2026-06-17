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
            ('Opening & Housekeeping', 'Intervenant(s) : Pascal Possler — Salle : Studio 1', NULL, TRUE, '2026-06-18 10:00'::timestamp, '2026-06-18 10:05'::timestamp, 1, NOW(), NOW()),
            ('Say Hello to the Web3 Summit Apps', 'Intervenant(s) : Anton Khvorov, Alex Bird — Salle : Studio 1', NULL, TRUE, '2026-06-18 10:05'::timestamp, '2026-06-18 10:50'::timestamp, 1, NOW(), NOW()),
            ('The Hidden Price of Free', 'Intervenant(s) : Bill Laboon, Oliver Poole, Heidi Mallace — Salle : Studio 1', NULL, TRUE, '2026-06-18 10:50'::timestamp, '2026-06-18 11:15'::timestamp, 1, NOW(), NOW()),
            ('Introducing the exit to community cookbook', 'How can Web3 projects move beyond the rhetoric of decentralization and actually build ownership structures that are more accountable, resilient, and community-aligned? — Intervenant(s) : Tara Merk, Lovisa Björna — Salle : Room H1', NULL, TRUE, '2026-06-18 11:00'::timestamp, '2026-06-18 12:00'::timestamp, 1, NOW(), NOW()),
            ('Under the hood', 'Intervenant(s) : Torsten Stüber, Adrian-Costin Catangiu — Salle : Studio 2', NULL, TRUE, '2026-06-18 11:15'::timestamp, '2026-06-18 12:00'::timestamp, 1, NOW(), NOW()),
            ('More Truth - What Web3 Was Chasing', 'Intervenant(s) : Andrea Leiter — Salle : Studio 1', NULL, TRUE, '2026-06-18 11:30'::timestamp, '2026-06-18 11:55'::timestamp, 1, NOW(), NOW()),
            ('Polkadot 2030', 'Intervenant(s) : Gavin Wood — Salle : Studio 1', NULL, TRUE, '2026-06-18 12:00'::timestamp, '2026-06-18 13:00'::timestamp, 1, NOW(), NOW()),
            ('Live-Coding Music workshop', 'Please bring your laptop and headphones to take part in the workshop — Intervenant(s) : Antonio Roberts (hellocatfood) — Salle : Studio 4', NULL, TRUE, '2026-06-18 13:30'::timestamp, '2026-06-18 15:30'::timestamp, 1, NOW(), NOW()),
            ('The Neutral Ground', 'Intervenant(s) : Friederike Ernst — Salle : Studio 1', NULL, TRUE, '2026-06-18 14:00'::timestamp, '2026-06-18 14:30'::timestamp, 1, NOW(), NOW()),
            ('Build & deploy your first next-gen Web3 product', 'Intervenant(s) : Karim Jedda, Ionut Zolti — Salle : Studio 2', NULL, TRUE, '2026-06-18 14:00'::timestamp, '2026-06-18 14:45'::timestamp, 1, NOW(), NOW()),
            ('The K-Hole Economy', 'Intervenant(s) : Joshua Dávila — Salle : Studio 1', NULL, TRUE, '2026-06-18 14:30'::timestamp, '2026-06-18 15:00'::timestamp, 1, NOW(), NOW()),
            ('Scalable Web3 Storage for Products', 'Intervenant(s) : Robert Klotzner — Salle : Studio 2', NULL, TRUE, '2026-06-18 14:45'::timestamp, '2026-06-18 15:30'::timestamp, 1, NOW(), NOW()),
            ('Play, Own, Build: The New Foundations of Gaming', 'Intervenant(s) : Ludovico Dominguez, Remy Le Berre, Shawn Tabrizi — Salle : Room H1-4', NULL, TRUE, '2026-06-18 15:00'::timestamp, '2026-06-18 16:00'::timestamp, 1, NOW(), NOW()),
            ('Closing Keynote', 'Intervenant(s) : Yanis Varoufakis — Salle : Studio 1', NULL, TRUE, '2026-06-18 15:30'::timestamp, '2026-06-18 16:30'::timestamp, 1, NOW(), NOW()),
            ('Product-sdk: Building', 'Intervenant(s) : Valentin Fernandez — Salle : Studio 2', NULL, TRUE, '2026-06-18 15:30'::timestamp, '2026-06-18 16:00'::timestamp, 1, NOW(), NOW()),
            ('Manifesto for a Dark Renaissance', 'Intervenant(s) : Amir Taaki — Salle : Studio 1', NULL, TRUE, '2026-06-18 16:30'::timestamp, '2026-06-18 17:00'::timestamp, 1, NOW(), NOW()),
            ('Closing & Housekeeping', 'Intervenant(s) : Pascal Possler — Salle : Studio 1', NULL, TRUE, '2026-06-18 17:00'::timestamp, '2026-06-18 17:15'::timestamp, 1, NOW(), NOW()),
            ('Tee Ceremony', 'Intervenant(s) : CIRCADIAN — Salle : Room H1', NULL, TRUE, '2026-06-18 17:20'::timestamp, '2026-06-18 17:40'::timestamp, 1, NOW(), NOW()),
            ('The Plural Monolith', 'A collective livecoding experiment — Intervenant(s) : Alexandra Cardenas — Salle : Studio 4', NULL, TRUE, '2026-06-18 18:00'::timestamp, '2026-06-18 19:30'::timestamp, 1, NOW(), NOW()),
            ('Art performance', 'Intervenant(s) : Veronika Janovec — Salle : Room H1-4', NULL, TRUE, '2026-06-18 18:45'::timestamp, '2026-06-18 20:45'::timestamp, 1, NOW(), NOW()),
            ('Live-Coding Music performance', 'Intervenant(s) : Antonio Roberts (hellocatfood) — Salle : Studio 4', NULL, TRUE, '2026-06-18 20:00'::timestamp, '2026-06-18 21:00'::timestamp, 1, NOW(), NOW()),
            ('Mobile Kino Pop Up Cinema', 'Screening THE MATRIX — Salle : Outdoor', NULL, TRUE, '2026-06-18 21:45'::timestamp, '2026-06-19 00:00'::timestamp, 1, NOW(), NOW()),
            ('Opening & Housekeeping', 'Intervenant(s) : Pascal Possler — Salle : Studio 1', NULL, TRUE, '2026-06-19 10:00'::timestamp, '2026-06-19 10:05'::timestamp, 1, NOW(), NOW()),
            ('People Don''t Use Technology', 'Intervenant(s) : Karim Jedda — Salle : Studio 1', NULL, TRUE, '2026-06-19 10:05'::timestamp, '2026-06-19 10:35'::timestamp, 1, NOW(), NOW()),
            ('The Fight For The Future Of AI', 'Intervenant(s) : Nick Srnicek — Salle : Studio 1', NULL, TRUE, '2026-06-19 10:35'::timestamp, '2026-06-19 11:05'::timestamp, 1, NOW(), NOW()),
            ('Unstoppable Voices', 'What happens to free expression when platforms decide who gets to speak? Through art, journalism, and emerging Web3 infrastructure, this immersive workshop explores how independent voices can create, publish, and reach audiences — Intervenant(s) : Andy Serra, Carlos Aguiló, Luz Mely Reyes — Salle : Room H1-4', NULL, TRUE, '2026-06-19 11:00'::timestamp, '2026-06-19 13:00'::timestamp, 1, NOW(), NOW()),
            ('SimpleX Community Credits', 'Intervenant(s) : Alain Brenzikofer — Salle : Studio 2', NULL, TRUE, '2026-06-19 11:05'::timestamp, '2026-06-19 11:30'::timestamp, 1, NOW(), NOW()),
            ('Artists Should Be Running This', 'Intervenant(s) : Joan Westenberg — Salle : Studio 1', NULL, TRUE, '2026-06-19 11:20'::timestamp, '2026-06-19 12:05'::timestamp, 1, NOW(), NOW()),
            ('Scaling Human Intelligence', 'Intervenant(s) : Ciarán Murray — Salle : Studio 2', NULL, TRUE, '2026-06-19 11:30'::timestamp, '2026-06-19 12:00'::timestamp, 1, NOW(), NOW()),
            ('Frame Transaction (deep dive)', 'Intervenant(s) : Alex Forshtat — Salle : Studio 2', NULL, TRUE, '2026-06-19 12:00'::timestamp, '2026-06-19 12:30'::timestamp, 1, NOW(), NOW()),
            ('Rewriting the Rules Before the Rules Rewrite Us', 'Intervenant(s) : Nina Siedler, Florence d''Ath, Samuel Jacques-Cloutier — Salle : Studio 1', NULL, TRUE, '2026-06-19 12:05'::timestamp, '2026-06-19 12:40'::timestamp, 1, NOW(), NOW()),
            ('Privacy Won the Argument', 'Intervenant(s) : Max Schrems — Salle : Studio 1', NULL, TRUE, '2026-06-19 12:40'::timestamp, '2026-06-19 13:10'::timestamp, 1, NOW(), NOW()),
            ('Tee Ceremony', 'Intervenant(s) : CIRCADIAN — Salle : Room H1', NULL, TRUE, '2026-06-19 13:30'::timestamp, '2026-06-19 13:50'::timestamp, 1, NOW(), NOW()),
            ('Art performance', 'Intervenant(s) : Veronika Janovec — Salle : Room H1-4', NULL, TRUE, '2026-06-19 14:00'::timestamp, '2026-06-19 15:50'::timestamp, 1, NOW(), NOW()),
            ('Cypherpunk Culture Within Blockchain Communities', 'Intervenant(s) : Paul Dylan-Ennis, Rachel-Rose O''Leary, Max Hampshire — Salle : Studio 1', NULL, TRUE, '2026-06-19 14:15'::timestamp, '2026-06-19 14:45'::timestamp, 1, NOW(), NOW()),
            ('Decentralised, privacy-preserving Twitter clone', 'Intervenant(s) : Micha Roon — Salle : Studio 2', NULL, TRUE, '2026-06-19 14:30'::timestamp, '2026-06-19 15:00'::timestamp, 1, NOW(), NOW()),
            ('The Future of Truth on the Internet', 'Can independent journalism survive the internet as we know it? At a time when trust, visibility, and distribution are increasingly controlled by digital platforms, journalists and Web3 builders come together to explore how decentralized infrastructure can support independent media — Intervenant(s) : Carlos Aguiló, Luz Mely Reyes, Pauline Cohen Vorms, José Luis Peñarredonda Martínez — Salle : Studio 1', NULL, TRUE, '2026-06-19 14:45'::timestamp, '2026-06-19 15:15'::timestamp, 1, NOW(), NOW()),
            ('Belonging before identity', 'Intervenant(s) : Sanne Wassink, Michiel Heij — Salle : Studio 2', NULL, TRUE, '2026-06-19 15:00'::timestamp, '2026-06-19 15:30'::timestamp, 1, NOW(), NOW()),
            ('Music Performance', 'Visuals by Rahul Sharma — Intervenant(s) : Hoshiko Yamane, Makoto Sakamoto — Salle : Studio 4', NULL, TRUE, '2026-06-19 15:00'::timestamp, '2026-06-19 15:50'::timestamp, 1, NOW(), NOW()),
            ('Developer Playground: Awards and closing', 'Salle : Foyer', NULL, TRUE, '2026-06-19 15:00'::timestamp, '2026-06-19 16:00'::timestamp, 1, NOW(), NOW()),
            ('The JAM Demo', 'Intervenant(s) : Gavin Wood — Salle : Studio 1', NULL, TRUE, '2026-06-19 15:40'::timestamp, '2026-06-19 16:10'::timestamp, 1, NOW(), NOW()),
            ('Fireside chat', 'Intervenant(s) : Joan Westenberg, Veronika Janovec, Aria Santillana, Rahul Sharma, So Kanno, CROSSLUCID — Salle : Outdoor', NULL, TRUE, '2026-06-19 16:10'::timestamp, '2026-06-19 16:50'::timestamp, 1, NOW(), NOW()),
            ('JAM Fireside', 'Intervenant(s) : Gavin Wood & TBA — Salle : Studio 1', NULL, TRUE, '2026-06-19 16:15'::timestamp, '2026-06-19 17:15'::timestamp, 1, NOW(), NOW()),
            ('Closing', 'Intervenant(s) : Pascal Possler — Salle : Studio 1', NULL, TRUE, '2026-06-19 17:15'::timestamp, '2026-06-19 17:20'::timestamp, 1, NOW(), NOW())
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