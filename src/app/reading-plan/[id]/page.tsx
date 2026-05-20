import ReadingPlanDetailPage from "./ReadingPlanClient";

export async function generateStaticParams() {
  return [{ id: "_" }];
}

export const dynamic = "force-static";

export default function Page() {
  return <ReadingPlanDetailPage />;
}
