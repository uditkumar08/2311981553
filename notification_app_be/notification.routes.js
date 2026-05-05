const express = require('express');
const router = express.Router();
const controller = require('./notification.controller');

router.post('/', controller.create);
router.get('/', controller.getAll);
router.patch('/:id', controller.markRead);

module.exports = router;