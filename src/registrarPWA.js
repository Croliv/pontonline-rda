export function registrarPWA() {

  if ("serviceWorker" in navigator) {

    window.addEventListener("load", () => {

      navigator.serviceWorker
        .register("/sw.js")
        .then(() => {
          console.log("PWA registrado com sucesso.");
        })
        .catch(error => {
          console.warn(
            "Erro ao registrar Service Worker:",
            error
          );
        });

    });

  }

}