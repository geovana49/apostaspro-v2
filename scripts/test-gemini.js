
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import fs from 'fs';

// Load .env from project root
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = resolve(__dirname, '../.env');

if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
} else {
    console.error("No .env file found at " + envPath);
    process.exit(1);
}

const key = process.env.VITE_GEMINI_API_KEY;

if (!key) {
    console.error("VITE_GEMINI_API_KEY not found in .env");
    process.exit(1);
}

console.log("Testing API Key starting with: " + key.substring(0, 10) + "...");

async function listModels() {
    const genAI = new GoogleGenerativeAI(key);
    try {
        // We'll try to list models. Note: listModels is not directly exposed on genAI instance in some versions,
        // usually it's via a ModelManager or similar, but let's try a direct simple generation to a known stable model first
        // to see if the KEY is valid at all.

        // Actually, let's try to infer if we can get model list. 
        // The Node SDK usually exports a GoogleGenerativeAI class.
        // Let's rely on standard getting started pattern first: try gemini-1.5-flash.

        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        console.log("Attempting hello world with gemini-1.5-flash...");

        const result = await model.generateContent("Hello, are you working?");
        console.log("Success! Response: ", result.response.text());

    } catch (error) {
        console.error("Error with gemini-1.5-flash:", error.message);

        console.log("\nTrying gemini-pro...");
        try {
            const modelPro = genAI.getGenerativeModel({ model: "gemini-pro" });
            const resultPro = await modelPro.generateContent("Hello?");
            console.log("Success with gemini-pro! Response: ", resultPro.response.text());
        } catch (errPro) {
            console.error("Error with gemini-pro:", errPro.message);
        }
    }
}

listModels();
