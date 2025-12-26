import crypto from "node:crypto";
import dotenv from "dotenv";

dotenv.config();

const ENCRYPTION_KEY =
  process.env.ENCRYPTION_KEY || "default-32-character-key-change-me";
const ALGORITHM = "aes-256-cbc";

// Ensure the key is exactly 32 bytes
const getEncryptionKey = (): Buffer => {
  if (ENCRYPTION_KEY.length < 32) {
    // Pad with zeros if too short
    return Buffer.from(ENCRYPTION_KEY.padEnd(32, "0"));
  } else if (ENCRYPTION_KEY.length > 32) {
    // Truncate if too long
    return Buffer.from(ENCRYPTION_KEY.substring(0, 32));
  }
  return Buffer.from(ENCRYPTION_KEY);
};

export const encrypt = (text: string): string => {
  if (!text) return "";

  const key = getEncryptionKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");

  // Return IV + encrypted data
  return iv.toString("hex") + ":" + encrypted;
};

export const decrypt = (encryptedData: string): string => {
  if (!encryptedData) return "";

  try {
    const key = getEncryptionKey();
    const parts = encryptedData.split(":");

    if (parts.length !== 2) {
      throw new Error("Invalid encrypted data format");
    }

    const iv = Buffer.from(parts[0], "hex");
    const encrypted = parts[1];

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);

    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (error) {
    console.error("Decryption error:", error);
    throw new Error("Failed to decrypt data");
  }
};

export const hashPassword = async (password: string): Promise<string> => {
  const bcrypt = await import("bcryptjs");
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
};

export const comparePassword = async (
  password: string,
  hash: string
): Promise<boolean> => {
  const bcrypt = await import("bcryptjs");
  return bcrypt.compare(password, hash);
};
