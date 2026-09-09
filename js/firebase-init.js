/* ═══════════════════════════════════════════════════════════════
   GRUPO DENTE CRM — js/firebase-init.js

   Pegá acá el firebaseConfig que te da la consola de Firebase
   (Configuración del proyecto → tus apps → app Web → "Config").
   No es un dato secreto: se puede commitear tranquilo, la seguridad
   real la dan las reglas de Firestore/Storage, no ocultar estas claves.
   ═══════════════════════════════════════════════════════════════ */

const firebaseConfig = {
  apiKey:            "AIzaSyBhTOhwwwbP_ws3zJhgBvm3Y-iJUWe4iQk",
  authDomain:        "grupo-dente-dem.firebaseapp.com",
  projectId:         "grupo-dente-dem",
  storageBucket:     "grupo-dente-dem.firebasestorage.app",
  messagingSenderId: "1004085748826",
  appId:             "1:1004085748826:web:1ac84f9d702d1fd8e76463",
};

firebase.initializeApp(firebaseConfig);
