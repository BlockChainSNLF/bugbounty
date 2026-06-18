flowchart TD
    A[Empresa crea bounty] --> B[Deposita fondos en el contrato]
    B --> C{Fondos suficientes?}
    C -- No --> X[No se activa el bounty]
    C -- Si --> D[Bounty abierto]

    D --> E[Hunter envia reporte]
    E --> F[Backend guarda evidencia completa off-chain]
    F --> G[Contrato registra hash + hunter + timestamp]
    G --> H[Reporte pendiente de revision]

    H --> I{Empresa revisa}
    I -- Acepta --> J[Reporte validado]
    J --> K[Contrato libera pago]
    K --> L[Caso resuelto]

    I -- Rechaza --> M{Hunter disputa?}
    M -- No --> N[Reporte rechazado]
    N --> O[El bounty sigue abierto o se cierra ese reporte]

    M -- Si --> P[Se abre arbitraje]
    P --> Q[Se seleccionan arbitros al azar y votan]
    Q --> R{Resolucion}

    R -- Hunter gana --> S[Pago completo]
    R -- Empresa gana --> U[Rechazo definitivo]

    S --> V[Cerrar caso]
    U --> V

    D --> W[Empresa cancela bounty]
    W -- Si y no hay reportes activos --> Y[Retira fondos remanentes]
