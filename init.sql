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

INSERT INTO users (username, email) VALUES ('admin', 'admin@example.com');
