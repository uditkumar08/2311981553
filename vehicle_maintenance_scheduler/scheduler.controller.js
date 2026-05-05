const axios = require('axios');
const { optimizeSchedule } = require('./scheduler.service');

exports.schedule = async (req, res, next) => {
  try {
    const { depotId } = req.params;

    let depots = [];
    let vehicles = [];

    try {
      const depotRes = await axios.get(
        'http://20.207.122.201/evaluation-service/depots'
      );
      depots = depotRes.data.depots;

      const vehicleRes = await axios.get(
        'http://20.207.122.201/evaluation-service/vehicles'
      );
      vehicles = vehicleRes.data.vehicles;

    } catch (apiError) {
      console.log("External API failed, using fallback data");

    
      depots = [
        { id: 1, maxHours: 10 },
        { id: 2, maxHours: 15 }
      ];

      vehicles = [
        { taskId: "1", duration: 2, impact: 5 },
        { taskId: "2", duration: 4, impact: 10 },
        { taskId: "3", duration: 6, impact: 12 },
        { taskId: "4", duration: 3, impact: 7 }
      ];
    }

    const depot = depots.find(d => d.id == depotId);

    if (!depot) {
      return res.status(404).json({ message: 'Depot not found' });
    }

    const maxImpact = optimizeSchedule(vehicles, depot.maxHours);

    res.json({
      depotId,
      maxHours: depot.maxHours,
      maxImpact,
      source: depots.length > 2 ? "external API" : "fallback data"
    });

  } catch (err) {
    next(err);
  }
};