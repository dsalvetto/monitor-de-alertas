// *** IMPORTANTE: Reemplaza esta URL con la URL de tu API Ejecutable de Apps Script ***
const APPS_SCRIPT_API_URL = 'https://script.googleapis.com/v1/scripts/AKfycbw45o-AQ73rdgoj50a4Lwf9-KfDzc5POhqFD5TYHDb1trzmIHdKX6E7X9wT53A-Pkay:run';

const listaAlertasDiv = document.getElementById('lista-alertas');
const loadingAlertas = document.getElementById('loading-alertas');
const noAlertas = document.getElementById('no-alertas');
const errorAlertas = document.getElementById('error-alertas');

const cuerpoTablaHistorial = document.getElementById('cuerpo-tabla-historial');
const loadingHistorial = document.getElementById('loading-historial');
const noHistorial = document.getElementById('no-historial');
const errorHistorial = document.getElementById('error-historial');


// Función para obtener datos de la API de Apps Script
async function fetchData() {
    try {
        const response = await fetch(APPS_SCRIPT_API_URL);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json(); // La API de Apps Script devuelve JSON

        // La función getAlertsDataForFrontend devuelve { headers: [...], data: [...] } o { error: "..." }
        if (data.error) {
            throw new Error(`API Error: ${data.error}`);
        }

        return data; // Devuelve el objeto { headers, data }
    } catch (error) {
        console.error("Error fetching data:", error);
        // Propaga el error para que las funciones que llaman puedan manejarlo
        throw error;
    }
}

// Función para mostrar las alertas positivas
function displayPositiveAlerts(data) {
    listaAlertasDiv.innerHTML = ''; // Limpia el contenido actual
    const positiveAlerts = data.filter(item => item.Estado === 'Positivo');

    if (positiveAlerts.length === 0) {
        noAlertas.classList.remove('hidden');
    } else {
        noAlertas.classList.add('hidden');
        positiveAlerts.forEach(alert => {
            const alertaItem = document.createElement('div');
            alertaItem.classList.add('alerta-item', 'positivo'); // Añade clase 'positivo' para estilos

            alertaItem.innerHTML = `
                <div>
                    <div class="timestamp">${alert.Timestamp}</div>
                    <div class="asunto">${alert.Asunto}</div>
                </div>
                <span class="text-xl font-bold text-red-400">!</span>
            `;
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
        data.forEach(item => {
            const row = document.createElement('tr');
            // Añade clase 'positivo' a la fila si el estado es Positivo
            if (item.Estado === 'Positivo') {
                row.classList.add('positivo');
            }

            row.innerHTML = `
                <td class="py-3 px-6 text-left">${item.Timestamp}</td>
                <td class="py-3 px-6 text-left">${item.Asunto}</td>
                <td class="py-3 px-6 text-left">${item.Estado}</td>
                <td class="py-3 px-6 text-left">${item.Identificador}</td>
                <td class="py-3 px-6 text-left">${item.Descripción}</td>
            `;
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

        // Asegurarse de que data.data existe y es un array
        if (data && Array.isArray(data.data)) {
             displayPositiveAlerts(data.data); // Pasa solo el array de datos a las funciones de display
             displayHistory(data.data);
        } else {
             throw new Error("Datos recibidos de la API no tienen el formato esperado.");
        }


    } catch (error) {
        console.error("Failed to load dashboard data:", error);
        // Ocultar indicadores de carga y mostrar mensajes de error
        loadingAlertas.classList.add('hidden');
        loadingHistorial.classList.add('hidden');
        errorAlertas.classList.remove('hidden');
        errorHistorial.classList.remove('hidden');
        // Limpiar listas si hubo error
        listaAlertasDiv.innerHTML = '';
        cuerpoTablaHistorial.innerHTML = '';
    } finally {
        // Ocultar indicadores de carga al finalizar (éxito o error)
        loadingAlertas.classList.add('hidden');
        loadingHistorial.classList.add('hidden');
    }
}

// Ejecutar la función principal cuando la página cargue
window.onload = loadDashboard;

// Opcional: Recargar datos periódicamente (ej: cada 5 minutos)
// setInterval(loadDashboard, 5 * 60 * 1000); // 5 minutos en milisegundos
