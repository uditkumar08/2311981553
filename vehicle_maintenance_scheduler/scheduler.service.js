
exports.optimizeSchedule = (tasks, maxHours) => {
  const dp = Array(maxHours + 1).fill(0);

  for (let i = 0; i < tasks.length; i++) {
    const duration = tasks[i].duration;
    const impact = tasks[i].impact;

    for (let w = maxHours; w >= duration; w--) {
      dp[w] = Math.max(dp[w], impact + dp[w - duration]);
    }
  }

  return dp[maxHours];
};