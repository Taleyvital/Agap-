const NAMES = [
  "Élie du désert",
  "Ruth de Moab",
  "Jonas le prophète",
  "Esther la reine",
  "Daniel sage",
  "Marie de Béthanie",
  "Timothée fidèle",
  "Lydia de Philippes",
  "Titus le compagnon",
  "Phœbé diaconesse",
];

export function pickAnonymousName(): string {
  return NAMES[Math.floor(Math.random() * NAMES.length)] ?? "Ami de la foi";
}
