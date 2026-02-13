const express = require('express');
const router = express.Router();
const {
    addSubscription,
    getSubscriptions,
    deleteSubscription,
    addSalary,
    getSalaries,
    deleteSalary
} = require('../controllers/managementController');

// Subscriptions
router.post('/subscriptions', addSubscription);
router.get('/subscriptions', getSubscriptions);
router.delete('/subscriptions/:id', deleteSubscription);

// Salaries
router.post('/salaries', addSalary);
router.get('/salaries', getSalaries);
router.delete('/salaries/:id', deleteSalary);

module.exports = router;
