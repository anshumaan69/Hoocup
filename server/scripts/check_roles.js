const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('../src/models/user');

const checkRoles = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB');

        const targetEmail = 'nazeefahmad555@gmail.com';
        const user = await User.findOne({ email: targetEmail });
        
        if (user) {
            console.log('\n--- TARGET USER ---');
            console.log('ID:', user._id);
            console.log('Email:', user.email);
            console.log('Role:', `'${user.role}'`); // Quote to see whitespace
            console.log('Status:', user.status);
            console.log('DeletedAt:', user.deletedAt);
            console.log('Is Admin Role correct?:', user.role === 'admin');
        } else {
            console.log('\nUser not found:', targetEmail);
        }

        // Also check Anshumaan for comparison
        const compEmail = 'anshumaan.1611@gmail.com';
        const compUser = await User.findOne({ email: compEmail });
        if (compUser) {
             console.log('\n--- COMPARISON USER ---');
             console.log('Role:', `'${compUser.role}'`);
        }

        process.exit();
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

checkRoles();
