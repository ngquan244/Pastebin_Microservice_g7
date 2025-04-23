const requires = require('./requires_path');


const createPaste = async (req, res) => {
    try {
        const { content, title = '',
              expires_in,
                privacy = 'public' 
            } = req.body;

        if (!content?.trim()) {
            return res.status(400).render('create_paste', { error: 'Content is required' });
        }

        const result = await requires.pasteService.createPaste({
            content: content.trim(),
            title: title.trim(),
            expiresIn: expires_in,
            privacy
        });

        return res.redirect(302, `/paste/${result.id}`);
    } catch (error) {
        console.error('Error creating paste:', error);
        return res.status(500).render('create_paste', {
            error: 'Server error. Please try again later.'
        });
    }
};

const getPaste = async (req, res) => {
    const { id: pasteId } = req.params;
    
    try {
        const { status, paste } = await requires.pasteService.getPasteById(pasteId);

        if (status === 'not_found') {
            return res.status(404).render('create_paste', {
                error: `No paste found with ID: ${pasteId}`,
                pasteId
            });
        }

        return res.status(200).render('paste_detail', { paste, error: null });

    } catch (err) {
        const errorMessage = `Unable to load paste due to: ${err.message}`;
        console.error(`Error fetching paste ID ${pasteId}:`, err.message);

        return res.status(500).render('create_paste', {
            error: errorMessage,
            pasteId
        });
    }
};


const getPublicPastes = async (req, res) => {
    const page = parseInt(req.query.page, 10) || 1;
    if (page < 1) {
        return res.status(400).render('paste_list', {
            pastes: [],
            error: 'Invalid page number',
            page: 1
        });
    }

    try {
        const result = await requires.pasteService.getPublicPastes(page);
        res.status(200).render('paste_list', {
            pastes: result.pastes,
            pastes: result.pastes,
            pagination: result.pagination,
            error: null
        });
    } catch (error) {
        const errorMessage = `Error fetching paste list page ${page}: ${error.message}`;
        console.error(errorMessage);
        res.status(500).render('paste_list', {
            pastes: [],
            error: errorMessage,
            page: page
        });
    }
};

const showCreateForm = (req, res) => {
    const viewName = 'create_paste';

    const renderForm = (error) =>
        res.status(error ? 500 : 200).render(viewName, { error });

    try {
        renderForm(null);
    } catch (err) {
        console.warn(`Unable to render view "${viewName}":`, err);
        renderForm(err.message);
    }
};

const getMonthlyStats = async (req, res) => {
    try {
        let { month } = req.params;
        if (!month) {
            const now = new Date();
            const year = now.getFullYear();
            const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
            month = `${year}-${currentMonth}`;
        }
        const isValidFormat = /^\d{4}-(0[1-9]|1[0-2])$/.test(month);
        if (!isValidFormat) {
            return res.status(400).render('monthly_stats', {
                stats: null,
                error: 'Invalid month format. Use YYYY-MM (e.g., 2025-04)',
                month
            });
        }
        const stats = await requires.pasteService.getMonthlyStats(month);
        res.status(200).render('monthly_stats', {
            stats,
            error: null,
            month
        });
    } catch (error) {
        console.error(`Error fetching stats for month ${req.params.month || 'N/A'}:`, error.message);
        res.status(500).render('monthly_stats', {
            stats: null,
            error: error.message || 'Failed',
            month: req.params.month || null
        });
    }
};


module.exports = {
    createPaste,
    getPaste,
    getPublicPastes,
    showCreateForm,
    getMonthlyStats
};