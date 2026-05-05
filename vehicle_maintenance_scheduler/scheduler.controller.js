const axios = require('axios');
const { optimizeSchedule } = require('./scheduler.service');

exports.schedule = async (req, res, next) => {
  try {
    const { depotId } = req.params;

    const depotRes = await axios.get(
      'http://20.207.122.201/evaluation-service/depots'
    );

    const vehicleRes = await axios.get(
      'http://20.207.122.201/evaluation-service/vehicles'
    );

    const depot = depotRes.data.depots.find(
      (d) => d.id == depotId
    );

    if (!depot) {
      return res.status(404).json({ message: 'Depot not found' });
    }

    const maxHours = depot.maxHours;
    const tasks = vehicleRes.data.vehicles;

    const maxImpact = optimizeSchedule(tasks, maxHours);

    res.json({
      depotId,
      maxHours,
      maxImpact
    });

  } catch (err) {
    next(err);
  }
};