# 🎤 Karaoke Night — Sistema de Solicitudes

## ¿Qué incluye este proyecto?

- App React para gestión de karaoke en restaurante
- Sistema de colas por mesa
- Panel de DJ/Admin
- Tarjetas de mesa con QR (archivo separado)

---

## 🚀 Cómo correrlo en Windows

### Opción fácil (doble clic):
1. Instala **Node.js** desde https://nodejs.org (versión LTS)
2. Haz doble clic en **INSTALAR-Y-CORRER.bat**
3. Espera que instale (2-3 minutos la primera vez)
4. Se abre solo en http://localhost:3000

### Opción manual (CMD):
```
npm install
npm start
```

---

## 📱 Acceso desde celulares (red local del restaurante)

1. Abre CMD y escribe: `ipconfig`
2. Busca "Dirección IPv4" (ej: 192.168.1.15)
3. Los clientes abren en su celular: `http://192.168.1.15:3000`

> ⚠️ La PC y los celulares deben estar en el mismo WiFi

---

## 🌐 Publicar en internet (para acceso remoto)

1. Crea cuenta gratis en https://vercel.com
2. Sube el proyecto a GitHub
3. Conecta el repo en Vercel
4. Obtienes un link público (ej: https://karaoke-mi-restaurante.vercel.app)

---

## 📂 Estructura del proyecto

```
karaoke-app/
├── src/
│   ├── App.js          ← Código principal de la app
│   └── index.js        ← Punto de entrada
├── public/
│   └── index.html      ← HTML base
├── package.json        ← Dependencias
└── INSTALAR-Y-CORRER.bat ← Instalador Windows
```

---

## 🎴 Tarjetas de mesa con QR

El archivo `tarjetas-mesa/karaoke-mesa-card.html` genera las tarjetas.
Ábrelo en Chrome → pon la URL de tu app → genera e imprime.

---

## 📋 Agregar canciones

Edita el archivo `src/App.js` y busca la lista `SONGS`:

```js
const SONGS = [
  { id: 1, title: "Nombre canción", artist: "Artista", genre: "Rock", duration: "3:45", emoji: "🎸" },
  // agrega más aquí...
];
```

---

## 💬 Soporte

Proyecto creado con Claude AI (Anthropic)
