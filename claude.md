# AGAPE — Contexte projet

## Stack technique
- Next.js 14 + Tailwind CSS
- Capacitor (packaging mobile)
- Groq API — llama-3.3-70b-versatile (zero-cost AI)
- Supabase (auth, database, storage)
- bolls.life API (contenu Bible)
- Vercel (déploiement)

## Design system — Sacred Modernist
- Background : #141414
- Accent violet : #7B6FD4
- Texte principal : #E8E8E8 / secondaire : #666666
- Typographie : Playfair Display (titres) + DM Sans (corps)
- Cards : #1c1c1c, border 0.5px solid #2a2a2a, border-radius 16px
- Bouton primaire : fond #7B6FD4, texte blanc, border-radius 14px
- Bouton ghost : bordure rgba(123,111,212,0.4), texte violet

## Base de données Supabase
- Table `community_posts` avec colonnes en français — NE PAS MODIFIER
- Onboarding 4 étapes : nom, dénomination, maturité spirituelle, défi de vie
- Ces données sont stockées dans `profiles` : denomination, spiritual_maturity, life_challenge

## Features existantes
- Onboarding 4 étapes
- Chat IA personnalisé (profil injecté dynamiquement)
- Bible reader multi-traductions (LSG, NEG, BDS, PDV)
- Prayer timer avec audio ambiance Supabase
- Community feed anonyme (pseudonymes bibliques, Amen, expiration 7j)
- Verse annotation via long-press
- Answered prayer journal
- PWA configurée (manifest.json standalone + service worker)

## En cours de développement
- Module Parcours de lecture (reading plans)
  - Plans thématiques (7j, 30j)
  - Plans générés par l'IA selon le profil utilisateur
  - Chemin des jours style "Path" Duolingo
  - Tables Supabase : reading_plans, user_plan_progress, daily_reflections

## Règles importantes
- Ne jamais modifier la table community_posts
- Toujours respecter le design Sacred Modernist
- Priorité aux utilisateurs Afrique/Amérique latine : optimiser pour faible connectivité
- Audio et images via Supabase Storage (pas Unsplash)