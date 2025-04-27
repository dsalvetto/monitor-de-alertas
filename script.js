// Asumo que este código está en script.js
// Asegúrate de que APPS_SCRIPT_API_URL esté definida correctamente al inicio de tu script.js
const APPS_SCRIPT_API_URL = 'https://script.google.com/macros/s/AKfycbz3yMsvamDSbvkGHSzV8C0ARDmHJ5ni_o7xoPpqjMaYTX9tOyhgbEqKvxpqrr2maKI/exec';

const listaAlertasDiv = document.getElementById('lista-alertas');
const loadingAlertas = document.getElementById('loading-alertas');
const noAlertas = document.getElementById('no-alertas');
const errorAlertas = document.getElementById('error-alertas');

const cuerpoTablaHistorial = document.getElementById('cuerpo-tabla-historial');
const loadingHistorial = document.getElementById('loading-historial');
const noHistorial = document.getElementById('no-historial');
const errorHistorial = document.getElementById('error-historial');


// --- Función auxiliar para formatear la fecha para mostrar en el frontend ---
// Recibe la fecha como string en formato "yyyy-MM-dd HH:mm:ss" (como se guarda en la hoja)
// y la convierte a "dd/mm/yyyy HH:mm".
function formatDateForDisplay(dateString) {
    if (!dateString || typeof dateString !== 'string') {
        return dateString; // Devuelve el valor original si no es un string válido
    }

    // Intenta parsear el string en formato "yyyy-MM-dd HH:mm:ss"
    // Nota: Parsear strings de fecha puede ser tricky, este formato es relativamente estándar.
    // Podrías necesitar ajustar si el formato de la hoja cambia.
    const parts = dateString.match(/(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})/);

    if (!parts) {
        // Si el formato no coincide, intenta con el formato ISO que a veces aparece
         const isoParts = dateString.match(/(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}).*Z/);
         if(isoParts) {
              // Si es formato ISO, crea un objeto Date y luego formatéalo
              try {
                  const dateObj = new Date(dateString);
                  const day = String(dateObj.getDate()).padStart(2, '0');
                  const month = String(dateObj.getMonth() + 1).padStart(2, '0'); // Meses son base 0
                  const year = dateObj.getFullYear();
                  const hours = String(dateObj.getHours()).padStart(2, '0');
                  const minutes = String(dateObj.getMinutes()).padStart(2, '0');
                  // Ignoramos los segundos para el formato de visualización
                  return `${day}/${month}/${year} ${hours}:${minutes}`;
              } catch (e) {
                   console.error("Error formatting ISO date:", dateString, e);
                   return dateString; // Devuelve el original si hay error
              }
         }

        console.warn("Could not parse date string:", dateString);
        return dateString; // Devuelve el valor original si no se puede parsear
    }

    // Si el formato "yyyy-MM-dd HH:mm:ss" coincide
    const year = parts[1];
    const month = parts[2];
    const day = parts[3];
    const hours = parts[4];
    const minutes = parts[5];
    // Ignoramos los segundos (parts[6]) para el formato de visualización

    return `${day}/${month}/${year} ${hours}:${minutes}`;
}


// Función para obtener datos de la API de Apps Script (usa GET estándar)
// Esta función no cambia, ya que la carga inicial es una petición GET simple.
async function fetchData() {
    try {
        // NOTA: La carga inicial SIGUE usando fetch con GET estándar
        const response = await fetch(APPS_SCRIPT_API_URL);

        if (!response.ok) {
            const errorBody = await response.text();
            console.error(`HTTP error! status: ${response.status}`, errorBody);
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json(); // La API de Apps Script devuelve JSON estándar para la carga inicial

        if (data.error) {
            console.error("API Error:", data.error);
            throw new Error(`API Error: ${data.error}`);
        }

        return data; // Devuelve el objeto { headers, data }
    } catch (error) {
        console.error("Error fetching data:", error);
        throw error; // Propaga el error
    }
}

// --- Función para enviar solicitud a Apps Script para marcar como revisado (usa JSONP) ---
// Esta función reemplaza la versión anterior que usaba fetch con POST.
function markAsReviewedOnSheet(uid, markIndicatorElement) {
    // Deshabilitar el indicador visualmente durante la petición
    if (markIndicatorElement) {
        markIndicatorElement.style.pointerEvents = 'none'; // Deshabilita clics
        markIndicatorElement.style.opacity = '0.5'; // Atenuar visualmente
        // Opcional: cambiar contenido o clase para indicar "cargando"
        // markIndicatorElement.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'; // Ícono de carga
    }

    // Genera un nombre de función callback único para esta petición
    const callbackName = 'jsonpCallback_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);

    // Define la función callback globalmente
    window[callbackName] = function(result) {
        // Esta función se ejecuta cuando el Apps Script responde
        console.log(`Respuesta JSONP recibida para UID ${uid}:`, result);

        if (result.success) {
            console.log(`UID ${uid} marcado como revisado exitosamente.`);
            // Recargar el dashboard para ver el cambio
            loadDashboard();
        } else {
            console.error(`Error al marcar UID ${uid} como revisado: ${result.message}`);
            alert(`Error al marcar como revisado: ${result.message}`); // Mostrar un mensaje al usuario

            // Revertir estado visual si hubo error
            if (markIndicatorElement) {
                markIndicatorElement.style.pointerEvents = 'auto';
                markIndicatorElement.style.opacity = '1';
                 // Revertir ícono de carga si lo usaste
                 // markIndicatorElement.innerHTML = '<i class="fas fa-check"></i>';
            }
        }

        // Limpiar: Eliminar el script tag y la función callback global
        delete window[callbackName];
        const scriptElement = document.getElementById(callbackName + '_script');
        if (scriptElement) {
            scriptElement.remove();
        }
    };

    // Construye la URL para la petición JSONP
    // Añadimos action, uid y el nombre de la función callback como parámetros GET
    const scriptUrl = `${APPS_SCRIPT_API_URL}?action=markAsReviewed&uid=${encodeURIComponent(uid)}&callback=${callbackName}`;

    // Crea e inyecta la etiqueta script
    const scriptElement = document.createElement('script');
    scriptElement.src = scriptUrl;
    scriptElement.id = callbackName + '_script'; // Asigna un ID para poder removerlo después
    document.body.appendChild(scriptElement);

    // Opcional: Manejar errores de carga del script (ej. red)
    scriptElement.onerror = function() {
        console.error(`Error al cargar el script JSONP para UID ${uid}.`);
        alert(`Error de conexión al intentar marcar como revisado.`);
         // Revertir estado visual si hubo error
        if (markIndicatorElement) {
            markIndicatorElement.style.pointerEvents = 'auto';
            markIndicatorElement.style.opacity = '1';
             // Revertir ícono de carga si lo usaste
             // markIndicatorElement.innerHTML = '<i class="fas fa-check"></i>';
        }
        // Limpiar la función callback aunque el script no cargó
        delete window[callbackName];
        const scriptElement = document.getElementById(callbackName + '_script');
        if (scriptElement) {
            scriptElement.remove();
        }
    };
}


// Función para mostrar las alertas positivas
function displayPositiveAlerts(data) {
    listaAlertasDiv.innerHTML = ''; // Limpia el contenido actual

    const unreviewedPositiveAlerts = data.filter(item => item.Estado === 'Positivo' && item.Revisado !== 'Sí');

    if (unreviewedPositiveAlerts.length === 0) {
        noAlertas.classList.remove('hidden');
    } else {
        noAlertas.classList.add('hidden');
        unreviewedPositiveAlerts.forEach(alert => {
            const alertaItem = document.createElement('div');
            alertaItem.classList.add('alerta-item', 'positivo');

            // Formatea el timestamp antes de mostrarlo
            const formattedTimestamp = formatDateForDisplay(alert.Timestamp);

            alertaItem.innerHTML = `
                <div class="content">
                    <div class="timestamp">${formattedTimestamp}</div> <div class="asunto">${alert.Asunto}</div>
                </div>
                <div class="mark-indicator" data-uid="${alert.UID}" title="Marcar como visto">
                     <i class="fas fa-check"></i> </div>
            `;

            const markIndicator = alertaItem.querySelector('.mark-indicator');
            if (markIndicator) {
                 markIndicator.addEventListener('click', async (event) => {
                    event.stopPropagation();
                    const uid = markIndicator.dataset.uid;
                    markAsReviewedOnSheet(uid, markIndicator);
                 });
            } else {
                console.error("Error: mark-indicator element not found for alert UID:", alert.UID);
            }

            listaAlertasDiv.appendChild(alertaItem);
        });
    }
}

// Función para mostrar el historial completo
function displayHistory(data) {
    cuerpoTablaHistorial.innerHTML = ''; // Limpia el contenido actual

    if (data.length === 0) {
        noHistorial.classList.remove('hidden');
    } else {
        noHistorial.classList.add('hidden');
        // Opcional: Ordenar el historial por fecha descendente
        data.sort((a, b) => new Date(b.Timestamp) - new Date(a.Timestamp));

        // Identificar los índices de las columnas que queremos mostrar
        const headers = data.length > 0 ? Object.keys(data[0]) : [];
        const timestampIndex = headers.indexOf('Timestamp');
        const asuntoIndex = headers.indexOf('Asunto');
        const estadoIndex = headers.indexOf('Estado');
        // Omitimos Identificador y Descripción
        const revisadoIndex = headers.indexOf('Revisado');


        data.forEach(item => {
            const row = document.createElement('tr');
            if (item.Estado === 'Positivo') {
                row.classList.add('positivo'); // Esta clase aplica el color rojo a los TD dentro de esta fila (según el CSS)
            }
            if (item.Revisado === 'Sí') {
                 row.classList.add('revisado');
            }

            // Formatea el timestamp antes de mostrarlo en la tabla
            const formattedTimestamp = formatDateForDisplay(item.Timestamp);

            // Añadir solo las celdas que queremos mostrar
            if (timestampIndex !== -1) {
                const td = document.createElement('td');
                td.classList.add('py-3', 'px-6', 'text-left');
                td.textContent = formattedTimestamp;
                row.appendChild(td);
            }
             if (asuntoIndex !== -1) {
                const td = document.createElement('td');
                td.classList.add('py-3', 'px-6', 'text-left');
                td.textContent = item.Asunto;
                row.appendChild(td);
            }
             if (estadoIndex !== -1) {
                const td = document.createElement('td');
                td.classList.add('py-3', 'px-6', 'text-left');
                td.textContent = item.Estado;
                row.appendChild(td);
            }
             // Omitimos Identificador y Descripción aquí
             if (revisadoIndex !== -1) {
                const td = document.createElement('td');
                td.classList.add('py-3', 'px-6', 'text-left');
                td.textContent = item.Revisado || 'No';
                row.appendChild(td);
            }


            cuerpoTablaHistorial.appendChild(row);
        });
    }
}

// Función principal para cargar y mostrar todo
// (Este código no cambia, ya que fetchData sigue usando GET estándar)
async function loadDashboard() {
    loadingAlertas.classList.remove('hidden');
    loadingHistorial.classList.remove('hidden');
    noAlertas.classList.add('hidden');
    noHistorial.classList.add('hidden');
    errorAlertas.classList.add('hidden');
    errorHistorial.classList.add('hidden');

    try {
        const data = await fetchData(); // Obtiene { headers, data }

        if (data && Array.isArray(data.data)) {
             displayPositiveAlerts(data.data);
             displayHistory(data.data); // Llama a la función actualizada
        } else {
             throw new Error("Datos recibidos de la API no tienen el formato esperado o están vacíos.");
        }

    } catch (error) {
        console.error("Failed to load dashboard data:", error);
        loadingAlertas.classList.add('hidden');
        loadingHistorial.classList.add('hidden');
        errorAlertas.classList.remove('hidden');
        errorHistorial.classList.remove('hidden');
        listaAlertasDiv.innerHTML = '';
        cuerpoTablaHistorial.innerHTML = '';
    } finally {
        loadingAlertas.classList.add('hidden');
        loadingHistorial.classList.add('hidden');
    }
}

// Ejecutar la función principal cuando la página cargue
window.onload = loadDashboard;

// Opcional: Recargar datos periódicamente (ej: cada 5 minutos)
// setInterval(loadDashboard, 5 * 60 * 1000); // 5 minutos en milisegundos