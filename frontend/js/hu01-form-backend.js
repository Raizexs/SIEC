const form = document.getElementById('simulacion-form');
const submitBtn = document.getElementById('submit-btn');
const statusBox = document.getElementById('status');

const API_URL = 'http://localhost:3000/api/simulacion/parametros';

let isSubmitting = false;

function setStatus(type, message) {
  statusBox.className = `status show ${type}`;
  statusBox.textContent = message;
}

function setLoading(loading) {
  submitBtn.disabled = loading;
  submitBtn.textContent = loading ? 'Guardando...' : 'Guardar Parametros';
}

function getPayload() {
  return {
    m2Totales: Number.parseInt(form.m2Totales.value, 10),
    materialEstructuralId: Number.parseInt(form.materialEstructuralId.value, 10),
    habitaciones: Number.parseInt(form.habitaciones.value, 10),
    banios: Number.parseInt(form.banios.value, 10),
    areasComunes: Number.parseInt(form.areasComunes.value, 10)
  };
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  if (isSubmitting) {
    return;
  }

  isSubmitting = true;
  setLoading(true);
  setStatus('loading', 'Guardando configuracion...');

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(getPayload())
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'No se pudo guardar la simulacion.');
    }

    localStorage.setItem('siec_last_simulation_id', String(data.idSimulacion));

    setStatus(
      'success',
      `Simulacion guardada correctamente. ID: ${data.idSimulacion}`
    );
  } catch (error) {
    setStatus('error', `Error: ${error.message}`);
  } finally {
    isSubmitting = false;
    setLoading(false);
  }
});
