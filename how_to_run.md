```bash
cd /home/n2/Documentos/projects/universidad/materia_blockchain/bugbounty
npm install
cd Contracts
npm install
cd ..
docker compose up -d postgres

## Con este lo levantás:
docker start bugbounty-postgres
```

```bash
cd /home/n2/Documentos/projects/universidad/materia_blockchain/bugbounty
npm run dev:api
```

```bash
cd /home/n2/Documentos/projects/universidad/materia_blockchain/bugbounty
rm -rf apps/web/.next
npm run dev:web
```

cd /home/n2/Documentos/projects/universidad/materia_blockchain/bugbounty
npm run dev:admin

```bash
cd /home/n2/Documentos/projects/universidad/materia_blockchain/bugbounty/Contracts
npx hardhat test
```

```bash
cd /home/n2/Documentos/projects/universidad/materia_blockchain/bugbounty
npm --workspace @bugbounty/api run build
npm --workspace @bugbounty/web run build
```
