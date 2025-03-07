-- Réinitialisation
--DROP TABLE IF EXISTS favorites, events_images, messages, events, users CASCADE;

-- Table des utilisateurs
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY, -- Identifiant unique de l'utilisateur
    username VARCHAR(30) NOT NULL UNIQUE, -- Nom d'utilisateur
    email VARCHAR(100) NOT NULL UNIQUE CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,63}$'), -- adresse email unique et valide
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'visiteur',
    score INT DEFAULT 0, -- Score du joueur, initialisé à 0
    created_at TIMESTAMP DEFAULT NOW(), -- Date de création du compte
    updated_at TIMESTAMP DEFAULT NOW() -- Date de dernière mise à jour du compte
);

-- Table des événements
CREATE TABLE IF NOT EXISTS events (
    id SERIAL PRIMARY KEY,            -- Identifiant unique de l'événement
    title VARCHAR(100) NOT NULL,       -- Titre de l'événement
    description VARCHAR (500) NOT NULL,                  -- Description de l'événement
    players_count INT CHECK (players_count > 1), -- Nombre de joueurs
    is_approved BOOLEAN DEFAULT FALSE, -- Statut de l'événement par défaut (non approuvé)
    start_datetime TIMESTAMP NOT NULL, -- Date et heure de début
    end_datetime TIMESTAMP NOT NULL,   -- Date et heure de fin
    user_id INT REFERENCES users(id), -- Référence à l'utilisateur créateur de l'événement
    created_at TIMESTAMP DEFAULT NOW(),-- Date de création
    updated_at TIMESTAMP DEFAULT NOW() -- Date de dernière mise à jour
);

-- Table des images d'événements
CREATE TABLE IF NOT EXISTS events_images (
    id SERIAL PRIMARY KEY,           -- Identifiant unique de l'image
    event_id INT REFERENCES events(id) ON DELETE CASCADE, -- Référence à l'événement
    image_url VARCHAR(255) NOT NULL CHECK (image_url ~* '^(https?:\/\/)[\w\-]+(\.[\w\-]+)+[/#?]?.*$'),  -- Vérification URL de l'image
    created_at TIMESTAMP DEFAULT NOW() -- Date et heure d'ajout de l'image dans la base de données
);

-- Table des favoris
CREATE TABLE IF NOT EXISTS favorites (
    id SERIAL PRIMARY KEY,           -- Identifiant unique du favori
    user_id INT REFERENCES users(id) ON DELETE CASCADE, -- L'utilisateur qui a ajouté aux favoris
    event_id INT REFERENCES events(id) ON DELETE CASCADE, -- L'événement ajouté comme favori
    created_at TIMESTAMP DEFAULT NOW(), -- Date et heure d'ajout aux favoris
    UNIQUE(user_id, event_id) -- Un utilisateur ne peut pas ajouter le même événement plusieurs fois
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

-- Contrainte pour s'assurer que la date de fin est après la date de début
ALTER TABLE events DROP CONSTRAINT IF EXISTS check_dates;
ALTER TABLE events ADD CONSTRAINT check_dates CHECK (start_datetime < end_datetime);

-- Contrainte pour s'assurer que le nombre de joueurs est supérieur à 1
ALTER TABLE events DROP CONSTRAINT IF EXISTS check_players_count;
ALTER TABLE events ADD CONSTRAINT check_players_count CHECK (players_count > 1);

-- Fonction pour vérifier les chevauchements d'événements
CREATE OR REPLACE FUNCTION check_event_overlap()
RETURNS TRIGGER AS $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM events e2
        WHERE e2.user_id = NEW.user_id
        AND e2.id != NEW.id -- exclut l'événement actuel (dans le cas de mise à jour)
        AND (NEW.start_datetime, NEW.end_datetime) OVERLAPS (e2.start_datetime, e2.end_datetime)
    ) THEN
        RAISE EXCEPTION 'Il existe déjà un événement qui se chevauche avec celui-ci.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- Trigger pour vérifier les chevauchements avant l'insertion ou la mise à jour des événements
CREATE OR REPLACE TRIGGER trg_check_event_overlap
BEFORE INSERT OR UPDATE ON events
FOR EACH ROW
EXECUTE FUNCTION check_event_overlap();

-- Fonction pour mettre à jour le champ updated_at automatiquement
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW(); -- Met à jour le champ updated_at avec la date et l'heure actuelles
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- Trigger pour mettre à jour updated_at dans users
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'trg_update_updated_at_users') THEN
        CREATE TRIGGER trg_update_updated_at_users
        BEFORE UPDATE ON users
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at();
    END IF;
END $$;
-- Trigger pour mettre à jour updated_at dans events
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'trg_update_updated_at_events') THEN
        CREATE TRIGGER trg_update_updated_at_events
        BEFORE UPDATE ON events
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at();
    END IF;
END $$;