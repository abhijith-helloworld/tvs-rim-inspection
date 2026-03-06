import { Suspense } from "react";
import InspectionDetailPage from "./InspectionDetailPage";

export default function Page() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <InspectionDetailPage />
        </Suspense>
    );
}