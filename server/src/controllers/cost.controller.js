const Cost = require('../models/cost');

// @desc    Add a new cost
// @route   POST /api/admin/cost
// @access  Private/Admin
exports.addCost = async (req, res) => {
    try {
        const { title, amount, category, description, date } = req.body;

        // Validation
        if (!title || !amount || !category) {
            return res.status(400).json({ 
                success: false, 
                message: 'Please provide title, amount, and category' 
            });
        }

        const cost = await Cost.create({
            title,
            amount: parseFloat(amount), // Ensure it's stored as a number (double)
            category,
            description,
            date: date || Date.now(),
            createdBy: req.user.id
        });

        res.status(201).json({
            success: true,
            data: cost
        });

    } catch (error) {
        console.error('Add Cost Error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server Error', 
            error: error.message 
        });
    }
};

// @desc    Get all costs
// @route   GET /api/admin/cost
// @access  Private/Admin
exports.getCosts = async (req, res) => {
    try {
        const costs = await Cost.find().sort({ date: -1 });

        res.status(200).json({
            success: true,
            count: costs.length,
            data: costs
        });

    } catch (error) {
        console.error('Get Costs Error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server Error', 
            error: error.message 
        });
    }
};
