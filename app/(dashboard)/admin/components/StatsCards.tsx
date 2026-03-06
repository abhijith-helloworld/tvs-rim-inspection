import { Robot } from "../../../types/robot";

interface StatsCardsProps {
    totalRobots: number;
    activeCount: number;
    onlineCount: number;
}

export function StatsCards({ totalRobots, activeCount, onlineCount }: StatsCardsProps) {
    const statCards = [
        {
            title: "TOTAL ROBOTS",
            value: totalRobots,
            bgColor: "bg-blue-50",
            textColor: "text-blue-700",
            borderColor: "border-blue-200",
        },
        {
            title: "ACTIVE ROBOTS",
            value: activeCount,
            bgColor: "bg-emerald-50",
            textColor: "text-emerald-700",
            borderColor: "border-emerald-200",
        },
        {
            title: "ONLINE STATUS",
            value: onlineCount,
            bgColor: "bg-purple-50",
            textColor: "text-purple-700",
            borderColor: "border-purple-200",
            showLiveDot: true,
        },
    ];

    return (
        <div className="w-full grid grid-cols-3 gap-6 mb-6">
            {statCards.map((stat, index) => (
                <div
                    key={index}
                    className={`${stat.bgColor} rounded-xl p-6 border ${stat.borderColor} transition-all hover:shadow-md w-full`}
                >
                    <div className="text-xs font-semibold text-gray-600 mb-3 tracking-wider">
                        {stat.title}
                    </div>
                    <div className={`flex items-center gap-2 text-4xl font-bold ${stat.textColor}`}>
                        {stat.value}
                        {stat.showLiveDot && (
                            <span className="relative flex h-2.5 w-2.5 mb-1">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75" />
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-purple-500" />
                            </span>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}