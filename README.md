# matchday

Application Next.js pour suivre les matchs FIFA / EA FC joues sur PlayStation avec ses amis.

## Fonctionnement

1. Ouvrir l'application depuis un telephone ou un ordinateur.
2. Importer une capture du resultat FIFA.
3. La route serveur `/api/matches/analyze` envoie l'image au fournisseur IA configure.
4. Les donnees extraites sont affichees pour confirmation.
5. Le bouton d'enregistrement cree le match et l'ami dans PostgreSQL via Prisma.
6. Le dashboard recharge les resultats depuis `/api/matches`.

## Installation

```bash
npm install
npm run db:generate
npm run db:push
npm run db:seed
npm run dev
```

Puis ouvrir `http://localhost:3000`.

## Variables d'environnement

Copier `.env.example` vers `.env` et renseigner :

- `DATABASE_URL` : URL PostgreSQL Neon.
- `AI_API_KEY` : cle du fournisseur compatible OpenAI Chat Completions.
- `AI_API_URL` : endpoint vision du fournisseur.
- `AI_MODEL` : modele vision, par exemple `gpt-4o-mini`.

Le serveur accepte encore temporairement `AI_Api_Key`, mais il est recommande de renommer cette variable en `AI_API_KEY`. Ne jamais exposer ces variables dans le navigateur ni les committer.

## Commandes

- `npm run dev` : serveur local.
- `npm run lint` : verification ESLint.
- `npm run build` : build production.
- `npm run db:generate` : generer Prisma Client.
- `npm run db:push` : synchroniser le schema avec PostgreSQL.
- `npm run db:seed` : inserer les donnees de depart.

## Routes backend

- `GET /api/matches` : matchs et amis pour le dashboard.
- `POST /api/matches` : enregistrer un match confirme.
- `POST /api/matches/analyze` : analyser une image avec le fournisseur IA.
