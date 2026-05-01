// Script temporaire — exécute la migration via l'API Supabase Management
// Usage: node scripts/run-migration.mjs

const PROJECT_REF = "vibvveaoicgksvwwjvxs";
const SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZpYnZ2ZWFvaWNna3N2d3dqdnhzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTA0NTE1MiwiZXhwIjoyMDkwNjIxMTUyfQ.1yPWoGk_gw3jmGcghMXj2se-IfWiMhjWrcaxdiEJmzc";

const statements = [
  // Colonnes manquantes community_posts
  `ALTER TABLE public.community_posts ADD COLUMN IF NOT EXISTS anonymous_name text`,
  `ALTER TABLE public.community_posts ADD COLUMN IF NOT EXISTS image_url text`,
  `ALTER TABLE public.community_posts ADD COLUMN IF NOT EXISTS expires_at timestamptz`,
  `ALTER TABLE public.community_posts ADD COLUMN IF NOT EXISTS repost_of uuid REFERENCES public.community_posts(id) ON DELETE SET NULL`,

  // anonymous_name dans community_comments
  `ALTER TABLE public.community_comments ADD COLUMN IF NOT EXISTS anonymous_name text`,

  // Politique DELETE sur community_posts
  `DO $$ BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE tablename = 'community_posts' AND policyname = 'Users delete own posts'
    ) THEN
      CREATE POLICY "Users delete own posts" ON public.community_posts FOR DELETE USING (auth.uid() = user_id);
    END IF;
  END $$`,

  // Politique DELETE sur community_amens
  `DO $$ BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE tablename = 'community_amens' AND policyname = 'Users delete own amen'
    ) THEN
      CREATE POLICY "Users delete own amen" ON public.community_amens FOR DELETE USING (auth.uid() = user_id);
    END IF;
  END $$`,

  // Politique DELETE sur community_comments
  `DO $$ BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE tablename = 'community_comments' AND policyname = 'Users delete own comments'
    ) THEN
      CREATE POLICY "Users delete own comments" ON public.community_comments FOR DELETE USING (auth.uid() = user_id);
    END IF;
  END $$`,
];

async function runStatement(sql) {
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ query: sql }),
    }
  );

  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = { raw: text }; }

  return { status: res.status, ok: res.ok, body: json };
}

console.log("🚀 Exécution de la migration...\n");

for (const [i, stmt] of statements.entries()) {
  const short = stmt.trim().slice(0, 80).replace(/\n/g, " ");
  process.stdout.write(`[${i + 1}/${statements.length}] ${short}... `);
  const result = await runStatement(stmt);
  if (result.ok) {
    console.log("✅");
  } else {
    console.log(`❌ (${result.status})`);
    console.log("  Réponse:", JSON.stringify(result.body));
  }
}

console.log("\nMigration terminée.");
