-- Supprime les tables existantes si elles existent, pour redémarrer proprement (temporaire)
DROP TABLE IF EXISTS imagesevents, events, users CASCADE;

-- Table des utilisateurs
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(30) NOT NULL,
    email VARCHAR(100) NOT NULL CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_users_username ON users (username);

ALTER TABLE users ADD CONSTRAINT unique_email UNIQUE (email);

-- Table des événements
CREATE TABLE IF NOT EXISTS events (
    id SERIAL PRIMARY KEY,            -- Identifiant unique de l'événement
    title VARCHAR(100) NOT NULL,       -- Titre de l'événement
    description TEXT,                  -- Description de l'événement
    players_count INT CHECK (players_count >= 0),                 -- Nombre de joueurs
    is_approved BOOLEAN DEFAULT FALSE, -- Statut de l'événement par défaut (non approuvé)
    start_datetime TIMESTAMP NOT NULL, -- Date et heure de début
    end_datetime TIMESTAMP NOT NULL,   -- Date et heure de fin
    user_id INT REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),-- Date de création
    updated_at TIMESTAMP DEFAULT NOW() -- Date de dernière mise à jour
);
CREATE INDEX idx_datetime_range ON events (start_datetime, end_datetime);

ALTER TABLE events ADD CONSTRAINT check_dates CHECK (start_datetime < end_datetime);
ALTER TABLE events ADD CONSTRAINT check_players_count CHECK (players_count >= 0);

-- Trigger pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_updated_at_users
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_update_updated_at
BEFORE UPDATE ON events
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

-- Table des images d'événements
CREATE TABLE IF NOT EXISTS imagesevents (
    id SERIAL PRIMARY KEY,           -- Identifiant unique de l'image
    event_id INT REFERENCES events(id) ON DELETE CASCADE, -- Référence à l'événement
    image_url VARCHAR(255) NOT NULL CHECK (image_url ~* '^(http|https)://'),  -- Vérification pour empêcher des URL trop longues ou mal formées 
    created_at TIMESTAMP DEFAULT NOW()-- Date de création
);
CREATE INDEX idx_event_id ON imagesevents (event_id);

-- Insertion des données initiales (idempotent)
INSERT INTO users (username, email)
VALUES 
    ('admin', 'admin@esportify.com'),
    ('Gigi', 'gigilafleche@sportific.com'),
    ('league_fan', 'lol@esportify.com')
ON CONFLICT DO NOTHING;

INSERT INTO events (title, description, players_count, is_approved, start_datetime, end_datetime, user_id)
VALUES
    ('Tournoi CSS GO', 'Go go go go comme ils disent', 10, TRUE, 
     '2024-12-01 10:00'::timestamp, '2024-12-01 12:00'::timestamp, 1),
    ('Tournoi de pétanque', 'Marcel sera de la partie ! Venez nombreux, venez joyeux !', 8, FALSE, 
     '2024-12-02 15:00'::timestamp, '2024-12-02 18:00'::timestamp, 2),
    ('Tournoi de League of Legend', 'Rejoignez-nous pour notre compétition hebdomadaire', 30, TRUE, 
     '2024-12-03 09:00'::timestamp, '2024-12-03 11:00'::timestamp, 3)
ON CONFLICT DO NOTHING;



