# Bug Bounty MVP

MVP local-first para una plataforma de bug bounty con:

- `Contracts/`: smart contracts Hardhat del bounty y arbitraje.
- `apps/api`: API NestJS para auth wallet, persistencia off-chain, storage e indexacion.
- `apps/web`: frontend Next.js para admin, empresa, hunter y arbitros.
- `packages/shared`: tipos, ABIs y utilidades compartidas.

## Flujo MVP

1. Admin registra arbitros y habilita empresas.
2. Empresa despliega o registra un bounty fondeado.
3. Hunter sube evidencia off-chain.
4. Backend calcula `reportHash`.
5. Hunter registra el hash on-chain.
6. Empresa acepta o rechaza.
7. Si rechaza, el hunter disputa.
8. Arbitros votan.
9. Backend indexa eventos y la UI refleja estado on-chain/off-chain.

## Arranque local

1. Copiar `.env.example` a `.env`.
2. Levantar Postgres con `docker compose up -d`.
3. Instalar dependencias del monorepo y de `Contracts`.
4. Levantar un nodo local de Hardhat con `npm --prefix Contracts run node`.
5. Desplegar contratos con `npm --prefix Contracts run bootstrap:local`.
6. Copiar `bountyAddress`, `disputeAddress` y `company` al `.env`.
7. Ejecutar API y web.

## Modo local app + Sepolia

1. Completar `.env` con:
   - `RPC_URL` apuntando a Sepolia
   - `CHAIN_ID=11155111`
   - `SEPOLIA_RPC_URL`
   - `SEPOLIA_PRIVATE_KEY`
   - `SEPOLIA_COMPANY_PRIVATE_KEY` si la empresa va a ser distinta del owner/admin
   - `ARBITRATOR_ADDRESSES`
2. Desplegar contratos con `npm --prefix Contracts run bootstrap:sepolia`.
3. Copiar `startBlock`, `bountyAddress`, `disputeAddress`, `owner` y `company` al `.env`.
4. Dejar `ADMIN_WALLET` con la address admin real.
5. Levantar Postgres, API y web localmente.
6. Operar el flujo con wallets reales en Sepolia.

## Credenciales necesarias para Sepolia

- `SEPOLIA_RPC_URL`: proveedor RPC de Sepolia
- `SEPOLIA_PRIVATE_KEY`: wallet del owner/admin que despliega `DisputeContract`
- `SEPOLIA_COMPANY_PRIVATE_KEY`: opcional; si no existe se reutiliza la wallet admin para desplegar `Bounty`
- `ARBITRATOR_ADDRESSES`: lista separada por comas con al menos 3 arbitros

El storage de evidencia y la base siguen locales. Solo la capa blockchain vive en `Sepolia`.
