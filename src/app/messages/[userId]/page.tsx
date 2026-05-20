import ConversationPage from "./MessagesClient";

export async function generateStaticParams() {
  return [{ userId: "_" }];
}

export const dynamic = "force-static";

export default function Page() {
  return <ConversationPage />;
}
