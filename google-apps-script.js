/**
 * ================================================================
 *  GOOGLE APPS SCRIPT — Formulario Karen Zelada Kinesióloga
 * ================================================================
 *
 *  INSTRUCCIONES DE INSTALACIÓN:
 *  1. Ve a https://script.google.com y crea un nuevo proyecto.
 *  2. Copia y pega TODO este código en el editor.
 *  3. Reemplaza el valor de SPREADSHEET_ID con el ID de tu
 *     Google Sheet (el ID está en la URL de la hoja de cálculo,
 *     entre /d/ y /edit).
 *  4. En el menú superior: Implementar → Nueva implementación.
 *  5. Tipo: Aplicación web.
 *     - Descripción: Formulario Karen Zelada
 *     - Ejecutar como: Yo (tu cuenta de Google)
 *     - Acceso: Cualquier usuario (Anyone, even anonymous)
 *  6. Haz clic en "Implementar" y copia la URL que te entrega.
 *  7. Pega esa URL en el archivo index.html donde dice:
 *     const APPS_SCRIPT_URL = "TU_URL_AQUI";
 *  8. ¡Listo!
 *
 *  NOTA: Si actualizas el código del script, debes crear una
 *  NUEVA implementación (no editar la existente) para que los
 *  cambios se apliquen correctamente.
 * ================================================================
 */

const SPREADSHEET_ID = "1H1EgJnUrMknn6ynnPxvLTBOY0ejcBhxADY8v3VBTHo0";

// Nombre de la hoja dentro del archivo de Google Sheets
const SHEET_NAME = "Solicitudes";


/**
 * Maneja peticiones GET (útil para verificar que el script está activo).
 */
function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({ status: "ok", message: "Script activo" }))
    .setMimeType(ContentService.MimeType.JSON);
}


/**
 * Maneja peticiones POST enviadas desde el formulario del sitio web.
 */
function doPost(e) {
  // Permitir CORS para que el formulario pueda comunicarse con el script
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };

  try {
    // Parsear el cuerpo de la petición
    let data;
    if (e.postData && e.postData.contents) {
      data = JSON.parse(e.postData.contents);
    } else {
      return buildResponse({ success: false, error: "No se recibieron datos" });
    }

    // ── Validar que lleguen todos los campos requeridos ──
    const camposRequeridos = ["nombre", "nombre_nino", "edad", "email", "telefono", "diagnostico"];
    const camposFaltantes = camposRequeridos.filter(campo => !data[campo] || data[campo].toString().trim() === "");

    if (camposFaltantes.length > 0) {
      return buildResponse({
        success: false,
        error: "Campos incompletos: " + camposFaltantes.join(", ")
      });
    }

    // ── Validar formato de email ──
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      return buildResponse({ success: false, error: "Email inválido" });
    }

    // ── Escribir en Google Sheets ──
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sheet = ss.getSheetByName(SHEET_NAME);

    // Si la hoja no existe, crearla con encabezados
    if (!sheet) {
      sheet = ss.insertSheet(SHEET_NAME);
      sheet.appendRow([
        "Fecha y Hora",
        "Nombre Apoderado",
        "Nombre Niño/a",
        "Edad Paciente",
        "Correo",
        "Teléfono",
        "Diagnóstico / Motivo"
      ]);

      // Dar formato a los encabezados
      const headerRange = sheet.getRange(1, 1, 1, 7);
      headerRange.setBackground("#7EC8E3");
      headerRange.setFontWeight("bold");
      headerRange.setFontColor("#1E293B");
    }

    // Agregar la nueva fila con los datos del formulario
    const fechaHora = Utilities.formatDate(
      new Date(),
      Session.getScriptTimeZone(),
      "dd/MM/yyyy HH:mm:ss"
    );

    sheet.appendRow([
      fechaHora,
      data.nombre.trim(),
      data.nombre_nino.trim(),
      data.edad.trim(),
      data.email.trim(),
      data.telefono.trim(),
      data.diagnostico.trim()
    ]);

    // ── Notificación por email a Karen ──
    const EMAIL_NOTIFICACION = "klgakarenzelada@gmail.com";
    GmailApp.sendEmail(
      EMAIL_NOTIFICACION,
      "Nueva solicitud de sesión — " + data.nombre,
      "Has recibido una nueva solicitud desde tu sitio web:\n\n" +
      "Apoderado: " + data.nombre + "\n" +
      "Nombre niño/a: " + data.nombre_nino + "\n" +
      "Edad paciente: " + data.edad + "\n" +
      "Email: " + data.email + "\n" +
      "Teléfono: " + data.telefono + "\n" +
      "Diagnóstico: " + data.diagnostico + "\n\n" +
      "Fecha: " + fechaHora
    );

    return buildResponse({ success: true });

  } catch (err) {
    Logger.log("Error en doPost: " + err.toString());
    return buildResponse({ success: false, error: err.toString() });
  }
}


/**
 * Helper: construye una respuesta JSON con los headers CORS correctos.
 */
function buildResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
