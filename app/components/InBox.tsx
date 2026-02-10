interface InfoBoxProps {
    title: string;
    value: string;
    icon: string;
}

export const InfoBox = ({ title, value, icon }: InfoBoxProps) => {
    return (
        <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
            <div className="flex items-center gap-3 mb-2">
                <span className="text-lg">{icon}</span>
                <span className="text-sm text-gray-600">{title}</span>
            </div>
            <p className="text-lg font-semibold text-gray-900">{value}</p>
        </div>
    );
};