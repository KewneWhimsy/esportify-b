CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(30) NOT NULL,
    email VARCHAR(100) NOT NULL
);

CREATE TABLE IF NOT EXISTS events (
    id SERIAL PRIMARY KEY,            -- Identifiant unique de l'événement
    title VARCHAR(100) NOT NULL,       -- Titre de l'événement
    description TEXT,                  -- Description de l'événement
    players_count INT,                 -- Nombre de joueurs
    is_approved BOOLEAN DEFAULT FALSE, -- Statut de l'événement (approuvé ou non)
    start_datetime TIMESTAMP NOT NULL, -- Date et heure de début
    end_datetime TIMESTAMP NOT NULL,   -- Date et heure de fin
    user_pseudo VARCHAR(30),          -- Pseudo de l'utilisateur ayant proposé l'événement
    created_at TIMESTAMP DEFAULT NOW(),-- Date de création
    updated_at TIMESTAMP DEFAULT NOW() -- Date de dernière mise à jour
);

CREATE TABLE IF NOT EXISTS images-events (
    id SERIAL PRIMARY KEY,           -- Identifiant unique de l'image
    event_id INT REFERENCES events(id) ON DELETE CASCADE, -- Référence à l'événement
    image_url VARCHAR(255) NOT NULL,  -- URL de l'image
    created_at TIMESTAMP DEFAULT NOW()-- Date de création
);

-- Insérer plusieurs événements seulement si la table 'events' est vide
INSERT INTO events (title, description, players_count, is_approved, start_datetime, end_datetime, user_pseudo)
SELECT 'Tournoi CSS GO', 'Go go go go comme ils disent', 10, TRUE, '2024-12-01 10:00', '2024-12-01 12:00', 'User1'
UNION ALL
SELECT 'Tournoi de pétanque', 'Marcel sera de la partie ! Venez nombreux, venez joyeux !', 8, FALSE, '2024-12-02 15:00', '2024-12-02 18:00', 'User2'
UNION ALL
SELECT 'Tournoi de League of Legend', 'Description for Event 3', 30, TRUE, '2024-12-03 09:00', '2024-12-03 11:00', 'User3'
WHERE (SELECT COUNT(*) FROM events) = 0;


