const express = require('express');
const router = express.Router();
const {
    startBattle,
    getActiveBattles,
    updateScore,
    finishBattle,
    getCompletedBattles
} = require('../controllers/battleController');

router.post('/start', startBattle);
router.get('/active', getActiveBattles);
router.get('/completed', getCompletedBattles);
router.post('/score/:id', updateScore);
router.post('/finish/:id', finishBattle);

module.exports = router;

