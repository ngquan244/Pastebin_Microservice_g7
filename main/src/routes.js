const express = require('express');
const router = express.Router();
const controller = require('./controller');

router.get('/', controller.showCreateForm);

router.post('/paste', controller.createPaste);

router.get('/paste/:id', controller.getPaste);

router.get('/paste_list', controller.getPublicPastes);

router.get('/stats/:month?', controller.getMonthlyStats);

module.exports = router; 