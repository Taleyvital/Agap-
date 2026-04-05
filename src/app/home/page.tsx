import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Bell, Bird } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { FadeUp } from "@/components/home/HomeMotion";
import { Card } from "@/components/ui/Card";
import { VerseImageCard } from "@/components/ui/VerseImageCard";
import { createSupabaseServerClient } from "@/lib/supabase-server";

const PLANS = [
  {
    title: "Évangiles",
    img: "https://images.unsplash.com/photo-1504051771394-dd2e1b862a80?w=400&q=80",
  },
  {
    title: "Psaumes",
    img: "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=400&q=80",
  },
  {
    title: "Lettres de Paul",
    img: "https://images.unsplash.com/photo-1519682337058-a94d519337bc?w=400&q=80",
  },
];

export default async function HomePage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/onboarding");

  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name, anonymous_name")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) redirect("/onboarding");

  const initial = profile.first_name?.charAt(0).toUpperCase() ?? "A";

  return (
    <AppShell>
      <div className="px-5 pt-6">
        <header className="flex items-center justify-between">
          <Link
            href="/profile"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-bg-tertiary text-sm font-semibold text-text-primary"
            aria-label="Profil"
          >
            {initial}
          </Link>
          <Link href="/chat" className="text-xs uppercase tracking-[0.15em] text-accent">
            AGAPE Chat
          </Link>
          <button
            type="button"
            className="rounded-full p-2 text-text-secondary hover:text-text-primary"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5" />
          </button>
        </header>

        <FadeUp>
        <section className="mt-8">
          <VerseImageCard
            verseText="Je suis le cep, vous êtes les sarments. Celui qui demeure en moi et en qui je demeure porte beaucoup de fruit, car sans moi vous ne pouvez rien faire."
            reference="Jean 15:5"
            variant="home"
          />
        </section>
        </FadeUp>

        <FadeUp delay={0.05}>
        <div className="mt-8">
          <Card>
            <p className="ui-label text-text-tertiary">AGAPE CHAT</p>
            <p className="mt-2 font-serif text-lg font-bold text-text-primary">
              Parler avec ton compagnon spirituel
            </p>
            <p className="mt-2 line-clamp-2 font-sans text-sm text-text-secondary">
              Un verset, une écoute, une question pour avancer dans la foi — à
              ton rythme.
            </p>
            <Link
              href="/chat"
              className="mt-3 inline-block font-sans text-xs uppercase tracking-wider text-accent"
            >
              OUVRIR LE CHAT →
            </Link>
          </Card>
        </div>
        </FadeUp>

        <FadeUp delay={0.07}>
        <div className="mt-6">
          <Card>
            <p className="ui-label text-text-tertiary">COMMUNAUTÉ</p>
            <p className="mt-2 font-serif text-lg font-bold text-text-primary">
              Partage ta foi, prie avec d'autres
            </p>
            <p className="mt-2 line-clamp-2 font-sans text-sm text-text-secondary">
              Connecte-toi avec la famille Agape. Partage tes réflexions, confie tes requêtes et lis les témoignages pour encourager et être encouragé.
            </p>
            <Link
              href="/community"
              className="mt-3 inline-block font-sans text-xs uppercase tracking-wider text-accent"
            >
              REJOINDRE LA COMMUNAUTÉ →
            </Link>
          </Card>
        </div>
        </FadeUp>

        <FadeUp delay={0.1}>
        <div className="mt-6">
          <Card>
            <p className="font-serif text-lg italic text-text-primary">
              Difficile de prier ?
            </p>
            <p className="mt-2 font-sans text-sm text-text-secondary">
              Un rappel doux peut suffire à ramener ton cœur au silence.
            </p>
            <Link
              href="/prayer"
              className="mt-4 inline-flex rounded-3xl border border-separator px-6 py-3 font-sans text-xs uppercase tracking-wider text-text-secondary transition-colors hover:border-text-tertiary hover:text-text-primary"
            >
              SET A REMINDER
            </Link>
          </Card>
        </div>
        </FadeUp>

        <section className="mt-10">
          <div className="flex items-center justify-between">
            <p className="ui-label text-text-tertiary">PLANS DE LECTURE</p>
            <Link
              href="/bible"
              className="font-sans text-xs uppercase tracking-wider text-accent"
            >
              VOIR TOUT
            </Link>
          </div>
          <div className="mt-4 flex gap-3 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {PLANS.map((p) => (
              <div
                key={p.title}
                className="relative h-28 min-w-[140px] overflow-hidden rounded-xl"
              >
                <Image
                  src={p.img}
                  alt=""
                  fill
                  className="object-cover brightness-[0.45]"
                  sizes="140px"
                />
                <span className="absolute bottom-2 left-2 font-serif text-sm italic text-white">
                  {p.title}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Floating Chat Button (Dove) */}
        <Link
          href="/chat"
          className="fixed bottom-[110px] right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-white shadow-lg shadow-accent/20 transition-colors hover:bg-accent-light"
          aria-label="Ouvrir Agape Chat"
        >
          <Bird className="h-6 w-6" strokeWidth={2.2} />
        </Link>
      </div>
    </AppShell>
  );
}
