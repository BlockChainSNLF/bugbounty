# Contracts

Contratos del MVP local-first:

- `Bounty.sol`: escrow de recompensa fija, submit de hash, aceptacion/rechazo, FIFO y callback de disputa.
- `DisputeContract.sol`: registro de arbitros, apertura de disputa, voto y finalizacion.
- `MockDisputeContract.sol`: helper para tests.

## Scripts utiles

```bash
npm run test
npm run node
npm run bootstrap:local
```

`bootstrap:local` asume un nodo Hardhat en `localhost`, despliega `DisputeContract` y `Bounty`, registra 4 arbitros y fondea el pool arbitral.

## Integracion con la plataforma

Cambios relevantes para backend/frontend:

- `IDisputeContract` y `IBountyResolution` separados en `contracts/interfaces/`.
- `ReportDisputed` ahora emite `reportId`, `disputeId` y `hunter`.
- El MVP mantiene solo dos resultados de arbitraje:
  - `UPHELD`
  - `DISMISSED`
