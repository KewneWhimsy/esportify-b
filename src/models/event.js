const { Client } = require('pg');

// Configuration de la connexion
const client = new Client({
  host: process.env.PG_HOST,
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
  database: process.env.PG_DATABASE,
  port: process.env.PG_PORT || 5432
});

// Connexion avec gestion des erreurs
client.connect((err) => {
  if (err) {
    console.error('Error connecting to PostgreSQL:', err);
  } else {
    console.log('Connected to PostgreSQL');
  }
});

// Créer un événement
const createEvent = async (eventData) => {
  const { title, description, players_count, start_datetime, end_datetime, user_pseudo } = eventData;

  const query = `
    INSERT INTO events (title, description, players_count, start_datetime, end_datetime, user_pseudo)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING id;
  `;

  const values = [title, description, players_count, start_datetime, end_datetime, user_pseudo];

  try {
    const res = await client.query(query, values);
    return res.rows[0].id; // Retourne l'ID de l'événement créé
  } catch (err) {
    console.error('Error creating event:', err);
    throw err;
  }
};

// Approuver un événement
const approveEvent = async (eventId) => {
  const query = `
    UPDATE events
    SET is_approved = TRUE, updated_at = NOW()
    WHERE id = $1
    RETURNING *;
  `;
  
  try {
    const res = await client.query(query, [eventId]);
    return res.rows[0]; // Retourne les détails de l'événement approuvé
  } catch (err) {
    console.error('Error approving event:', err);
    throw err;
  }
};

// Récupérer un événement par ID
const getEvent = async (eventId) => {
  const query = 'SELECT * FROM events WHERE id = $1';
  try {
    const res = await client.query(query, [eventId]);
    return res.rows[0]; // Retourne les détails d'un événement
  } catch (err) {
    console.error('Error getting event:', err);
    throw err;
  }
};

const updateEvent = async (eventId, updateData) => {
  const { title, description, players_count, start_datetime, end_datetime } = updateData;

  const query = `
    UPDATE events
    SET 
      title = COALESCE($1, title),
      description = COALESCE($2, description),
      players_count = COALESCE($3, players_count),
      start_datetime = COALESCE($4, start_datetime),
      end_datetime = COALESCE($5, end_datetime),
      updated_at = NOW()
    WHERE id = $6
    RETURNING *;
  `;

  const values = [title, description, players_count, start_datetime, end_datetime, eventId];

  try {
    const res = await client.query(query, values);
    if (res.rows.length === 0) {
      throw new Error(`Event with ID ${eventId} not found.`);
    }
    return res.rows[0]; // Retourne l'événement mis à jour
  } catch (err) {
    console.error('Error updating event:', err);
    throw err;
  }
};

const deleteEvent = async (eventId) => {
  const query = `
    DELETE FROM events
    WHERE id = $1
    RETURNING *;
  `;

  try {
    const res = await client.query(query, [eventId]);
    if (res.rows.length === 0) {
      throw new Error(`Event with ID ${eventId} not found.`);
    }
    return res.rows[0]; // Retourne l'événement supprimé pour vérification
  } catch (err) {
    console.error('Error deleting event:', err);
    throw err;
  }
};

module.exports = { createEvent, approveEvent, getEvent, updateEvent, deleteEvent };
