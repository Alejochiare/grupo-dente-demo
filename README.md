# GRUPO DENTE CRM — Demo

CRM de gestión automotor (clientes, vehículos, alertas, tareas, peritaje y gestoría)
adaptado de un sistema previo que corría sobre PHP + MySQL. Esta versión es una
**demo estática** pensada para mostrarle el sistema a GRUPO DENTE antes de pasarlo a
un hosting definitivo: no tiene backend propio, usa **Firebase Firestore** (y
**Storage** para las fotos de vehículos) directamente desde el navegador.

## 1. Crear el proyecto de Firebase (una sola vez)

1. Entrá a [console.firebase.google.com](https://console.firebase.google.com) con tu
   cuenta de Google → **Agregar proyecto** → ponele un nombre (ej. `grupo-dente-demo`)
   → podés desactivar Google Analytics, no hace falta.
2. En el menú lateral: **Compilación → Firestore Database → Crear base de datos** →
   elegí **Iniciar en modo de prueba** → elegí una región (cualquiera de
   Sudamérica, ej. `southamerica-east1`).
3. En el menú lateral: **Compilación → Storage → Comenzar** → **Iniciar en modo de
   prueba**.
4. **Configuración del proyecto** (ícono de engranaje) → pestaña **General** → abajo,
   en "Tus apps" → ícono **Web (`</>`)** → registrá la app (el nombre que quieras) →
   Firebase te muestra un objeto `firebaseConfig`. Copialo.
5. Pegá ese objeto en [js/firebase-init.js](js/firebase-init.js), reemplazando los
   valores `"PEGAR_AQUI"`.

**Importante — modo de prueba:**
- Las reglas de Firestore/Storage en modo prueba quedan abiertas a **cualquiera que
  tenga la URL del proyecto** (no solo quien tenga el link de esta demo), y Firebase
  las desactiva automáticamente **~30 días** después de creadas (a partir de ahí el
  sitio deja de leer/escribir datos hasta que se actualicen las reglas). Está bien
  para esta demo corta con datos ficticios — **no cargues datos reales de ningún
  cliente** mientras esté así.
- El `firebaseConfig` no es un secreto, se puede commitear sin problema.

## 2. Cargar datos de demo

Abrí [seed.html](seed.html) en el navegador (local o ya publicado) y apretá
"Cargar datos de demo". Crea clientes, vehículos, tareas y usuarios **ficticios**
con IDs fijos — correrlo de nuevo resetea la demo a este mismo estado inicial.

Usuarios de prueba que quedan creados: `admin` / `demo2026` y `vendedor` / `demo2026`
(ver [js/seed-demo-data.js](js/seed-demo-data.js) para editarlos).

## 3. Probar en local

No hay build step, son archivos sueltos. Con Node ya instalado:

```
npx serve .
```

Abrí `http://localhost:3000` (o el puerto que indique) y entrá con un usuario de demo.

## 4. Publicar en GitHub Pages

1. Agregá esta carpeta como repositorio en **GitHub Desktop** (File → Add Local
   Repository) y publicala (Publish repository).
2. En GitHub.com, dentro del repo: **Settings → Pages → Build and deployment →
   Deploy from a branch** → rama `main`, carpeta `/ (root)` → Save.
3. A los pocos minutos el sitio queda en
   `https://<tu-usuario>.github.io/<nombre-repo>/`. Ese es el link para pasarle a
   GRUPO DENTE.

El repo (y por lo tanto el sitio) va a ser **público** — es un requisito de GitHub
Pages en el plan gratuito. No aparece en buscadores ni listados, pero cualquiera con
el link puede verlo. Como solo tiene datos de demo, no hay problema.

## Antes de pasar a producción con datos reales

Esta demo prioriza velocidad de armado, no seguridad real:
- El login compara la contraseña en texto plano contra Firestore (ver
  [login.html](login.html)) — suficiente porque las reglas de "modo prueba" ya están
  abiertas para cualquiera igual.
- Antes de usar esto con datos reales de GRUPO DENTE hay que: escribir reglas de
  seguridad de Firestore/Storage de verdad (o volver a un backend propio), y un login
  con contraseñas hasheadas.
