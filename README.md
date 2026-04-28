# PorcheJam

Este proyecto es una aplicación web fullstack dedicada al descubrimiento musical a través de mecánicas de juego basadas en la identificación de audio y la navegación de metadatos.

## Origen del proyecto (Porchify)

La idea surgió inicialmente para trabajar con las playlists de Spotify. Tras desarrollar una primera versión, las restricciones de su API en modo desarrollo (limitada a 5 usuarios específicos) impedían la publicación del proyecto. Por ello, migré la lógica a la API de Deezer, que permite un acceso abierto y una gestión de datos más flexible para el usuario final.

## Funcionalidades principales

La aplicación se estructura en torno a diferentes formas de interactuar con la música:

1. **Jam Session (Modo Principal):** Es el eje central del proyecto. Un motor de juego donde el usuario debe identificar canciones a través de fragmentos de audio de playlists dinámicas. Dentro de este motor se incluyen variantes como:
    * **Modo Clásico:** Adivinar canción/artista contra reloj.
    * **Modo Impostor:** Dinámica de deducción social donde varios jugadores reciben la misma información sobre una canción (audio, nombre y artista), excepto 1 (el impostor) que recibirá una pista o nada, este debe fingir que tiene la misma información que el resto sin haberla recibido, los jugadores reales tienen que pillar al impostor.
2. **Music Race:** Un reto de lógica y cultura musical. El objetivo es conectar un artista inicial con uno de destino navegando únicamente a través de sus álbumes, colaboraciones y artistas relacionados.
3. **Buscador y Personalización:** Herramienta para explorar el catálogo global y configurar partidas basadas en gustos específicos.
4. **Mascota Interactiva (Mapi):** Un componente de UI animado que reacciona a la interacción del usuario. Gestiona estados globales para activar el "Modo Rave", un Easter Egg que transforma la estética y el comportamiento sonoro de la aplicación.

## Metodología de Desarrollo: Vibe Coding

Este proyecto se ha ejecutado bajo la filosofía de **Vibe Coding**. Como recién graduado en DAM, he utilizado herramientas de IA generativa no solo para acelerar la escritura de código, sino para centrarme en lo que realmente aporta valor:
* **Diseño de arquitectura:** Estructurar el flujo de datos entre la API y el cliente.
* **UX/UI:** Priorizar la fluidez de las animaciones y el feedback visual.
* **Iteración rápida:** Probar y descartar mecánicas de juego en tiempo real, manteniendo el enfoque en el "vibe" y el acabado final del producto.

## Stack Tecnológico

* **Frontend:** React (Vite), Tailwind CSS con estética Glassmorphism y Framer Motion para la gestión de estados y animaciones complejas.
* **Backend:** Node.js con Express, configurado como middleware para procesar, filtrar y servir los datos de la API de Deezer de forma eficiente.
* **API:** Integración con Deezer API para el manejo de imágenes, metadatos y previews de audio.

## Despliegue y Demo

La aplicación está desplegada y es totalmente funcional en el siguiente enlace:
**(https://porche-jam.vercel.app/)**

---

## Instalación y ejecución local

Si quieres clonar el proyecto y ejecutarlo en tu máquina para ver el código en acción o realizar pruebas:

1. Instalar las dependencias (Vite + React + Express):
   npm install

2. Iniciar el entorno de desarrollo:
    npm run dev

    Nota: Asegúrate de configurar las variables de entorno para que el frontend pueda comunicarse correctamente con el servidor de la API.

3. Iniciar el server.js:

    Instala las dependencias del backend:
    npm install

    Inicia el servidor:
    node server.js