import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const appUrl = Deno.env.get("APP_URL") ?? "https://agape-v2.vercel.app";

const VERSES = [
  { text: "Je suis le cep, vous êtes les sarments.", reference: "Jean 15:5" },
  { text: "Car Dieu a tant aimé le monde qu'il a donné son Fils unique.", reference: "Jean 3:16" },
  { text: "L'Éternel est mon berger: je ne manquerai de rien.", reference: "Psaume 23:1" },
  { text: "Ne t'inquiète de rien, mais en toute chose fais connaître tes besoins à Dieu.", reference: "Philippiens 4:6" },
  { text: "Tout ce que vous demanderez avec foi en priant, vous le recevrez.", reference: "Matthieu 21:22" },
  { text: "Car je connais les projets que j'ai formés sur vous, projets de paix.", reference: "Jérémie 29:11" },
  { text: "Le fruit de l'Esprit est amour, joie, paix, patience, bonté.", reference: "Galates 5:22" },
  { text: "Si quelqu'un est en Christ, il est une nouvelle créature.", reference: "2 Corinthiens 5:17" },
  { text: "Toutes choses concourent au bien de ceux qui aiment Dieu.", reference: "Romains 8:28" },
  { text: "Ne crains rien, car je suis avec toi.", reference: "Ésaïe 41:10" },
  { text: "Confie-toi en l'Éternel de tout ton cœur.", reference: "Proverbes 3:5" },
  { text: "Cherchez premièrement le royaume et la justice de Dieu.", reference: "Matthieu 6:33" },
  { text: "Mon Dieu pourvoira à tous vos besoins selon sa richesse.", reference: "Philippiens 4:19" },
  { text: "Bénis l'Éternel, ô mon âme, et n'oublie aucun de ses bienfaits!", reference: "Psaume 103:2" },
  { text: "L'Éternel est ma lumière et mon salut: de qui aurais-je crainte?", reference: "Psaume 27:1" },
  { text: "Avec Dieu, nous ferons des exploits.", reference: "Psaume 60:12" },
  { text: "L'amour est patient, l'amour est aimable.", reference: "1 Corinthiens 13:4" },
  { text: "Rapprochez-vous de Dieu, et il se rapprochera de vous.", reference: "Jacques 4:8" },
  { text: "L'Éternel combattra pour vous; et vous, vous resterez tranquilles.", reference: "Exode 14:14" },
  { text: "Heureux ceux qui éprouvent des besoins spirituels, car le royaume des cieux est à eux.", reference: "Matthieu 5:3" },
  { text: "Que la paix de Christ règne dans vos cœurs.", reference: "Colossiens 3:15" },
  { text: "C'est par la foi que vous êtes sauvés.", reference: "Éphésiens 2:8" },
  { text: "L'Éternel est bon, il est un refuge au jour de la détresse.", reference: "Nahum 1:7" },
  { text: "Le Seigneur est mon rocher, ma forteresse et mon libérateur.", reference: "Psaume 18:2" },
  { text: "Rendez continuellement grâces pour toutes choses à Dieu le Père.", reference: "Éphésiens 5:20" },
  { text: "Que le Dieu de l'espérance vous remplisse de toute joie et de toute paix.", reference: "Romains 15:13" },
  { text: "Car là où sont deux ou trois rassemblés en mon nom, je suis au milieu d'eux.", reference: "Matthieu 18:20" },
];

function getDailyVerse() {
  const today = new Date();
  const start = new Date(today.getFullYear(), 0, 0);
  const diff = today.getTime() - start.getTime();
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
  return VERSES[dayOfYear % VERSES.length];
}

Deno.serve(async () => {
  const supabase = createClient(supabaseUrl, serviceKey);
  const verse = getDailyVerse();

  // Get all distinct user_ids with active push subscriptions
  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("user_id");

  if (!subs?.length) {
    return new Response(JSON.stringify({ ok: true, sent: 0 }), { status: 200 });
  }

  const uniqueUsers = [...new Set(subs.map((s) => s.user_id as string))];
  let sent = 0;

  await Promise.allSettled(
    uniqueUsers.map(async (userId) => {
      const res = await fetch(`${appUrl}/api/push/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          type: "plan",
          title: "📖 Verset du jour",
          body: `${verse.text.slice(0, 80)} — ${verse.reference}`,
          url: "/bible",
        }),
      });
      if (res.ok) sent++;
    })
  );

  return new Response(JSON.stringify({ ok: true, sent, verse: verse.reference }), { status: 200 });
});
