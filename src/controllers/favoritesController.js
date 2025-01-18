const { pgClient } = require("../../config/dbConnection.js");

// Route pour ajouter ou retirer un favori
module.exports.toggleFavorite = async (req, res) => {
  const { event_id, user_id, isFavorited } = req.body;
  console.log("Requête reçue avec le body :", req.body);
  console.log("Headers :", req.headers);
console.log("Body :", req.body);
console.log("Query params :", req.query);
console.log("Raw body (si activé) :", req.rawBody);

  const authHeader = req.headers.authorization;
  try {

    // Fonction pour mettre à jour les favoris
    if (isFavorited) {
      // Ajouter un favori
      await pgClient.query(
        `INSERT INTO favorites (user_id, event_id) VALUES ($1, $2)
         ON CONFLICT (user_id, event_id) DO NOTHING`, // Empêche les doublons
        [user_id, event_id]
      );
    } else {
      // Supprimer un favori
      await pgClient.query(
        `DELETE FROM favorites WHERE user_id = $1 AND event_id = $2`,
        [user_id, event_id]
      );
    }
    console.log(`Favori mis à jour : user_id=${user_id}, event_id=${event_id}, isFavorited=${isFavorited}`);
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la base de données :', error);
    throw error;
  }

    // Génération du bouton mis à jour
    const buttonHtml = isFavorited
      ? `<button
           hx-post="https://esportify-backend.onrender.com/api/favorites"
           hx-target="#favorite-button"
           hx-vals='${JSON.stringify({
            event_id: event_id,
            user_id: user_id,
            isFavorited: false,
          })}'
          hx-headers='{"Content-Type": "application/json"}'
          hx-encoding="json"
           hx-swap="innerHTML"
           class="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
         >
           Plus intéressé
         </button>`
      : `<button
           hx-post="https://esportify-backend.onrender.com/api/favorites"
           hx-target="#favorite-button"
          hx-vals='${JSON.stringify({
            event_id: event_id,
            user_id: user_id,
            isFavorited: true,
          })}'
          hx-headers='{"Content-Type": "application/json"}'
          hx-encoding="json"
           hx-swap="innerHTML"
           class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
         >
           Je participe
         </button>`;

    res.send(buttonHtml);
};

module.exports.checkIfFavorites = async (req, res) => {
  const { event_id, user_id } = req.params;

  // Vérifie si le favori existe déjà
  const favorite = await pgClient.query(
    "SELECT * FROM favorites WHERE user_id = $1 AND event_id = $2",
    [user_id, event_id]
  );

  if (favorite.rowCount > 0) {
    // Si le favori existe, renvoyer le bouton "Plus intéressé"
    return res.send(`
        <button 
          hx-post="https://esportify-backend.onrender.com/api/favorites" 
          hx-target="#favorite-button"
          hx-vals='${JSON.stringify({
            event_id: id,
            user_id: userId,
            isFavorited: false,
          })}'
          hx-headers='{"Content-Type": "application/json"}'
          hx-encoding="json"
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
          hx-vals='${JSON.stringify({
            event_id: id,
            user_id: userId,
            isFavorited: true,
          })}'
          hx-headers='{"Content-Type": "application/json"}'
          hx-encoding="json"
          hx-on="htmx:beforeRequest: this.disabled = true"
          hx-on="htmx:afterRequest: this.disabled = false"
          class="px-4 py-2 bg-blue-500 rounded hover:bg-opacity-80"
        >
          Je participe
        </button>
      `);
  }
};