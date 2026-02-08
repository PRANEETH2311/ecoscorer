const express = require('express');
const router = express.Router();
const vehicleController = require('../controllers/vehicleController');
const auth = require('../middleware/auth');

router.post('/', auth, vehicleController.createVehicle);
router.get('/', auth, vehicleController.getVehicles);
router.get('/:id', auth, vehicleController.getVehicle);

module.exports = router;
