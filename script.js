const APPS_SCRIPT_API_URL = 'https://script.google.com/macros/s/AKfycbz4zqK5OtXT2ZGn_Ba_y7gC3nchX7hxFVdsFsd71SAgXlWixzA5ULqZdW_7-FQhEIIz/exec';

const listaAlertasDiv = document.getElementById('lista-alertas');
const loadingAlertas = document.getElementById('loading-alertas');
const noAlertas = document.getElementById('no-alertas');
const errorAlertas = document.getElementById('error-alertas');

const cuerpoTablaHistorial = document.getElementById('cuerpo-tabla-historial');
const loadingHistorial = document.getElementById('loading-historial');
const noHistorial = document.getElementById('no-historial');
const errorHistorial = document.getElementById('error-historial');


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
// (Este código no cambia en su lógica de filtrado y creación de elementos,
// solo se asegura de que el evento click llame a la nueva función markAsReviewedOnSheet)
function displayPositiveAlerts(data) {
    listaAlertasDiv.innerHTML = ''; // Limpia el contenido actual

    const unreviewedPositiveAlerts = data.filter(item => item.Estado === 'Positivo' && item.Revisado !== 'Sí');

    if (unreviewedPositiveAlerts.length === 0) {
        noAlertas.classList.remove('hidden');
    } else {
        noAlertas.classList.add('hidden');
        unreviewedPositiveAlerts.forEach(alert => {
            const alertaItem = document.createElement('div');
            // Añade las clases CSS para el estilo de tarjeta y la línea roja
            alertaItem.classList.add('alerta-item', 'positivo');

            alertaItem.innerHTML = `
                <div class="content">
                    <div class="timestamp">${alert.Timestamp}</div>
                    <div class="asunto">${alert.Asunto}</div>
                </div>
                <div class="mark-indicator" data-uid="${alert.UID}" title="Marcar como visto">
                     <i class="fas fa-check"></i> </div>
            `;

            const markIndicator = alertaItem.querySelector('.mark-indicator');
            if (markIndicator) {
                 markIndicator.addEventListener('click', async (event) => {
                    event.stopPropagation();
                    const uid = markIndicator.dataset.uid;
                    // Llama a la función de marcado que ahora usa JSONP
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
// (Este código no cambia, solo se incluye por completitud)
function displayHistory(data) {
    cuerpoTablaHistorial.innerHTML = ''; // Limpia el contenido actual

    if (data.length === 0) {
        noHistorial.classList.remove('hidden');
    } else {
        noHistorial.classList.add('hidden');
        data.sort((a, b) => new Date(b.Timestamp) - new Date(a.Timestamp));

        data.forEach(item => {
            const row = document.createElement('tr');
            if (item.Estado === 'Positivo') {
                row.classList.add('positivo'); // Esta clase aplica el color rojo a los TD dentro de esta fila (según el CSS)
            }
            if (item.Revisado === 'Sí') {
                 row.classList.add('revisado');
            }

            row.innerHTML = `
                <td class="py-3 px-6 text-left">${item.Timestamp}</td>
                <td class="py-3 px-6 text-left">${item.Asunto}</td>
                <td class="py-3 px-6 text-left">${item.Estado}</td>
                <td class="py-3 px-6 text-left">${item.Identificador}</td>
                <td class="py-3 px-6 text-left">${item.Descripción}</td>
                <td class="py-3 px-6 text-left">${item.Revisado || 'No'}</td> `;
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
             displayHistory(data.data);
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