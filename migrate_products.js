const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from .env
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error("ERROR: MONGODB_URI is not defined in your .env file.");
    process.exit(1);
}

// Define Schema (Must match api/index.js)
const productSchema = new mongoose.Schema({
    id: { type: Number, unique: true },
    name: String,
    description: String,
    category: String,
    tags: [String],
    image_url: String,
    image_query: String,
    stock: { type: Number, default: 0 },
    price: { type: Number, default: 0 },
    unit: String,
    rating: { type: Number, default: 5.0 },
    reviews: { type: Number, default: 0 },
    created_at: { type: Date, default: Date.now }
});

const Product = mongoose.model('Product', productSchema);

async function migrate() {
    try {
        console.log("Connecting to MongoDB...");
        await mongoose.connect(MONGODB_URI);
        console.log("Connected successfully!");

        const dbPath = path.join(__dirname, 'database.json');
        if (!fs.existsSync(dbPath)) {
            console.error("ERROR: database.json not found in root.");
            process.exit(1);
        }

        const rawData = fs.readFileSync(dbPath, 'utf8');
        const dbJson = JSON.parse(rawData);
        const products = dbJson.products || [];

        console.log(`Found ${products.length} products in database.json.`);

        for (const p of products) {
            // Map JSON fields to MongoDB schema
            const productData = {
                id: p.id,
                name: p.name,
                category: p.category,
                image_url: p.img, // Mapping 'img' to 'image_url'
                price: p.price,
                stock: p.stock,
                unit: p.unit,
                rating: p.rating,
                reviews: p.reviews,
                tags: [] // Not in old JSON, but required by new schema logic
            };

            // Check if already exists
            const existing = await Product.findOne({ id: p.id });
            if (existing) {
                console.log(`- Skipping ${p.name} (Already exists)`);
            } else {
                await Product.create(productData);
                console.log(`+ Migrated: ${p.name}`);
            }
        }

        console.log("\nMigration completed successfully!");
        process.exit(0);

    } catch (err) {
        console.error("MIGRATION ERROR:", err);
        process.exit(1);
    }
}

migrate();
