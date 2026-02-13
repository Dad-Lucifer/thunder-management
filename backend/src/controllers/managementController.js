const { db } = require('../config/firebase');

/**
 * ➕ Add Owner Subscription (Expense)
 */
const addSubscription = async (req, res) => {
    try {
        const { type, provider, cost, startDate, expiryDate } = req.body;

        if (!type || !cost || !startDate || !expiryDate) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        const sub = {
            type,
            provider: provider || '',
            cost: Number(cost),
            startDate,
            expiryDate,
            createdAt: new Date().toISOString(),
            status: 'active' // Initial status, logic will handle "expired" on fetch/display
        };

        const ref = await db.collection('owner_subscriptions').add(sub);

        res.status(201).json({ id: ref.id, ...sub });
    } catch (err) {
        console.error('Error adding subscription:', err);
        res.status(500).json({ message: 'Failed to add subscription' });
    }
};

/**
 * 📥 Get Owner Subscriptions
 */
const getSubscriptions = async (req, res) => {
    try {
        const snapshot = await db.collection('owner_subscriptions')
            .orderBy('expiryDate', 'asc')
            .get();

        const subscriptions = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        res.json(subscriptions);
    } catch (err) {
        console.error('Error fetching subscriptions:', err);
        res.status(500).json({ message: 'Failed to fetch subscriptions' });
    }
};

/**
 * 🗑️ Delete Owner Subscription
 */
const deleteSubscription = async (req, res) => {
    try {
        const { id } = req.params;
        await db.collection('owner_subscriptions').doc(id).delete();
        res.json({ message: 'Deleted successfully' });
    } catch (err) {
        console.error('Error deleting subscription:', err);
        res.status(500).json({ message: 'Failed to delete' });
    }
};

/**
 * ➕ Add Salary Record
 */
const addSalary = async (req, res) => {
    try {
        const { employeeName, amount, paymentDate, notes } = req.body;

        if (!employeeName || !amount || !paymentDate) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        const salary = {
            employeeName,
            amount: Number(amount),
            paymentDate,
            notes: notes || '',
            createdAt: new Date().toISOString()
        };

        const ref = await db.collection('owner_salaries').add(salary);

        res.status(201).json({ id: ref.id, ...salary });
    } catch (err) {
        console.error('Error adding salary:', err);
        res.status(500).json({ message: 'Failed to add salary' });
    }
};

/**
 * 📥 Get Salary History
 */
const getSalaries = async (req, res) => {
    try {
        const snapshot = await db.collection('owner_salaries')
            .orderBy('paymentDate', 'desc')
            .get();

        const salaries = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        res.json(salaries);
    } catch (err) {
        console.error('Error fetching salaries:', err);
        res.status(500).json({ message: 'Failed to fetch salaries' });
    }
};

/**
 * 🗑️ Delete Salary Record
 */
const deleteSalary = async (req, res) => {
    try {
        const { id } = req.params;
        await db.collection('owner_salaries').doc(id).delete();
        res.json({ message: 'Deleted successfully' });
    } catch (err) {
        console.error('Error deleting salary:', err);
        res.status(500).json({ message: 'Failed to delete' });
    }
};

module.exports = {
    addSubscription,
    getSubscriptions,
    deleteSubscription,
    addSalary,
    getSalaries,
    deleteSalary
};
