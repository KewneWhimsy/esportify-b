module.exports = {
    origin: ["http://localhost:4321", "https://kewnewhimsy.github.io", "https://w3.jkw.ovh", "https://w3chathub.app.dot.li", "http://localhost:3000"],
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "HX-Request",
      "HX-Trigger",
      "HX-Target",
      "HX-Trigger-Name",
      "HX-Current-URL",
    ],
    credentials: true,
  };
  