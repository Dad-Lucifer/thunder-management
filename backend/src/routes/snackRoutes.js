const express = require('express');
const router = express.Router();
const { getSnacks, addSnack, deductStock, deleteSnack, updateSnack } = require('../controllers/snackController');

router.get('/', getSnacks);
router.post('/', addSnack); // Handles adding stock / creating custom snack
router.post('/deduct', deductStock); // Handles deducting stock
router.put('/:id', updateSnack); // Handles manually editing snack
router.delete('/:id', deleteSnack);

module.exports = router;
