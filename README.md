# Store

Proyecto base para una tienda con flujo de pago.

> Nota del reto: el documento recomienda no publicar la palabra "Wompi" en el repositorio público. El nombre se usa por ahora como branding local solicitado para la interfaz.

## Estructura

- `frontend`: aplicación web.
- `backend`: API y lógica del servidor.

La aplicación incluye catálogo, carrito persistente, checkout con tokenización de tarjeta en sandbox, creación y sincronización de transacciones, descuento de stock aprobado y seguimiento local de compras.

## Desarrollo

```bash
cd backend && npm install && npm run dev
cd frontend && npm install && npm run dev
```

## Tests y cobertura

Ejecuta los tests y el reporte de cobertura nativo de Node:

```bash
cd frontend && npm test && npm run test:coverage
cd backend && npm test && npm run test:coverage
```

Estado actual de cobertura verificado:

- Frontend: 3 pruebas pasando y 94.44% de líneas en la lógica de validación de tarjetas.
- Backend: 28 pruebas pasando, 84.81% de líneas, 76.82% de ramas y 86.96% de funciones.

La cobertura se ejecuta sobre el código fuente del backend con la cobertura nativa de Node y supera el objetivo de más de 80% de líneas solicitado por el reto.

## Webhook de pagos

Configura en el panel del proveedor de pagos la URL:

```text
https://hardware-store-checkout-api.onrender.com/api/webhooks/wompi
```

El endpoint acepta eventos `transaction.updated`, valida el checksum con `WOMPI_EVENT_SECRET` (o el nombre legado `WOMPI_EVENTS_SECRET`), actualiza la orden y descuenta el stock mediante una operación idempotente.

## Supabase

Copia `backend/.env.example` como `backend/.env` y completa las variables de Supabase localmente. Nunca subas las claves reales al repositorio.
