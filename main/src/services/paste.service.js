const Paste = require('../models');

const createPaste = async (pasteData) => {
    try {
        return await Paste.create(pasteData);
    } catch (error) {
        console.error('Create paste error:', error);
        throw new Error('Failed to create paste');
    }
};

const getPasteById = async (id) => {
    try {
        const paste = await Paste.getById(id);
        if (!paste) {
            throw new Error('Paste not found');
        }
        return paste;
    } catch (error) {
        console.error('Get paste by id error:', error);
        throw error;
    }
};

const getPublicPastes = async (page = 1) => {
    try {
        page = parseInt(page) || 1;
        if (page < 1) page = 1;
        
        return await Paste.getPublic(page, 6);
    } catch (error) {
        console.error('Get paste list error:', error);
        throw new Error('Failed to fetch pastes list');
    }
};

const getMonthlyStats = async (month) => {
    try {
        return await Paste.getMonthlyStats(month);
    } catch (error) {
        console.error('Get monthly stats error:', error);
        throw new Error('Failed to fetch monthly statistics');
    }
};

module.exports = {
    createPaste,
    getPasteById,
    getPublicPastes,
    getMonthlyStats
};