import GospelPlayerPage from "./GospelPlayerClient";

export async function generateStaticParams() {
  return [{ id: "_" }];
}

export const dynamic = "force-static";

export default function Page({ params }: { params: { id: string } }) {
  return <GospelPlayerPage params={params} />;
}
