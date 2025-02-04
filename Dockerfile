# Utilise l'image officielle de Node.js
FROM node:20

# Crée un dossier pour ton application
WORKDIR /app

# Copie les fichiers de package et installe les dépendances
COPY package*.json ./
RUN npm install

# Copie le reste du code de l’application
COPY . .

# Expose le port (par défaut pour Express et WebSocket)
EXPOSE 5000

# Commande pour démarrer l'application
CMD ["node", "index.js"]
