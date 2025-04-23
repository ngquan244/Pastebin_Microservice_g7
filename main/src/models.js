const db = require('./db');
const { nanoid } = require('nanoid');

class Paste {
    static async create({ content, title = 'Untitled', expiresIn, privacy = 'PUBLIC' }) {
        const maxRetries = 10;
        let id, existingRecord;
        let attempts = 0;
    
        do {
            if (attempts >= maxRetries) {
                throw new Error('Failed to generate unique ID');
            }
            id = nanoid(8);
            [existingRecord] = await db.query('SELECT id FROM paste WHERE id = ?', [id]);
            attempts++;
        } while (existingRecord.length > 0);
    
        const expirationTime = (expiresIn && !isNaN(expiresIn))
            ? new Date(Date.now() + expiresIn * 60 * 1000)
            : null;
            
            await db.query(
                'INSERT INTO paste SET ?',
                {
                    id: id,
                    content: content,
                    title: title || 'Untitled',
                    expires_at: expirationTime,
                    privacy: privacy || 'PUBLIC'
                }
            );
    
        return { id };
    }

    static async getById(id) {
        try {
            const paste = await this.getPasteData(id);
    
            if (!paste) {
                return { status: 'not_found' };
            }
    
            if (paste.expires_at && new Date(paste.expires_at) <= new Date()) {
                return { status: 'not_found' };
            }
    
            await this.incrementViews(id);
    
            return { status: 'active', paste };
        } catch (error) {
            console.error('Error fetching paste by ID:', error);
            return { status: 'error', message: 'Something went wrong' };
        }
    }
    static async getPasteData(id) {
        const query = 'SELECT id, content, title, created_at, expires_at, views, privacy FROM paste WHERE id = ?';
        const [result] = await db.query(query, [id]);
        return result ? result[0] : null;
    }
    
    static async incrementViews(id) {
        const updateQuery = 'UPDATE paste SET views = views + 1 WHERE id = ?';
        await db.query(updateQuery, [id]);
    }
    
    static async getPublic(page = 1, limit = 6) {
        const offset = (page - 1) * limit;

        const [pastes] = await db.query(
            'SELECT id, title, created_at FROM paste WHERE privacy = ? AND (expires_at IS NULL OR expires_at > NOW()) ORDER BY created_at DESC LIMIT ? OFFSET ?',
            ['public', limit, offset]
        );

        const [countResult] = await db.query(
            'SELECT COUNT(*) as total FROM paste WHERE privacy = ? AND (expires_at IS NULL OR expires_at > NOW())',
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