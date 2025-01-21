//Renvoi un tableau contenant tout les événements à modérer
module.exports.moderateEvents = async (req, res) => {
    console.log("Admin : Requête reçue pour récupérer les événements à modérer");
    try {
      const sortField = req.query.sort || "start_datetime"; // Tri par défaut : date
      const validSortFields = ["players_count", "start_datetime", "organisateur"];
      const orderBy = validSortFields.includes(sortField)
        ? sortField
        : "start_datetime";
      const sortColumn =
        orderBy === "organisateur" ? "u.username" : `e.${orderBy}`;
  
      // Récupére les événements depuis PostgreSQL
      const result = await pgClient.query(`
        SELECT e.id, e.title, e.description, e.players_count, e.start_datetime, e.end_datetime, u.username AS organisateur
        FROM events e
        JOIN users u ON e.user_id = u.id
        WHERE e.is_approved = TRUE
        ORDER BY ${sortColumn} DESC
        LIMIT 10
      `);
  
      const events = result.rows; // Récupére les événements sous forme d'un tableau d'objets JavaScript
      let eventsHtml = "";
      // Génére du HTML pour chaque événement
      events.forEach((event) => {
        eventsHtml += `
          <div class="flex flex-col justify-between bg-[#26232A] border 
          border-[#E5E7EB] p-4 rounded-lg w-64 shadow-md hover:shadow-lg transition-transform hover:scale-105 cursor-pointer flex-shrink-0 gap-0.5" 
          @click="setTimeout(() => { isOpen = true }, 200)"
          hx-get="https://esportify-backend.onrender.com/api/event/${event.id}"
          hx-target="#popup-content"
          hx-swap="innerHTML"
          >
            <div>
              <h2 class="text-lg font-heading text-heading leading-tight mb-2">${
                event.title
              }</h2>
            </div>
            <div>
              <p class="text-sm text-gray-400">Joueurs : ${
                event.players_count
              }</p>
              <p class="text-sm">Début : ${new Date(
                event.start_datetime
              ).toLocaleString()}</p>
              <p class="text-sm">Fin : ${new Date(
                event.end_datetime
              ).toLocaleString()}</p>
            </div>
          </div>
        `;
      });
  
      // Renvoi le fragment HTML à HTMX
      console.log("Événements récupérés avec succès");
      res.send(eventsHtml);
    } catch (err) {
      console.error("Erreur dans getAllEvents :", err);
      res
        .status(500)
        .json({ error: "Erreur serveur lors de la récupération des événements" });
    }
  };