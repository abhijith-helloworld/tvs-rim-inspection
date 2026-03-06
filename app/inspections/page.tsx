import { Suspense } from "react";
import InspectionsBySchedule from "./InspectionsBySchedule";

export default function Page() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <InspectionsBySchedule />
        </Suspense>
    );
}