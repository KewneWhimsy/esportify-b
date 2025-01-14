-- Table des utilisateurs
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(30) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,63}$'),
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'visiteur',
    score INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Table des événements
CREATE TABLE IF NOT EXISTS events (
    id SERIAL PRIMARY KEY,
    title VARCHAR(100) NOT NULL,
    description VARCHAR (500) NOT NULL,
    players_count INT CHECK (players_count > 1),
    is_approved BOOLEAN DEFAULT FALSE,
    start_datetime TIMESTAMP NOT NULL,
    end_datetime TIMESTAMP NOT NULL,
    user_id INT REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Table des images d'événements
CREATE TABLE IF NOT EXISTS events_images (
    id SERIAL PRIMARY KEY,
    event_id INT REFERENCES events(id) ON DELETE CASCADE,
    image_url VARCHAR(255) NOT NULL CHECK (image_url ~* '^(https?:\/\/)[\w\-]+(\.[\w\-]+)+[/#?]?.*$'),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Table des favoris
CREATE TABLE IF NOT EXISTS favorites (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    event_id INT REFERENCES events(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, event_id)
);

-- Table des messages
CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    event_id INT REFERENCES events(id) ON DELETE CASCADE,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Index pour les performances
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_users_username') THEN
        CREATE INDEX idx_users_username ON users (username);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_datetime_range') THEN
        CREATE INDEX idx_datetime_range ON events (start_datetime, end_datetime);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_event_id') THEN
        CREATE INDEX idx_event_id ON events_images (event_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_favorites_user_event') THEN
        CREATE INDEX idx_favorites_user_event ON favorites (user_id, event_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_events_is_approved') THEN
        CREATE INDEX idx_events_is_approved ON events (is_approved);
    END IF;

END $$;

-- Fonction pour vérifier les chevauchements d'événements
CREATE OR REPLACE FUNCTION check_event_overlap()
RETURNS TRIGGER AS $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM events e2
        WHERE e2.user_id = NEW.user_id
        AND e2.id != NEW.id
        AND (NEW.start_datetime, NEW.end_datetime) OVERLAPS (e2.start_datetime, e2.end_datetime)
    ) THEN
        RAISE EXCEPTION 'Il existe déjà un événement qui se chevauche avec celui-ci.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour vérifier les chevauchements avant l'insertion ou la mise à jour des événements
CREATE TRIGGER trg_check_event_overlap
BEFORE INSERT OR UPDATE ON events
FOR EACH ROW
EXECUTE FUNCTION check_event_overlap();

-- Contrainte pour s'assurer que la date de fin est après la date de début
ALTER TABLE events ADD CONSTRAINT check_dates CHECK (start_datetime < end_datetime);

-- Fonction pour vérifier l'approbation de l'événement dans favorites
CREATE OR REPLACE FUNCTION check_event_approval()
RETURNS TRIGGER AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM events e
        WHERE e.id = NEW.event_id AND e.is_approved = TRUE
    ) THEN
        RAISE EXCEPTION 'L\'événement n\'est pas approuvé.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour vérifier l'approbation avant l'ajout dans favorites
CREATE TRIGGER trg_check_event_approval
BEFORE INSERT ON favorites
FOR EACH ROW
EXECUTE FUNCTION check_event_approval();

-- Fonction pour mettre à jour le champ updated_at automatiquement
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour mettre à jour updated_at dans users
CREATE TRIGGER trg_update_updated_at_users
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

-- Trigger pour mettre à jour updated_at dans events
CREATE TRIGGER trg_update_updated_at_events
BEFORE UPDATE ON events
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

-- Insertion des données initiales de manière idempotente
INSERT INTO users (username, email, password, role, score)
VALUES 
    ('admin', 'admin@esport.com', 'admin', 'admin', 0),
    ('GoMAN', 'gogogo@gomail.gom', '123456', 'orga', 100),
    ('Gigi', 'gigilafleche@sportific.com', '123456', 'orga', 77),
    ('league_fan', 'lol@esportify.com', '123456', 'orga', 46),
    ('Mclaire', 'mclaire@edu.fr', '123456', 'orga', 0),
    ('testuser', 'esportifymailtest@yopmail.com', '123456', 'orga', 0),
    ('PlayerMan', 'player@yopmail.com', '123456', 'joueur', 0)
ON CONFLICT DO NOTHING;

INSERT INTO events (title, description, players_count, is_approved, start_datetime, end_datetime, user_id, created_at, updated_at)
VALUES
    ('Playtest exclusif esportify', 'Accéder au lien dans vos mail pour tester gratuitement LE nouveau jeu', 16, TRUE, 
     '2025-01-01 15:00'::timestamp, '2025-01-01 18:00'::timestamp, 1, NOW(), NOW()),
    ('Tournoi CSS GO', 'Go go go go comme ils disent', 12, TRUE, 
     '2024-12-01 10:00'::timestamp, '2024-12-01 12:00'::timestamp, 2, NOW(), NOW()),
    ('Tournoi de pétanque', 'Marcel sera de la partie ! Venez nombreux, venez joyeux !', 8, FALSE, 
     '2024-12-02 15:00'::timestamp, '2024-12-02 18:00'::timestamp, 3, NOW(), NOW()),
    ('Tournoi de League of Legend', 'Rejoignez-nous pour notre compétition hebdomadaire', 32, TRUE, 
     '2024-12-03 09:00'::timestamp, '2024-12-03 11:00'::timestamp, 4, NOW(), NOW()),
    ('Tournoi de League of Legend mieux', 'Venez sur MON événement', 40, TRUE, 
     '2024-12-03 09:00'::timestamp, '2024-12-03 11:00'::timestamp, 3, NOW(), NOW()),
    ('Kermesse du village', 'Chers amis, nous vous attendont nombreux le 10 Janvier.', 100, FALSE, 
     '2025-01-10 09:00'::timestamp, '2025-01-11 05:00'::timestamp, 5, NOW(), NOW()),
    ('Petite partie d''échec ?', 'alléééééé !!!! rejoignez moi pour une loooooogue partie...', 3, TRUE,
     '2024-11-15 09:00'::timestamp, '2024-12-20 12:00'::timestamp, 2, NOW(), NOW()),
    ('événement test', 'à accepter', 20, FALSE, 
     '2024-11-17 00:00'::timestamp, '2024-12-17 23:59'::timestamp, 6, NOW(), NOW())
ON CONFLICT DO NOTHING;

INSERT INTO favorites (user_id, event_id, created_at)
VALUES 
    (1, 1, NOW())
ON CONFLICT DO NOTHING;
