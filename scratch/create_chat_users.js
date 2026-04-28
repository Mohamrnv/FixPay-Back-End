import mongoose from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import "dotenv/config";
import User from "../src/Models/User.model.js";

async function createTestAccounts() {
    try {
        console.log("Connecting to MongoDB...");
        await mongoose.connect(process.env.MONGODB_URI);
        
        console.log("Creating Test User & Test Worker...");

        // Hash a simple password
        const passwordHash = await bcrypt.hash("TestPass123!", 8);

        // Define dummy accounts
        const randomSuffixA = Math.floor(Math.random() * 10000);
        const randomSuffixB = Math.floor(Math.random() * 10000);

        const userA = {
            name: { first: "Chat", last: "User" },
            userName: "chat_user_" + randomSuffixA,
            email: `chat_user_${randomSuffixA}@test.com`,
            password: passwordHash,
            address: { government: "Cairo", city: "Nasr City", street: "Street 1" },
            ssn: "100" + Math.floor(Math.random() * 100000000000).toString().padStart(11, '0'),
            phoneNumber: "010" + Math.floor(Math.random() * 100000000).toString().padStart(8, '0'),
            role: "user",
            verifiedAt: new Date(), 
            gender: true
        };

        const userB = {
            name: { first: "Chat", last: "Worker" },
            userName: "chat_worker_" + randomSuffixB,
            email: `chat_worker_${randomSuffixB}@test.com`,
            password: passwordHash,
            address: { government: "Cairo", city: "Maadi", street: "Street 2" },
            ssn: "200" + Math.floor(Math.random() * 100000000000).toString().padStart(11, '0'),
            phoneNumber: "011" + Math.floor(Math.random() * 100000000).toString().padStart(8, '0'),
            role: "worker",
            verifiedAt: new Date(),
            gender: false
        };

        // Clear existing test accounts if any to avoid uniqueness errors
        await User.deleteMany({ email: { $in: [userA.email, userB.email] } });

        // Save
        const createdUser = await User.create(userA);
        const createdWorker = await User.create(userB);

        // Generate JWT Tokens
        const tokenUser = jwt.sign(
            { _id: createdUser._id, role: createdUser.role, email: createdUser.email },
            process.env.JWT_KEY,
            { expiresIn: "50h" } // Expiration must exist to satisfy some middlewares
        );

        const tokenWorker = jwt.sign(
            { _id: createdWorker._id, role: createdWorker.role, email: createdWorker.email },
            process.env.JWT_KEY,
            { expiresIn: "50h" }
        );

        console.log("\n✅ Test Accounts Generated Successfully!\n");
        
        console.log("==========================================");
        console.log("🧑‍💼 USER ACCOUNT details:");
        console.log("Email:", createdUser.email);
        console.log("ID:", createdUser._id.toString());
        console.log("\nUser Token (Paste this in Tab 1):\n" + tokenUser);
        console.log("==========================================\n");

        console.log("==========================================");
        console.log("👷 WORKER ACCOUNT details:");
        console.log("Email:", createdWorker.email);
        console.log("ID:", createdWorker._id.toString());
        console.log("\nWorker Token (Paste this in Tab 2):\n" + tokenWorker);
        console.log("==========================================\n");

        console.log("Next Steps:");
        console.log("1. Open scratch/socket_test.html in Tab 1 and Connect using the USER Token.");
        console.log("2. Open scratch/socket_test.html in Tab 2 and Connect using the WORKER Token.");
        console.log(`3. Use the WORKER ID (${createdWorker._id}) in Tab 1 to send a message to the worker!`);
        
    } catch (err) {
        console.error("Failed to create accounts:", err);
    } finally {
        await mongoose.disconnect();
    }
}

createTestAccounts();
