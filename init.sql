-- Supprime les tables existantes si elles existent, pour redémarrer proprement (temporaire)
--DROP TABLE IF EXISTS imagesevents, events, users CASCADE;
-- Conserve les relations mais efface les données
--TRUNCATE imagesevents, events, users RESTART IDENTITY CASCADE;

-- Table des utilisateurs
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY, -- Identifiant unique de l'utilisateur
    username VARCHAR(30) NOT NULL, -- Nom d'utilisateur
    email VARCHAR(100) NOT NULL CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'), -- Vérification adresse email valide
    created_at TIMESTAMP DEFAULT NOW(), -- Date de création du compte
    updated_at TIMESTAMP DEFAULT NOW() -- Date de dernière mise à jour du compte
);
-- Index pour accélérer les recherches par nom d'utilisateur
DROP INDEX IF EXISTS idx_users_username;
CREATE INDEX idx_users_username ON users (username);

-- Contrainte pour s'assurer que l'email est unique
ALTER TABLE users ADD CONSTRAINT unique_email UNIQUE (email);

-- Table des événements
CREATE TABLE IF NOT EXISTS events (
    id SERIAL PRIMARY KEY,            -- Identifiant unique de l'événement
    title VARCHAR(100) NOT NULL,       -- Titre de l'événement
    description TEXT,                  -- Description de l'événement
    players_count INT CHECK (players_count > 1), -- Nombre de joueurs
    is_approved BOOLEAN DEFAULT FALSE, -- Statut de l'événement par défaut (non approuvé)
    start_datetime TIMESTAMP NOT NULL, -- Date et heure de début
    end_datetime TIMESTAMP NOT NULL,   -- Date et heure de fin
    user_id INT REFERENCES users(id), -- Référence à l'utilisateur créateur de l'événement
    created_at TIMESTAMP DEFAULT NOW(),-- Date de création
    updated_at TIMESTAMP DEFAULT NOW() -- Date de dernière mise à jour
);
-- Index pour accélérer les recherches par plage de dates
DROP INDEX IF EXISTS idx_datetime_range;
CREATE INDEX idx_datetime_range ON events (start_datetime, end_datetime);

-- Contrainte pour s'assurer que la date de fin est après la date de début
ALTER TABLE events ADD CONSTRAINT check_dates CHECK (start_datetime < end_datetime);

-- Contrainte pour s'assurer que le nombre de joueurs est supérieur à 1
ALTER TABLE events ADD CONSTRAINT check_players_count CHECK (players_count > 1);

-- Fonction pour mettre à jour le champ updated_at automatiquement
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW(); -- Met à jour le champ updated_at avec la date et l'heure actuelles
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour appeler la fonction update_updated_at avant chaque mise à jour de la table users
CREATE TRIGGER trg_update_updated_at_users
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

-- Trigger pour appeler la fonction update_updated_at avant chaque mise à jour de la table events
CREATE TRIGGER trg_update_updated_at
BEFORE UPDATE ON events
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

-- Table des images d'événements
CREATE TABLE IF NOT EXISTS imagesevents (
    id SERIAL PRIMARY KEY,           -- Identifiant unique de l'image
    event_id INT REFERENCES events(id) ON DELETE CASCADE, -- Référence à l'événement
    image_url VARCHAR(255) NOT NULL CHECK (image_url ~* '^(http|https)://'),  -- Vérification URL de l'image, doit commencer par http ou https
    created_at TIMESTAMP DEFAULT NOW() -- Date et heure d'ajout de l'image dans la base de données
);
-- Index pour accélérer les recherches par event_id
DROP INDEX IF EXISTS idx_event_id;
CREATE INDEX idx_event_id ON imagesevents (event_id);

-- Insertion des données initiales de manière idempotente
INSERT INTO users (username, email)
VALUES 
    ('admin', 'admin@esportify.com'),
    ('GoMAN', 'gogogo@gomail.gom'),
    ('Gigi', 'gigilafleche@sportific.com'),
    ('league_fan', 'lol@esportify.com'),
    ('Mclaire', 'mclaire@edu.fr'),
    ('Marcel GAMING', 'marcel.le.boss@gmail.com'),
    ('testuser', 'esportifymailtest@yopmail.com')
ON CONFLICT DO NOTHING;

INSERT INTO events (title, description, players_count, is_approved, start_datetime, end_datetime, user_id)
VALUES
    ('Playtest exclusif esportify', 'Accéder au lien dans vos mail pour tester gratuitement LE nouveau jeu', 16, TRUE, 
     '2025-01-01 15:00'::timestamp, '2025-01-01 18:00'::timestamp, 1),
    ('Tournoi CSS GO', 'Go go go go comme ils disent', 12, TRUE, 
     '2024-12-01 10:00'::timestamp, '2024-12-01 12:00'::timestamp, 2),
    ('Tournoi de pétanque', 'Marcel sera de la partie ! Venez nombreux, venez joyeux !', 8, FALSE, 
     '2024-12-02 15:00'::timestamp, '2024-12-02 18:00'::timestamp, 3),
    ('Tournoi de League of Legend', 'Rejoignez-nous pour notre compétition hebdomadaire', 32, TRUE, 
     '2024-12-03 09:00'::timestamp, '2024-12-03 11:00'::timestamp, 4),
    ('Tournoi de League of Legend mieux', 'Venez sur MON événement', 40, TRUE, 
     '2024-12-03 09:00'::timestamp, '2024-12-03 11:00'::timestamp, 3),
    ('Kermesse du village', 'Chers amis, nous vous attendont nombreux le 10 Janvier.', 100, FALSE, 
     '2025-01-10 09:00'::timestamp, '2025-01-11 05:00'::timestamp, 5),
    ('Petite partie d''échec ?', 'alléééééé !!!! :sparkles:', 2, TRUE,
     '2024-11-15 09:00'::timestamp, '2024-12-20 12:00'::timestamp, 2),
    ('événement test', 'à accepter', 20, FALSE, 
     '2024-11-17 00:00'::timestamp, '2024-12-17 23:59'::timestamp, 7)
ON CONFLICT DO NOTHING;



