import { redirect } from "next/navigation";
import Link from "next/link";
import { Bell, Bird } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { FadeUp } from "@/components/home/HomeMotion";
import { Card } from "@/components/ui/Card";
import { VerseImageCard } from "@/components/ui/VerseImageCard";
import { createSupabaseServerClient } from "@/lib/supabase-server";

const PLANS = [
  {
    title: "Évangiles",
    gradient: "from-indigo-700 via-purple-700 to-slate-900",
  },
  {
    title: "Psaumes",
    gradient: "from-emerald-700 via-teal-700 to-slate-900",
  },
  {
    title: "Lettres de Paul",
    gradient: "from-amber-700 via-orange-700 to-slate-900",
  },
];

// Collection de versets pour le verset journalier
const DAILY_VERSES = [
  { text: "Je suis le cep, vous êtes les sarments. Celui qui demeure en moi et en qui je demeure porte beaucoup de fruit, car sans moi vous ne pouvez rien faire.", reference: "Jean 15:5" },
  { text: "Car Dieu a tant aimé le monde qu'il a donné son Fils unique, afin que quiconque croit en lui ne périsse point, mais qu'il ait la vie éternelle.", reference: "Jean 3:16" },
  { text: "L'Éternel est mon berger: je ne manquerai de rien. Il me fait reposer dans de verts pâturages.", reference: "Psaume 23:1-2" },
  { text: "Ne t'inquiète de rien, mais en toute chose fait connaître tes besoins à Dieu par des prières et des supplications, avec des actions de grâces.", reference: "Philippiens 4:6" },
  { text: "Tout ce que vous demanderez avec foi en priant, vous le recevrez.", reference: "Matthieu 21:22" },
  { text: "Car je connais les projets que j'ai formés sur vous, projets de paix et non de malheur, afin de vous donner un avenir et de l'espérance.", reference: "Jérémie 29:11" },
  { text: "Le fruit de l'Esprit est amour, joie, paix, patience, bonté, bénignité, fidélité, douceur, tempérance.", reference: "Galates 5:22-23" },
  { text: "Si quelqu'un est en Christ, il est une nouvelle créature. Les choses anciennes sont passées; voici, toutes choses sont devenues nouvelles.", reference: "2 Corinthiens 5:17" },
  { text: "L'amour est patient, l'amour est aimable. Il n'est point envieux, il ne se vante point, il ne s'enfle point d'orgueil.", reference: "1 Corinthiens 13:4" },
  { text: "Rapprochez-vous de Dieu, et il se rapprochera de vous. Purifiez vos mains, pécheurs; purifiez vos cœurs, hommes irrésolus.", reference: "Jacques 4:8" },
  { text: "Que la paix de Christ, à laquelle vous avez été appelés dans un seul corps, règne dans vos cœurs; et soyez reconnaissants.", reference: "Colossiens 3:15" },
  { text: "Ainsi mesurez-vous les uns les autres selon la charité, et rivalisez de respect les uns pour les autres.", reference: "Romains 12:10" },
  { text: "Bénis l'Éternel, ô mon âme, et n'oublie aucun de ses bienfaits!", reference: "Psaume 103:2" },
  { text: "Que le Dieu de l'espérance vous remplisse de toute joie et de toute paix dans la foi, pour que vous abondiez en espérance, par la puissance de l'Esprit Saint.", reference: "Romains 15:13" },
  { text: "C'est par la foi que vous êtes sauvés, si ce n'est point par les œuvres, afin que personne ne se glorifie.", reference: "Éphésiens 2:8-9" },
  { text: "Toutes choses concourent au bien de ceux qui aiment Dieu, de ceux qui sont appelés selon son dessein.", reference: "Romains 8:28" },
  { text: "Le Seigneur est mon rocher, ma forteresse et mon libérateur; c'est en lui que j'ai confiance.", reference: "Psaume 18:2" },
  { text: "Heureux ceux qui éprouvent des besoins spirituels, car le royaume des cieux est à eux.", reference: "Matthieu 5:3" },
  { text: "Ne crains rien, car je suis avec toi; ne promène pas des regards inquiets, car je suis ton Dieu.", reference: "Ésaïe 41:10" },
  { text: "L'Éternel est ma lumière et mon salut: de qui aurais-je crainte? L'Éternel est le refuge de ma vie: de qui aurais-je peur?", reference: "Psaume 27:1" },
  { text: "Confie-toi en l'Éternel de tout ton cœur, et ne t'appuie pas sur ta sagesse.", reference: "Proverbes 3:5" },
  { text: "Cherchez premièrement le royaume et la justice de Dieu; et toutes ces choses vous seront données par-dessus.", reference: "Matthieu 6:33" },
  { text: "Heureux ceux qui s'adonnent à la méditation de la loi de l'Éternel, et qui la mettent en pratique jour et nuit!", reference: "Psaume 1:1-2" },
  { text: "Avec Dieu, nous ferons des exploits; il écrasera nos ennemis.", reference: "Psaume 60:12" },
  { text: "Rendez continuellement grâces pour toutes choses à Dieu le Père, au nom de notre Seigneur Jésus Christ.", reference: "Éphésiens 5:20" },
  { text: "L'Éternel combattra pour vous; et vous, vous resterez tranquilles.", reference: "Exode 14:14" },
  { text: "Mon Dieu pourvoira à tous vos besoins selon sa richesse, avec gloire, en Jésus Christ.", reference: "Philippiens 4:19" },
  { text: "L'Éternel est bon, il est un refuge au jour de la détresse; il connaît ceux qui se confient en lui.", reference: "Nahum 1:7" },
  { text: "Car là où sont deux ou trois rassemblés en mon nom, je suis au milieu d'eux.", reference: "Matthieu 18:20" },
  { text: "Laissez venir à moi les petits enfants, et ne les en empêchez pas; car le royaume de Dieu est à ceux qui leur ressemblent.", reference: "Marc 10:14" },
];

// Fonction pour obtenir le verset du jour basé sur la date
function getDailyVerse() {
  const today = new Date();
  const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
  const index = dayOfYear % DAILY_VERSES.length;
  return DAILY_VERSES[index];
}

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
  
  // Get the daily verse
  const dailyVerse = getDailyVerse();

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
            verseText={dailyVerse.text}
            reference={dailyVerse.reference}
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
              Partage ta foi, prie avec d&apos;autres
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
                <div className={`absolute inset-0 bg-gradient-to-br ${p.gradient}`} />
                <div className="absolute inset-0 [background:radial-gradient(140px_100px_at_20%_20%,rgba(255,255,255,0.28),transparent_65%)]" />
                <div className="absolute inset-0 [background:radial-gradient(160px_120px_at_80%_70%,rgba(0,0,0,0.35),transparent_60%)]" />
                <div className="absolute inset-0 bg-black/25" />
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
