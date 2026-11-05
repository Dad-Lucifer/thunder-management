const { db, auth } = require('../config/firebase');
const bcrypt = require('bcryptjs');

/* ---------------------------------------
   REGISTER USER
--------------------------------------- */
const registerUser = async (req, res) => {
  try {
    const { uid, name, email, username, role } = req.body;

    /* -------- Validation -------- */
    if (!uid || !name || !email || !username || !role) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }

    const allowedRoles = ['employee', 'owner'];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    /* -------- Check Username Uniqueness -------- */
    const usernameSnapshot = await db
      .collection('users')
      .where('username', '==', username)
      .limit(1)
      .get();

    if (!usernameSnapshot.empty) {
      return res.status(400).json({ message: 'Username already taken' });
    }

    /* -------- Save Firestore Profile (UID as doc ID) -------- */
    await db.collection('users').doc(uid).set({
      name,
      email,
      username,
      role,
      createdAt: new Date().toISOString()
    });

    return res.status(201).json({
      message: 'User profile created successfully'
    });

  } catch (error) {
    console.error('Signup Error:', error);
    return res.status(500).json({ message: 'Server error during signup' });
  }
};


/* ---------------------------------------
   LOGIN USER
--------------------------------------- */
const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                message: 'Email and password are required'
            });
        }

        return res.status(200).json({
            message:
                'Use Firebase client SDK to sign in and send ID token to backend'
        });

    } catch (error) {
        console.error('Login Error:', error);
        return res.status(500).json({ message: 'Server error during login' });
    }
};


/* ---------------------------------------
   RESOLVE USERNAME TO EMAIL
   Supports:
   - Exact username (e.g. Sahil-123)
   - Case-insensitive username (e.g. sahil-123, sahil)
   - "admin" or "owner" alias
   - Direct email addresses
--------------------------------------- */
const resolveusername = async (req, res) => {
    try {
        const { username } = req.body;

        if (!username || typeof username !== 'string') {
            return res.status(400).json({ message: 'Username is required' });
        }

        const trimmed = username.trim();
        const lowerInput = trimmed.toLowerCase();

        // 1. If it's already an email, return directly or look up role
        if (trimmed.includes('@')) {
            const emailSnap = await db
                .collection('users')
                .where('email', '==', lowerInput)
                .limit(1)
                .get();

            if (!emailSnap.empty) {
                const u = emailSnap.docs[0].data();
                return res.status(200).json({ email: u.email, role: u.role });
            }
            // Allow direct email for Firebase Auth
            return res.status(200).json({ email: trimmed, role: 'owner' });
        }

        // 2. Exact match on username
        const snapshot = await db
            .collection('users')
            .where('username', '==', trimmed)
            .limit(1)
            .get();

        if (!snapshot.empty) {
            const userData = snapshot.docs[0].data();
            return res.status(200).json({
                email: userData.email,
                role: userData.role
            });
        }

        // 3. Case-insensitive search across all users & aliases
        const allUsersSnap = await db.collection('users').get();
        let matchedUser = null;
        let ownerUser = null;

        allUsersSnap.forEach(doc => {
            const u = doc.data();
            const uName = (u.username || '').toLowerCase();
            const uEmail = (u.email || '').toLowerCase();
            const uDisplayName = (u.name || '').toLowerCase();
            const uRole = (u.role || '').toLowerCase();

            if (uRole === 'owner') {
                ownerUser = u;
            }

            if (uName === lowerInput || uEmail === lowerInput || uDisplayName === lowerInput) {
                matchedUser = u;
            }
        });

        if (matchedUser) {
            return res.status(200).json({
                email: matchedUser.email,
                role: matchedUser.role
            });
        }

        // 4. Handle "admin" or "owner" alias
        if ((lowerInput === 'admin' || lowerInput === 'owner') && ownerUser) {
            return res.status(200).json({
                email: ownerUser.email,
                role: ownerUser.role
            });
        }

        return res.status(404).json({ message: 'User not found' });

    } catch (error) {
        console.error('Resolve Username Error:', error);
        return res.status(500).json({ message: 'Server error' });
    }
};

module.exports = { registerUser, loginUser, resolveusername };
