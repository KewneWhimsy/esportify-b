// Route pour ajouter ou retirer un favori
module.exports.toggleFavorite = async (req, res) => {
  const { eventId, userId } = req.body; // Récupère les données envoyées dans le body de la requête

  // Vérifie si le favori existe déjà
  const favorite = await pgClient.query(
    "SELECT * FROM favorites WHERE user_id = $1 AND event_id = $2",
    [userId, eventId]
  );

  if (favorite.rowCount > 0) {
    // Si le favori existe, on le supprime
    await pgClient.query(
      "DELETE FROM favorites WHERE user_id = $1 AND event_id = $2",
      [userId, eventId]
    );

    // Retourner un bouton pour "Je participe"
    return res.send(`
        <button 
          hx-post="https://esportify-backend.onrender.com/api/favorites" 
          hx-target="#favorite-button"
          hx-vals='{ "eventId": "${eventId}", "userId": "${userId}" }'
          hx-on="htmx:beforeRequest: this.disabled = true"
          hx-on="htmx:afterRequest: this.disabled = false"
          class="px-4 py-2 bg-blue-500 rounded hover:bg-opacity-80"
        >
          Je participe
        </button>
      `);
  } else {
    // Si le favori n'existe pas, on l'ajoute
    await pgClient.query(
      "INSERT INTO favorites (user_id, event_id) VALUES ($1, $2)",
      [userId, eventId]
    );

    // Retourner un bouton pour "Plus intéressé"
    return res.send(`
        <button 
          hx-post="https://esportify-backend.onrender.com/api/favorites" 
          hx-target="#favorite-button"
          hx-vals='{ "eventId": "${eventId}", "userId": "${userId}" }'
          hx-on="htmx:beforeRequest: this.disabled = true"
          hx-on="htmx:afterRequest: this.disabled = false"
          class="px-4 py-2 bg-blue-500 rounded hover:bg-opacity-80"
        >
          Plus intéressé
        </button>
      `);
  }
};

module.exports.checkIfFavorites = async (req, res) => {
  const { eventId, userId } = req.params;

  // Vérifie si le favori existe déjà
  const favorite = await pgClient.query(
    "SELECT * FROM favorites WHERE user_id = $1 AND event_id = $2",
    [userId, eventId]
  );

  if (favorite.rowCount > 0) {
    // Si le favori existe, renvoyer le bouton "Plus intéressé"
    return res.send(`
        <button 
          hx-post="https://esportify-backend.onrender.com/api/favorites" 
          hx-target="#favorite-button"
          hx-vals='{ "eventId": "${eventId}", "userId": "${userId}" }'
          hx-on="htmx:beforeRequest: this.disabled = true"
          hx-on="htmx:afterRequest: this.disabled = false"
          class="px-4 py-2 bg-blue-500 rounded hover:bg-opacity-80"
        >
          Plus intéressé
        </button>
      `);
  } else {
    // Si le favori n'existe pas, renvoyer le bouton "Je participe"
    return res.send(`
        <button 
          hx-post="https://esportify-backend.onrender.com/api/favorites" 
          hx-target="#favorite-button"
          hx-vals='{ "eventId": "${eventId}", "userId": "${userId}" }'
          hx-on="htmx:beforeRequest: this.disabled = true"
          hx-on="htmx:afterRequest: this.disabled = false"
          class="px-4 py-2 bg-blue-500 rounded hover:bg-opacity-80"
        >
          Je participe
        </button>
      `);
  }
};
