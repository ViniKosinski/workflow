export type DashboardMetrics = Readonly<{ activeWorkflows: number; closedWorkflows: number; pendingTasks: number; completedTasksToday: number }>;
export type DashboardMetricsRepository = Readonly<{ get: (userId: string, organizationId: string, startOfDay: Date) => Promise<DashboardMetrics> }>;
export function getDashboardMetrics(repository: DashboardMetricsRepository, userId: string, organizationId: string, now = new Date()) {
  const startOfDay = new Date(now); startOfDay.setHours(0, 0, 0, 0);
  return repository.get(userId, organizationId, startOfDay);
}
