const { solveKnapsackScheduling } = require('../vehicle_maintenance_scheduler/scheduler.service');

function scheduleVehiclesHandler(req, res) {
  try {
    const { depot_hours, vehicles } = req.body;

    if (!depot_hours || !vehicles) {
      return res.status(400).json({
        error: "Missing required fields: depot_hours and vehicles",
      });
    }

    const result = solveKnapsackScheduling(depot_hours, vehicles);

    if (!result.success) {
      return res.status(400).json({
        error: result.error,
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        totalScore: result.totalScore,
        taskIds: result.selectedTaskIds,
        vehicles: result.selectedVehicles.map((v) => ({
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
      },
    });
  } catch (error) {
    return res.status(500).json({
      error: "Internal server error: " + error.message,
    });
  }
}

module.exports = {
  scheduleVehiclesHandler,
};