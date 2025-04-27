// *** IMPORTANTE: Reemplaza esta URL con la URL de tu Aplicación Web de Apps Script ***
const APPS_SCRIPT_API_URL = 'https://script.google.com/macros/s/AKfycbzMt-SOU-8M_pQHSbnHbMA1Zggs8uYljdcezBkG_fTaYNj4gnHvREC529eWorjFT99_/exec';

const listaAlertasDiv = document.getElementById('lista-alertas');
const loadingAlertas = document.getElementById('loading-alertas');
const noAlertas = document.getElementById('no-alertas');
const errorAlertas = document.getElementById('error-alertas');

const cuerpoTablaHistorial = document.getElementById('cuerpo-tabla-historial');
const loadingHistorial = document.getElementById('loading-historial');
const noHistorial = document.getElementById('no-historial');
const errorHistorial = document.getElementById('error-historial');


// Función para obtener datos de la API de Apps Script (usa GET)
async function fetchData() {
    try {
        const response = await fetch(APPS_SCRIPT_API_URL);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json(); // La API de Apps Script devuelve JSON

        // La función doGet devuelve { headers: [...], data: [...] } o { error: "..." }
        if (data.error) {
            throw new Error(`API Error: ${data.error}`);
        }

        return data; // Devuelve el objeto { headers, data }
    } catch (error) {
        console.error("Error fetching data:", error);
        throw error; // Propaga el error
    }
}

// Función para enviar solicitud a Apps Script para marcar como revisado (usa POST)
async function markAsReviewedOnSheet(uid) {
    try {
        const response = await fetch(APPS_SCRIPT_API_URL, {
            method: 'POST', // Usamos POST para enviar datos
            headers: {
                'Content-Type': 'application/json' // Indicamos que el cuerpo es JSON
            },
            body: JSON.stringify({ // Enviamos un objeto JSON con la acción y el UID
                action: 'markAsReviewed',
                uid: uid
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json(); // Esperamos una respuesta JSON de Apps Script

        if (result.success) {
            console.log(`UID ${uid} marcado como revisado exitosamente.`);
            // Opcional: Actualizar la UI sin recargar toda la página
            // Por ahora, simplemente recargaremos el dashboard para ver el cambio
            loadDashboard();
        } else {
            console.error(`Error al marcar UID ${uid} como revisado: ${result.message}`);
            alert(`Error al marcar como revisado: ${result.message}`); // Mostrar un mensaje al usuario
        }

    } catch (error) {
        console.error(`Error en la petición POST para marcar UID ${uid}:`, error);
        alert(`Error de conexión al intentar marcar como revisado.`); // Mostrar un mensaje al usuario
    }
}


// Función para mostrar las alertas positivas
function displayPositiveAlerts(data) {
    listaAlertasDiv.innerHTML = ''; // Limpia el contenido actual

    // Filtra solo las alertas que son Positivas Y NO están marcadas como Revisado
    const unreviewedPositiveAlerts = data.filter(item => item.Estado === 'Positivo' && item.Revisado !== 'Sí');

    if (unreviewedPositiveAlerts.length === 0) {
        noAlertas.classList.remove('hidden');
    } else {
        noAlertas.classList.add('hidden');
        unreviewedPositiveAlerts.forEach(alert => {
            const alertaItem = document.createElement('div');
            alertaItem.classList.add('alerta-item', 'positivo');

            alertaItem.innerHTML = `
                <div>
                    <div class="timestamp">${alert.Timestamp}</div>
                    <div class="asunto">${alert.Asunto}</div>
                    </div>
                <button class="mark-reviewed-btn" data-uid="${alert.UID}">Marcar como visto</button>
            `;

            // Añadir el evento click al botón
            const markButton = alertaItem.querySelector('.mark-reviewed-btn');
            markButton.addEventListener('click', async () => {
                // Deshabilitar el botón para evitar clics múltiples
                markButton.disabled = true;
                markButton.textContent = 'Marcando...';

                const uid = markButton.dataset.uid; // Obtener el UID del atributo data-uid
                await markAsReviewedOnSheet(uid); // Llamar a la función para marcar en la hoja
                // loadDashboard() se llama dentro de markAsReviewedOnSheet si es exitoso
            });

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

        data.forEach(item => {
            const row = document.createElement('tr');
            // Añade clase 'positivo' a la fila si el estado es Positivo
            if (item.Estado === 'Positivo') {
                row.classList.add('positivo');
            }
             // Añade clase 'revisado' si está marcado como Sí
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
async function loadDashboard() {
    // Mostrar indicadores de carga
    loadingAlertas.classList.remove('hidden');
    loadingHistorial.classList.remove('hidden');
    noAlertas.classList.add('hidden');
    noHistorial.classList.add('hidden');
    errorAlertas.classList.add('hidden');
    errorHistorial.classList.add('hidden');

    try {
        const data = await fetchData(); // Obtiene { headers, data }

        if (data && Array.isArray(data.data)) {
             // Pasamos el array completo a ambas funciones de display
             displayPositiveAlerts(data.data);
             displayHistory(data.data);
        } else {
             throw new Error("Datos recibidos de la API no tienen el formato esperado.");
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