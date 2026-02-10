import { Robot } from "../../../types/robot";

interface StatsCardsProps {
  robots: Robot[];
}

export function StatsCards({ robots }: StatsCardsProps) {
  const stats = {
    total: robots.length,
    active: robots.filter(r => r.is_active).length,
    online: robots.filter(r => r.status === "active" || r.status === "idle").length,
    assignedIPs: robots.filter(r => r.local_ip).length,
    requireAttention: robots.filter(r => 
      r.status === "error" || 
      r.status === "maintenance" ||
      (r.battery_level !== undefined && r.battery_level < 20)
    ).length,
    averageBattery: robots.length > 0 
      ? Math.round(robots.reduce((sum, r) => sum + (r.battery_level || 0), 0) / robots.length)
      : 0,
  };

  const statCards = [
    {
      title: "TOTAL ROBOTS",
      value: stats.total,
      bgColor: "bg-blue-50",
      textColor: "text-blue-700",
      borderColor: "border-blue-200",
    },
    {
      title: "ACTIVE ROBOTS",
      value: stats.active,
      bgColor: "bg-emerald-50",
      textColor: "text-emerald-700",
      borderColor: "border-emerald-200",
    },
    {
      title: "ONLINE STATUS",
      value: stats.online,
      bgColor: "bg-purple-50",
      textColor: "text-purple-700",
      borderColor: "border-purple-200",
    },
    {
      title: "NEED ATTENTION",
      value: stats.requireAttention,
      bgColor: "bg-amber-50",
      textColor: "text-amber-700",
      borderColor: "border-amber-200",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {statCards.map((stat, index) => (
        <div
          key={index}
          className={`${stat.bgColor} rounded-xl p-6 border ${stat.borderColor} transition-all hover:shadow-md`}
        >
          <div className="text-xs font-semibold text-gray-600 mb-3 tracking-wider">
            {stat.title}
          </div>
          <div className={`text-4xl font-bold ${stat.textColor}`}>
            {stat.value}
          </div>
        </div>
      ))}
    </div>
  );
}