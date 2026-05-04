import mongoose from "mongoose";
import "dotenv/config";
import crypto from "crypto";

// Encryption defaults from src/Utils/Encrypt/crypt.js
const algorithm = "aes-256-cbc";
const key = Buffer.from(process.env.ENCRYPTION_KEY || "01234567890123456789012345678901", "utf8");
const iv = Buffer.from(process.env.ENCRYPTION_IV || "0123456789012345", "utf8");

const decrypt = (encryptedText) => {
    if (!encryptedText || typeof encryptedText !== 'string') return encryptedText;
    try {
        const decipher = crypto.createDecipheriv(algorithm, key, iv);
        let decrypted = decipher.update(encryptedText, "hex", "utf8");
        decrypted += decipher.final("utf8");
        return decrypted;
    } catch (error) {
        // If decryption fails, it might be already plain text
        return encryptedText;
    }
};

const MONGODB_URI = process.env.MONGODB_URI;

async function run() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log("Connected to MongoDB");

        // 1. Decrypt Users
        const users = await mongoose.connection.db.collection("Users").find({}).toArray();
        console.log(`Processing ${users.length} users...`);
        for (const user of users) {
            const updates = {};
            
            if (user.name) {
                if (user.name.first) updates["name.first"] = decrypt(user.name.first);
                if (user.name.last) updates["name.last"] = decrypt(user.name.last);
            }
            if (user.userName) updates.userName = decrypt(user.userName);
            if (user.dateOfBirth) updates.dateOfBirth = decrypt(user.dateOfBirth);
            if (user.email) updates.email = decrypt(user.email);
            if (user.ssn) updates.ssn = decrypt(user.ssn);
            if (user.phoneNumber) updates.phoneNumber = decrypt(user.phoneNumber);
            
            if (user.address) {
                if (user.address.government) updates["address.government"] = decrypt(user.address.government);
                if (user.address.city) updates["address.city"] = decrypt(user.address.city);
                if (user.address.street) updates["address.street"] = decrypt(user.address.street);
            }

            if (Object.keys(updates).length > 0) {
                await mongoose.connection.db.collection("Users").updateOne(
                    { _id: user._id },
                    { $set: updates }
                );
            }
        }
        console.log("Users decrypted.");

        // 2. Decrypt Tasks
        const tasks = await mongoose.connection.db.collection("tasks").find({}).toArray();
        console.log(`Processing ${tasks.length} tasks...`);
        for (const task of tasks) {
            const updates = {};
            if (task.title) updates.title = decrypt(task.title);
            if (task.description) updates.description = decrypt(task.description);
            if (task.location) updates.location = decrypt(task.location);

            if (Object.keys(updates).length > 0) {
                await mongoose.connection.db.collection("tasks").updateOne(
                    { _id: task._id },
                    { $set: updates }
                );
            }
        }
        console.log("Tasks decrypted.");

        // 3. Decrypt Offers
        const offers = await mongoose.connection.db.collection("offers").find({}).toArray();
        console.log(`Processing ${offers.length} offers...`);
        for (const offer of offers) {
            const updates = {};
            if (offer.message) updates.message = decrypt(offer.message);

            if (Object.keys(updates).length > 0) {
                await mongoose.connection.db.collection("offers").updateOne(
                    { _id: offer._id },
                    { $set: updates }
                );
            }
        }
        console.log("Offers decrypted.");

        console.log("Migration completed successfully.");
    } catch (err) {
        console.error("Migration failed:", err);
    } finally {
        await mongoose.disconnect();
    }
}

run();
