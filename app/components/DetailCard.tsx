interface DetailCardProps {
    label: string;
    value: string;
    icon: string;
    status?: "success" | "error" | "warning" | string;
    highlight?: boolean;
    subtext?: string;
}

export const DetailCard = ({ 
    label, 
    value, 
    icon, 
    status, 
    highlight = false, 
    subtext 
}: DetailCardProps) => {
    const statusColors: Record<string, string> = {
        success: "text-emerald-600 bg-emerald-50",
        error: "text-red-600 bg-red-50",
        warning: "text-amber-600 bg-amber-50",
        default: "text-gray-600 bg-gray-50"
    };

    return (
        <div className={`p-5 rounded-xl border ${highlight ? 'border-blue-200 bg-blue-50' : 'border-gray-200 hover:border-gray-300'} transition-colors duration-200`}>
            <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-3">
                    <span className="text-xl">{icon}</span>
                    <span className="text-sm font-medium text-gray-500">{label}</span>
                </div>
                {status && (
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[status] || statusColors.default}`}>
                        {status}
                    </span>
                )}
            </div>
            <p className={`text-xl font-bold ${highlight ? 'text-blue-700' : 'text-gray-900'}`}>
                {value}
            </p>
            {subtext && (
                <p className="text-sm text-gray-400 mt-1">{subtext}</p>
            )}
        </div>
    );
};