const express = require('express');
const router = express.Router();
const controller = require('./scheduler.controller');

router.get('/:depotId', controller.schedule);

module.exports = router;