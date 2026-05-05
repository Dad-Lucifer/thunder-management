const { db, auth } = require('../config/firebase');

// Fetch all users
const getAllUsers = async (req, res) => {
    try {
        // Fetch caller to check permissions, but usually verified via middleware
        const callerDoc = await db.collection('users').doc(req.user.uid).get();
        if (!callerDoc.exists || callerDoc.data().role !== 'owner') {
            return res.status(403).json({ message: 'Forbidden. Owner access required.' });
        }

        const snapshot = await db.collection('users').orderBy('createdAt', 'desc').get();
        const users = snapshot.docs.map(doc => ({
            uid: doc.id,
            ...doc.data()
        }));

        res.status(200).json(users);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

// Create a new user
const createUser = async (req, res) => {
    try {
        let { name, email, username, password, role } = req.body;

        // Fallbacks since UI only passes username (User ID) and password
        if (!name) name = username;
        if (!email) email = `${username}@thundure.com`;

        const callerDoc = await db.collection('users').doc(req.user.uid).get();
        const callerData = callerDoc.data();
        if (!callerDoc.exists || callerData.role !== 'owner') {
            return res.status(403).json({ message: 'Forbidden. Owner access required.' });
        }

        if (callerData.username !== 'Sahil-123') {
            return res.status(403).json({ message: 'Forbidden. Only Main Admin (Sahil-123) can add new team members.' });
        }

        if (!username || !password || !role) {
            return res.status(400).json({ message: 'ID, Password, and Role are required' });
        }

        // Check Username Uniqueness
        const usernameSnapshot = await db.collection('users').where('username', '==', username).limit(1).get();
        if (!usernameSnapshot.empty) {
            return res.status(400).json({ message: 'Username already taken' });
        }

        // Create user in Firebase Auth
        const userRecord = await auth.createUser({
            email,
            password,
            displayName: name,
        });

        // Create user in Firestore
        await db.collection('users').doc(userRecord.uid).set({
            name,
            email,
            username,
            role,
            createdAt: new Date().toISOString()
        });

        res.status(201).json({ message: 'User created successfully', uid: userRecord.uid });
    } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({ message: error.message || 'Internal Server Error' });
    }
};

// Update user role
const updateUserRole = async (req, res) => {
    try {
        const { uid } = req.params;
        const { role } = req.body;

        const callerDoc = await db.collection('users').doc(req.user.uid).get();
        const callerData = callerDoc.data();
        if (!callerDoc.exists || callerData.role !== 'owner') {
            return res.status(403).json({ message: 'Forbidden. Owner access required.' });
        }

        if (callerData.username !== 'Sahil-123') {
            return res.status(403).json({ message: 'Forbidden. Only Main Admin (Sahil-123) can modify team roles.' });
        }

        if (!role || !['employee', 'owner', 'revoked'].includes(role)) {
            return res.status(400).json({ message: 'Invalid role provided' });
        }

        // Check target user
        const targetDocRef = db.collection('users').doc(uid);
        const targetDoc = await targetDocRef.get();

        if (!targetDoc.exists) {
            return res.status(404).json({ message: 'Target user not found' });
        }

        const targetData = targetDoc.data();

        // Main admin protection: prevent Sahil-123 from revoking their own permissions
        if (targetData.username === 'Sahil-123' && role !== 'owner') {
            return res.status(403).json({ message: 'Main Admin (Sahil-123) cannot be demoted.' });
        }

        await targetDocRef.update({ role });

        res.status(200).json({ message: `User role updated to ${role}` });
    } catch (error) {
        console.error('Error updating user role:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

// Delete a user
const deleteUser = async (req, res) => {
    try {
        const { uid } = req.params;

        const callerDoc = await db.collection('users').doc(req.user.uid).get();
        const callerData = callerDoc.data();
        if (!callerDoc.exists || callerData.role !== 'owner') {
            return res.status(403).json({ message: 'Forbidden. Owner access required.' });
        }

        if (callerData.username !== 'Sahil-123') {
            return res.status(403).json({ message: 'Forbidden. Only Main Admin (Sahil-123) can delete team members.' });
        }

        const targetDocRef = db.collection('users').doc(uid);
        const targetDoc = await targetDocRef.get();

        if (!targetDoc.exists) {
            return res.status(404).json({ message: 'Target user not found' });
        }

        const targetData = targetDoc.data();

        // Prevent deleting the main admin
        if (targetData.username === 'Sahil-123') {
            return res.status(403).json({ message: 'Main Admin (Sahil-123) cannot be deleted.' });
        }

        // Delete from Firebase Auth (ignore if not found)
        try {
            await auth.deleteUser(uid);
        } catch (authErr) {
            console.warn(`User ${uid} not found in Firebase Auth, proceeding to delete from Firestore.`);
        }

        // Delete from Firestore
        await targetDocRef.delete();

        res.status(200).json({ message: 'User deleted successfully' });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

module.exports = {
    getAllUsers,
    createUser,
    updateUserRole,
    deleteUser
};
