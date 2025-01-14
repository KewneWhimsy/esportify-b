const pgClient = require("../config/pgClient"); // Assurez-vous que votre client PostgreSQL est correctement configuré

module.exports.getAllEvents = async (req, res) => {
  try {
    const sortField = req.query.sort || "start_datetime";
    const validSortFields = ["players_count", "start_datetime", "organisateur"];
    const orderBy = validSortFields.includes(sortField) ? sortField : "start_datetime";
    const sortColumn = orderBy === "organisateur" ? "u.username" : `e.${orderBy}`;

    const result = await pgClient.query(`
      SELECT e.id, e.title, e.description, e.players_count, e.start_datetime, e.end_datetime, u.username AS organisateur
      FROM events e
      JOIN users u ON e.user_id = u.id
      WHERE e.is_approved = TRUE
      ORDER BY ${sortColumn} ASC
      LIMIT 10
    `);

    const events = result.rows;
    let eventsHtml = "";
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
            <h2 class="text-lg font-heading text-heading leading-tight mb-2">${event.title}</h2>
          </div>
          <div>
            <p class="text-sm text-gray-400">Joueurs : ${event.players_count}</p>
            <p class="text-sm">Début : ${new Date(event.start_datetime).toLocaleString()}</p>
            <p class="text-sm">Fin : ${new Date(event.end_datetime).toLocaleString()}</p>
          </div>
        </div>
      `;
    });

    res.send(eventsHtml);
  } catch (err) {
    console.error("Erreur lors de la récupération des événements", err);
    res.status(500).json({ error: "Erreur lors de la récupération des événements" });
  }
};

module.exports.getEventById = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pgClient.query(
      `
      SELECT e.id, e.title, e.description, e.players_count, e.start_datetime, e.end_datetime, u.username AS organisateur
      FROM events e
      JOIN users u ON e.user_id = u.id
      WHERE e.id = $1
    `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).send("<p>Événement non trouvé</p>");
    }

    const event = result.rows[0];

    res.send(`
      <div class="bg-[#26232A] border border-[#E5E7EB] p-6 rounded-lg shadow-lg h-full w-full">
        <h2 class="text-2xl font-bold mb-4">${event.title}</h2>
        <p>${event.description}</p>
        <p><strong>Joueurs :</strong> ${event.players_count}</p>
        <p><strong>Organisateur :</strong> ${event.organisateur}</p>
        <p><strong>Début :</strong> ${new Date(event.start_datetime).toLocaleString()}</p>
        <p><strong>Fin :</strong> ${new Date(event.end_datetime).toLocaleString()}</p>
      </div>
    `);
  } catch (err) {
    console.error("Erreur lors de la récupération des détails de l'événement", err);
    res.status(500).json({ error: "Erreur lors de la récupération des détails de l'événement" });
  }
};

module.exports.createEvent = async (req, res) => {
  const { title, description, players_count, start_datetime, end_datetime } = req.body;
  const userId = req.user.userId;

  await pgClient.query(
    "INSERT INTO events (title, description, players_count, start_datetime, end_datetime, user_id) VALUES ($1, $2, $3, $4, $5, $6)",
    [title, description, players_count, start_datetime, end_datetime, userId]
  );

  res.json({ message: "Événement créé avec succès, en attente de validation" });
};