import StoryPlayerPage from "./StoryPlayerClient";

export async function generateStaticParams() {
  return [{ passageRef: "_" }];
}

export const dynamic = "force-static";

export default function Page() {
  return <StoryPlayerPage />;
}
