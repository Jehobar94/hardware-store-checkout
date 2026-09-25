# Store

Tienda de productos para escritorio y gaming. El proyecto tiene un frontend en React y una API en Node.js. El pago se prueba con el ambiente sandbox del proveedor, mientras que los productos, las ordenes y el inventario viven en Supabase.

## Enlaces

- Aplicacion: https://hardware-store-checkout.vercel.app
- API: https://hardware-store-checkout-api.onrender.com
- Estado de la API: https://hardware-store-checkout-api.onrender.com/health

## Que se puede hacer

- Ver el catalogo y el detalle de cada producto.
- Cambiar entre las imagenes del producto y ver la galeria automaticamente.
- Agregar productos al carrito y conservarlo al recargar la pagina.
- Seleccionar solo los productos que se quieren comprar.
- Pagar uno o varios productos en la misma orden.
- Validar tarjeta, fecha de vencimiento y CVC antes de enviarlos.
- Consultar el historial de compras en la opcion Mis compras.
- Calcular la tarifa base y el envio desde el servidor.
- Descontar el inventario solo cuando el pago queda aprobado.
- Recibir actualizaciones de pago por webhook sin descontar stock dos veces.

## Estructura del proyecto

```text
frontend/    Interfaz, carrito, checkout y estado de la aplicacion
backend/     API, pagos, ordenes y reglas del inventario
supabase/    Tablas, productos iniciales y funciones de stock
```

## Requisitos

- Node.js 20 o una version posterior.
- Una base de datos Supabase.
- Una cuenta del proveedor de pagos para obtener las llaves de sandbox.

## Ejecutar en local

Instala las dependencias de cada parte:

```bash
cd backend
npm install

cd ../frontend
npm install
```

En otra terminal inicia la API:

```bash
cd backend
npm run dev
```

En una segunda terminal inicia el frontend:

```bash
cd frontend
npm run dev
```

La aplicacion queda disponible en http://127.0.0.1:5173.

## Variables de entorno

Copia `backend/.env.example` como `backend/.env` y completa los valores reales:

```env
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=tu-clave-de-servidor
WOMPI_API_URL=https://api-sandbox.co.uat.wompi.dev/v1
WOMPI_PUBLIC_KEY=tu-clave-publica
WOMPI_PRIVATE_KEY=tu-clave-privada
WOMPI_INTEGRITY_SECRET=tu-secreto-de-integridad
WOMPI_EVENT_SECRET=tu-secreto-del-webhook
FRONTEND_ORIGIN=http://127.0.0.1:5173
```

La clave de servicio, la clave privada y los secretos solo deben existir en el backend. No se deben subir a GitHub ni poner en el frontend.

## Base de datos

Ejecuta en Supabase, en este orden:

1. `supabase/catalog_products.sql`
2. `supabase/orders_stock.sql`

Los scripts crean o actualizan los productos, las ordenes, los items de cada orden y las funciones que descuentan el inventario de forma segura.

## Pruebas

Backend:

```bash
cd backend
npm test
npm run test:coverage
```

Frontend:

```bash
cd frontend
npm test
npm run build
```

Estado comprobado antes de publicar:

- Backend: 28 pruebas pasando y 85% de cobertura de lineas.
- Frontend: pruebas de validacion de tarjetas y build de produccion correcto.

## Webhook

Configura esta URL en el panel del proveedor de pagos:

```text
https://hardware-store-checkout-api.onrender.com/api/webhooks/wompi
```

El backend valida la firma del evento antes de actualizar la orden. Si falta `WOMPI_EVENT_SECRET`, el webhook se rechaza. Los eventos aprobados llaman a la funcion de Supabase que descuenta el stock de todos los productos de la orden. Si llega el mismo evento otra vez, no vuelve a descontar.

## Despliegue

- Frontend: Vercel, usando `VITE_API_URL=https://hardware-store-checkout-api.onrender.com`.
- Backend: Render, usando las variables del archivo `.env.example`.
- Supabase: proyecto de produccion con los dos scripts SQL aplicados.

Antes de publicar revisa que `FRONTEND_ORIGIN` tenga exactamente el dominio de Vercel y que los secretos de pago esten configurados en Render.

## Seguridad

La API limita el tamaño de las peticiones, restringe el origen permitido, valida los datos de las ordenes y aplica un limite basico de solicitudes. El valor del envio se calcula en el servidor y las funciones de inventario tienen permisos restringidos. Las tarjetas se tokenizan y el numero completo no se guarda en la base de datos.
