const mongoose = require('mongoose');
const dotenv = require('dotenv');

const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const connectDB = async () => {
    try {
        if (!process.env.MONGO_URI) {
            throw new Error('MONGO_URI is not defined in environment variables');
        }
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB Connected');
    } catch (error) {
        console.error('MongoDB Connection Error:', error);
        process.exit(1);
    }
};

module.exports = connectDB;
