const express = require('express');
const router = express.Router();
const pasteController = require('../controllers/paste.controller');

router.get('/', pasteController.showCreateForm);

router.post('/paste', pasteController.createPaste);

router.get('/paste/:id', pasteController.getPaste);

router.get('/public', pasteController.getPublicPastes);

router.get('/stats/:month?', pasteController.getMonthlyStats);

module.exports = router; 