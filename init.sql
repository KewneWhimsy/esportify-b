-- Supprime les tables existantes si elles existent, pour redémarrer proprement (temporaire)
DROP TABLE IF EXISTS imagesevents, events, users CASCADE;
-- Conserve les relations mais efface les données
--TRUNCATE imagesevents, events, users RESTART IDENTITY CASCADE;

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
CREATE TABLE IF NOT EXISTS imagesevents (
    id SERIAL PRIMARY KEY,           -- Identifiant unique de l'image
    event_id INT REFERENCES events(id) ON DELETE CASCADE, -- Référence à l'événement
    image_url VARCHAR(255) NOT NULL CHECK (image_url ~* '^(https?:\/\/)[\w\-]+(\.[\w\-]+)+[/#?]?.*$'),  -- Vérification URL de l'image
    created_at TIMESTAMP DEFAULT NOW() -- Date et heure d'ajout de l'image dans la base de données
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
        CREATE INDEX idx_event_id ON imagesevents (event_id);
    END IF;
END $$;

-- Contrainte pour s'assurer que la date de fin est après la date de début
ALTER TABLE users DROP CONSTRAINT IF EXISTS check_dates;
ALTER TABLE events ADD CONSTRAINT check_dates CHECK (start_datetime < end_datetime);

-- Contrainte pour s'assurer que le nombre de joueurs est supérieur à 1
ALTER TABLE users DROP CONSTRAINT IF EXISTS check_players_count;
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
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'trg_update_updated_at_users') THEN
        CREATE TRIGGER trg_update_updated_at_users
        BEFORE UPDATE ON users
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at();
    END IF;
END $$;

-- Trigger pour appeler la fonction update_updated_at avant chaque mise à jour de la table events
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'trg_update_updated_at_events') THEN
        CREATE TRIGGER trg_update_updated_at_events
        BEFORE UPDATE ON events
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at();
    END IF;
END $$;



-- Insertion des données initiales de manière idempotente
INSERT INTO users (username, email, password, role, score)
VALUES 
    ('admin', 'admin@esportify.com', 'admin', 'admin'),
    ('GoMAN', 'gogogo@gomail.gom', '123456', 'orga'),
    ('Gigi', 'gigilafleche@sportific.com', '123456', 'orga'),
    ('league_fan', 'lol@esportify.com', '123456', 'orga'),
    ('Mclaire', 'mclaire@edu.fr', '123456', 'orga'),
    ('testuser', 'esportifymailtest@yopmail.com', '123456', 'orga'),
    ('PlayerMan', 'player@yopmail.com', '123456', 'joueur')
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
    ('Petite partie d''échec ?', 'alléééééé !!!! rejoignez moi pour une 
    loooooogue parti d''échec, toute la journée, toute la  nuit, on refait 
    ça chaque semaine si vous voulez, venez nombreux ! J''essaye de faire 
    une description vraiment longue pour tester comment ça va rendre sur la page 
    dzjdzj jzdpzoj dz djzpodjz jdzpojdzpo dzjpd zdjzpojdzd zjjd zjdz dzopjd zpdjzodp 
    zdjzpo dpzojdz dzpjd zjdzpjdpzopjdzd zpood jzpodjzpjdzpoojdz djzpjdzpojdzpj
    zpjdpzojdpojzjd zopodjz poodjzo dzpoojdoz jdzjpojd zpojd zpojd zpodj zpojdzpojd 
    zpojdzpjdzjdjzpjdzpojdzpojd et dnj qjen sjjd qnnb ebbd bdbjs bdjsbd bjsbd ', 3, TRUE,
     '2024-11-15 09:00'::timestamp, '2024-12-20 12:00'::timestamp, 2),
    ('événement test', 'à accepter', 20, FALSE, 
     '2024-11-17 00:00'::timestamp, '2024-12-17 23:59'::timestamp, 6)
ON CONFLICT DO NOTHING;



