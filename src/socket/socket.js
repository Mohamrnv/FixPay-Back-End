import { Server } from "socket.io";
import jwt from "jsonwebtoken";

let io;
const usersSocketMap = new Map(); // Maps userId to socketId

export const initSocket = (server) => {
    io = new Server(server, {
        cors: {
            origin: "*", // Keep identical to your app's cors policy
            methods: ["GET", "POST"]
        }
    });

    // Middleware to authenticate socket connections
    io.use((socket, next) => {
        try {
            const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];
            if (!token) {
                return next(new Error("Authentication error: No token provided"));
            }

            const decoded = jwt.verify(token, process.env.JWT_KEY);
            socket.user = decoded; // { id, role, email, etc. }
            next();
        } catch (error) {
            next(new Error("Authentication error: Invalid token"));
        }
    });

    io.on("connection", (socket) => {
        const userId = socket.user.userId || socket.user._id;
        console.log(`User connected: ${userId} with socket ID: ${socket.id}`);

        usersSocketMap.set(userId.toString(), socket.id);

        // Real-time location tracking from worker to task owner
        socket.on("updateLocation", (data) => {
            // data should include: { taskId, customerId, lat, lng }
            const { taskId, customerId, lat, lng } = data;
            if (customerId) {
                const customerSocketId = usersSocketMap.get(customerId.toString());
                if (customerSocketId) {
                    io.to(customerSocketId).emit("locationUpdated", {
                        taskId,
                        workerId: userId,
                        lat,
                        lng
                    });
                }
            }
        });

        socket.on("disconnect", () => {
            console.log(`User disconnected: ${userId}`);
            usersSocketMap.delete(userId.toString());
        });
    });

    return io;
};

export const getIO = () => {
    if (!io) {
        throw new Error("Socket.io is not initialized!");
    }
    return io;
};

export const getSocketId = (userId) => {
    return usersSocketMap.get(userId.toString());
};
