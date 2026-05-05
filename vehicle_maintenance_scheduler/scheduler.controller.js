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

    const result = optimizeSchedule(vehicles, depot.maxHours);

    res.json({
      depotId,
      maxHours: depot.maxHours,
      totalScore: result.totalScore,
      selectedTaskIds: result.selectedTaskIds,
      selectedVehicles: result.selectedVehicles.map((v) => ({
        taskId: v.taskId,
        duration: v.duration,
        impact: v.impact,
      })),
      depotHoursUsed: result.totalDuration,
      depotHoursAvailable: result.depotHoursAvailable,
      optimization: {
        vehiclesConsidered: vehicles.length,
        vehiclesSelected: result.selectedTaskIds.length,
        utilizationRate:
          ((result.totalDuration / result.depotHoursAvailable) * 100).toFixed(
            2,
          ) + "%",
      },
      source: depots.length > 2 ? "external API" : "fallback data"
    });

  } catch (err) {
    next(err);
  }
};