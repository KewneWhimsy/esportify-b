const { pgClient } = require("./config/dbConnection.js");
const bcrypt = require("bcrypt");

// Données des utilisateurs à insérer
const users = [
    { username: "admin", email: "admin@esport.com", password: "admin", role: "admin", score: 0 },
    { username: "GoMAN", email: "gogogo@gomail.gom", password: "123456", role: "orga", score: 100 },
    { username: "Gigi", email: "gigilafleche@sportific.com", password: "123456", role: "orga", score: 77 },
    { username: "league_fan", email: "lol@esportify.com", password: "123456", role: "orga", score: 46 },
    { username: "Mclaire", email: "mclaire@edu.fr", password: "123456", role: "orga", score: 0 },
    { username: "testuser", email: "esportifymailtest@yopmail.com", password: "123456", role: "orga", score: 0 },
    { username: "PlayerMan", email: "player@yopmail.com", password: "123456", role: "joueur", score: 0 },
];

// Fonction pour hacher les mots de passe et insérer les utilisateurs
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

            await pgClient.query(query, values);
            console.log(`Utilisateur ${user.username} inséré avec succès.`);
        }
        console.log("Tous les utilisateurs ont été initialisés.");
    } catch (error) {
        console.error("Erreur lors de l'initialisation des utilisateurs :", error);
    }
}

// Fonction pour insérer les événements dans la base
async function initializeEvents() {
    const eventsQuery = `
        INSERT INTO events (title, description, players_count, is_approved, start_datetime, end_datetime, user_id, created_at, updated_at)
        VALUES
            ('Playtest exclusif esportify', 'Accéder au lien dans vos mail pour tester gratuitement LE nouveau jeu', 16, TRUE, '2025-01-01 15:00'::timestamp, '2025-01-01 18:00'::timestamp, 1, NOW(), NOW()),
            ('Tournoi CSS GO', 'Go go go go comme ils disent', 12, TRUE, '2024-12-01 10:00'::timestamp, '2024-12-01 12:00'::timestamp, 2, NOW(), NOW()),
            ('Tournoi de pétanque', 'Marcel sera de la partie ! Venez nombreux, venez joyeux !', 8, FALSE, '2024-12-02 15:00'::timestamp, '2024-12-02 18:00'::timestamp, 3, NOW(), NOW()),
            ('Tournoi de League of Legend', 'Rejoignez-nous pour notre compétition hebdomadaire', 32, TRUE, '2024-12-03 09:00'::timestamp, '2024-12-03 11:00'::timestamp, 4, NOW(), NOW()),
            ('Tournoi de League of Legend mieux', 'Venez sur MON événement', 40, TRUE, '2024-12-03 09:00'::timestamp, '2024-12-03 11:00'::timestamp, 3, NOW(), NOW()),
            ('Kermesse du village', 'Chers amis, nous vous attendont nombreux le 10 Janvier.', 100, FALSE, '2025-01-10 09:00'::timestamp, '2025-01-11 05:00'::timestamp, 5, NOW(), NOW()),
            ('Petite partie d''échec ?', 'alléééééé !!!! rejoignez moi pour une loooooogue partie...', 3, TRUE, '2025-01-15 09:00'::timestamp, '2025-01-30 12:00'::timestamp, 2, NOW(), NOW()),
            ('événement test', 'à accepter', 20, FALSE, '2024-11-17 00:00'::timestamp, '2024-12-17 23:59'::timestamp, 6, NOW(), NOW())
        ON CONFLICT DO NOTHING;
    `;
    try {
        console.log("Insertion des événements...");
        await pgClient.query(eventsQuery);
        console.log("Les événements ont été insérés.");
    } catch (error) {
        console.error("Erreur lors de l'insertion des événements :", error);
    }
}

// Fonction d'initialisation complète
async function initializeData() {
    try {
        // Initialiser les utilisateurs
        await initializeUsers();
        
        // Initialiser les événements
        await initializeEvents();

        console.log("Données initiales insérées avec succès.");
    } catch (error) {
        console.error("Erreur lors de l'initialisation des données :", error);
    }
}

module.exports = initializeData; // Exporter la fonction si nécessaire ailleurs