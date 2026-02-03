const { db } = require('../config/firebase');

// Start a new Battle
exports.startBattle = async (req, res) => {
    try {
        if (!db) {
            console.error('❌ Firestore not initialized');
            return res.status(500).json({ message: 'Database not configured' });
        }

        const { crownHolder, challenger } = req.body;

        if (!crownHolder || !challenger) {
            return res.status(400).json({ message: 'Both players are required' });
        }

        const battleData = {
            crownHolder: { ...crownHolder, score: 0 },
            challenger: { ...challenger, score: 0 },
            startTime: new Date().toISOString(),
            status: 'active',
            createdAt: new Date().toISOString()
        };

        const docRef = await db.collection('battles').add(battleData);

        console.log('✅ Battle created:', docRef.id);
        res.status(201).json({ id: docRef.id, ...battleData });

    } catch (error) {
        console.error('❌ Error starting battle:', error);
        res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
};

// Get Active Battles
exports.getActiveBattles = async (req, res) => {
    try {
        if (!db) {
            console.error('❌ Firestore not initialized');
            return res.status(500).json({ message: 'Database not configured' });
        }

        const snapshot = await db.collection('battles')
            .where('status', '==', 'active')
            .get();

        const battles = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        // Sort in memory instead of in Firestore to avoid index requirement
        battles.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        console.log(`📊 Fetched ${battles.length} active battles`);
        res.status(200).json(battles);
    } catch (error) {
        console.error('❌ Error fetching battles:', error);
        res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
};

// Update Scores
exports.updateScore = async (req, res) => {
    try {
        const { id } = req.params;
        const { player } = req.body; // 'crownHolder' or 'challenger'

        if (!['crownHolder', 'challenger'].includes(player)) {
            return res.status(400).json({ message: 'Invalid player type' });
        }

        const battleRef = db.collection('battles').doc(id);
        const doc = await battleRef.get();

        if (!doc.exists) {
            return res.status(404).json({ message: 'Battle not found' });
        }

        const battle = doc.data();
        const currentScore = battle[player].score || 0;

        // atomic increment not strictly necessary for this scale, but good practice. 
        // using simple update for now to avoid field path complexities if structured data is weird.
        // Actually, let's just read-modify-write for simplicity in this prototyping phase.

        await battleRef.update({
            [`${player}.score`]: currentScore + 1
        });

        res.status(200).json({ message: 'Score updated' });

    } catch (error) {
        console.error('Error updating score:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

// Finish Battle
exports.finishBattle = async (req, res) => {
    try {
        const { id } = req.params;

        await db.collection('battles').doc(id).update({
            status: 'completed',
            endTime: new Date().toISOString()
        });

        res.status(200).json({ message: 'Battle finished' });
    } catch (error) {
        console.error('Error finishing battle:', error);
        res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
};

// Get Completed Battles (for leaderboard)
exports.getCompletedBattles = async (req, res) => {
    try {
        if (!db) {
            console.error('❌ Firestore not initialized');
            return res.status(500).json({ message: 'Database not configured' });
        }

        const snapshot = await db.collection('battles')
            .where('status', '==', 'completed')
            .get();

        const battles = snapshot.docs.map(doc => {
            const data = doc.data();

            // Determine winner
            let winner = 'tie';
            if (data.crownHolder.score > data.challenger.score) {
                winner = 'crownHolder';
            } else if (data.challenger.score > data.crownHolder.score) {
                winner = 'challenger';
            }

            return {
                id: doc.id,
                ...data,
                winner
            };
        });

        // Sort by end time (most recent first)
        battles.sort((a, b) => new Date(b.endTime) - new Date(a.endTime));

        console.log(`📊 Fetched ${battles.length} completed battles`);
        res.status(200).json(battles);
    } catch (error) {
        console.error('❌ Error fetching completed battles:', error);
        res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
};
