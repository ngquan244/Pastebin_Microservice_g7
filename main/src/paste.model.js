const db = require('./database');
const { nanoid } = require('nanoid');

class Paste {
    static async create({ content, title, language, expiresIn, visibility }) {
        let id;
        let isUnique = false;
        let attempts = 0;
        const maxAttempts = 5; // Prevent infinite loop

        while (!isUnique && attempts < maxAttempts) {
            id = nanoid(8);
            const [existing] = await db.query('SELECT id FROM paste WHERE id = ?', [id]);
            if (existing.length === 0) {
                isUnique = true;
            } else {
                attempts++;
            }
        }

        if (!isUnique) {
            throw new Error('Failed to generate unique ID after multiple attempts');
        }

        let expiresAt = null;
        if (expiresIn && !isNaN(expiresIn)) {
            expiresAt = new Date(Date.now() + expiresIn * 60 * 1000);
        }

        await db.query(
            'INSERT INTO paste (id, content, title, language, expires_at, visibility) VALUES (?, ?, ?, ?, ?, ?)',
            [id, content, title || 'Untitled', language || 'text', expiresAt, visibility || 'PUBLIC']
        );

        return { id };
    }

    static async getById(id) {
        // Get the paste
        const [pastes] = await db.query(
            'SELECT id, content, title, language, created_at, expires_at, views, visibility FROM paste WHERE id = ?',
            [id]
        );

        if (pastes.length === 0 || pastes[0].expires_at && new Date(pastes[0].expires_at) <= new Date()) {
            return { status: 'not_found' };
        }

        // Increment views for active paste
        await db.query('UPDATE paste SET views = views + 1 WHERE id = ?', [id]);

        return { status: 'active', paste: pastes[0] };
    }

    static async getPublic(page = 1, limit = 5) {
        const offset = (page - 1) * limit;

        const [pastes] = await db.query(
            'SELECT id, title, language, created_at FROM paste WHERE visibility = ? AND (expires_at IS NULL OR expires_at > NOW()) ORDER BY created_at DESC LIMIT ? OFFSET ?',
            ['public', limit, offset]
        );

        // Get total count for pagination
        const [countResult] = await db.query(
            'SELECT COUNT(*) as total FROM paste WHERE visibility = ? AND (expires_at IS NULL OR expires_at > NOW())',
            ['public']
        );

        const totalPastes = countResult[0].total;
        const totalPages = Math.ceil(totalPastes / limit);

        return {
            pastes: pastes,
            pagination: {
                page,
                limit,
                totalPastes,
                totalPages
            }
        };
    }

    static async getMonthlyStats(month) {
        const [stats] = await db.query(`
            SELECT 
                COUNT(*) as totalPastes,
                COALESCE(SUM(views), 0) as totalViews,
                COALESCE(ROUND(AVG(views)), 0) as avgViewsPerPaste,
                COALESCE(MIN(views), 0) as minViews,
                COALESCE(MAX(views), 0) as maxViews,
                COALESCE(SUM(CASE WHEN expires_at IS NULL OR expires_at > NOW() THEN 1 ELSE 0 END), 0) AS activePastes,
                COALESCE(SUM(CASE WHEN expires_at IS NOT NULL AND expires_at <= NOW() THEN 1 ELSE 0 END), 0) AS expiredPastes
            FROM paste 
            WHERE DATE_FORMAT(created_at, '%Y-%m') = ?
        `, [month]);

        return { month, ...stats[0] };
    }
}

module.exports = Paste;