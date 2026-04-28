import app from './app.js';
import dbConnection from './DB/db.connection.js';
import "dotenv/config";
import http from "http";
import { initSocket } from "./socket/socket.js";

const port = process.env.PORT || 3000;

dbConnection();

const server = http.createServer(app);
initSocket(server);

server.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
    console.log(`Socket.io is also listening for events.`);
});