/**
 * Estado respecto al último commit: MODIFICADO; reemplaza la bienvenida de Next.js
 * por la pantalla de Recordatories con acceso y cierre de sesión mediante Google.
 * En esta revisión se añaden comentarios para estudiar la implementación.
 * Propósito: mostrar la sesión y ofrecer la acción que corresponde a su estado.
 * Extensión .tsx: escribe la interfaz con JSX y conserva los tipos de TypeScript.
 * .ts serviría para lógica sin JSX; aquí necesitamos etiquetas como <main>.
 * Flujo: useSession lee el proveedor del layout; signIn y signOut llaman a la API.
 * Este control decide qué mostrar; no protege por sí solo datos o rutas del servidor.
 * Dentro del JSX se usa la forma de comentario entre llaves para no mostrarlo como texto.
 */

// Habilita hooks y eventos de clic; es la directiva, y no la extensión .tsx, la que establece la frontera cliente.
"use client";

// Importa las acciones y el hook oficiales para reutilizar la gestión de sesión de NextAuth.
import { signIn, signOut, useSession } from "next-auth/react";

// Exporta por defecto el componente que Next.js muestra en / porque el archivo se llama app/page.tsx.
export default function Home() {
  // Llama al hook siempre en el mismo orden; renombra data como session y obtiene status para distinguir la carga.
  const { data: session, status } = useSession();

  // Comprueba la carga antes de decidir qué botón mostrar para no presentar el acceso mientras se consulta la sesión.
  if (status === "loading") {
    // Devuelve una vista temporal con padding de Tailwind; este return evita ejecutar el resto de la vista en esta carga.
    return <main className="p-8">Cargando sesión...</main>;
  } // Termina el caso de carga; React volverá a renderizar el componente cuando el proveedor actualice el estado.

  // Devuelve el JSX de la pantalla; los paréntesis permiten escribirlo en varias líneas después de return.
  return (
    // Define el contenido principal; flex centra la tarjeta, min-h-screen cubre la pantalla, bg define el fondo y p el espacio.
    <main className="flex min-h-screen items-center justify-center bg-zinc-100 p-6">
      {/* Agrupa la tarjeta: ocupa el ancho disponible hasta max-w-md, con fondo blanco, padding, bordes curvos y sombra. */}
      <section className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-sm">
        {/* Usa h1 como título principal; las clases fijan tamaño, peso y color del texto. */}
        <h1 className="text-3xl font-semibold text-zinc-900">Recordatories</h1>
        {/* Abre el párrafo del estado de acceso; mt-2 lo separa del título y text-zinc-600 fija su color. */}
        <p className="mt-2 text-zinc-600">
          {/* El encadenamiento opcional evita errores si aún no existen session o user; el ternario elige el mensaje. */}
          {session?.user?.email
            // Si hay correo, el literal de plantilla lo inserta en el mensaje; React lo representa como texto.
            ? `Has iniciado sesión como ${session.user.email}`
            // Si no hay correo, utiliza la invitación a entrar; esta llave termina la expresión JavaScript.
            : "Inicia sesión para continuar"}
          {/* Cierra el párrafo después de mostrar el mensaje elegido. */}
        </p>

        {/* El ternario muestra una sola acción: cerrar si hay sesión o entrar si no la hay. */}
        {session ? (
          // Abre un botón nativo, que permite activar la acción con ratón o teclado.
          <button
            // Aplica separación, bordes curvos, padding, fondo oscuro y texto blanco; hover aclara el fondo al pasar el cursor.
            className="mt-6 rounded-lg bg-zinc-900 px-5 py-3 font-medium text-white hover:bg-zinc-700"
            // Pasa una función para ejecutar signOut al hacer clic; llamarla directamente aquí cerraría la sesión al renderizar.
            onClick={() => signOut()}
            // Termina los atributos del botón y comienza su contenido visible.
          >
            {/* Muestra la etiqueta de la acción que elimina la sesión de esta aplicación. */}
            Cerrar sesión
            {/* Cierra el botón; cerrar aquí no implica salir de la cuenta de Google en otros sitios. */}
          </button>
        // Cierra la primera rama y abre la alternativa del ternario para cuando no hay sesión.
        ) : (
          // Abre el botón de acceso en la rama sin sesión.
          <button
            // Mantiene el espaciado del otro botón y usa azul para identificar el acceso; hover cambia el tono del fondo.
            className="mt-6 rounded-lg bg-blue-600 px-5 py-3 font-medium text-white hover:bg-blue-500"
            // Retrasa la llamada hasta el clic y selecciona el proveedor google configurado en auth.ts, sin pedir una contraseña propia.
            onClick={() => signIn("google")}
            // Termina los atributos del botón para comenzar la etiqueta visible.
          >
            {/* Indica al usuario el proveedor con el que iniciará sesión. */}
            Continuar con Google
            {/* Cierra el botón que inicia el flujo de autenticación. */}
          </button>
        // Cierra los paréntesis de la rama alternativa y la expresión JavaScript del ternario.
        )}
        {/* Cierra la tarjeta después del mensaje y del botón correspondiente. */}
      </section>
      {/* Cierra el contenido principal de la página. */}
    </main>
  ); // Cierra la expresión JSX que devuelve el componente.
} // Termina Home; los cambios de sesión provocan nuevos renderizados mediante useSession.
