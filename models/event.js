const { Client } = require('pg');

const client = new Client({
  host: process.env.PG_HOST,
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
  database: process.env.PG_DATABASE,
  port: process.env.PG_PORT || 5432
});

client.connect();

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

module.exports = { createEvent, approveEvent, getEvent };
