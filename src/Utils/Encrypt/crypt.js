import crypto from "crypto";
import "dotenv/config";

const algorithm = "aes-256-cbc";
const key = Buffer.from(process.env.ENCRYPTION_KEY || "01234567890123456789012345678901", "utf8"); // 32 bytes
const iv = Buffer.from(process.env.ENCRYPTION_IV || "0123456789012345", "utf8"); // 16 bytes

export const encrypt = (text) => {
    if (!text) return null;
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(String(text), "utf8", "hex");
    encrypted += cipher.final("hex");
    return encrypted;
};

export const decrypt = (encryptedText) => {
    if (!encryptedText) return null;
    try {
        const decipher = crypto.createDecipheriv(algorithm, key, iv);
        let decrypted = decipher.update(encryptedText, "hex", "utf8");
        decrypted += decipher.final("utf8");
        return decrypted;
    } catch (error) {
        // If decryption fails, it might be legacy plain text data.
        // Return original text so it doesn't "disappear" from the UI.
        return encryptedText;
    }
};
