<script setup>
import { reactive, ref } from 'vue';
import { toast } from 'vue-sonner';
import { Send } from 'lucide-vue-next';
import { EXPOSMART } from '../../constants/exposmartContent.js';

const form = reactive({
  name: '',
  email: '',
  role: EXPOSMART.contact.roles[0],
  message: '',
});

const submitting = ref(false);

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const handleSubmit = () => {
  const name = form.name.trim();
  const email = form.email.trim();
  const message = form.message.trim();

  if (!name || !email || !message) {
    toast.error('Completa todos los campos obligatorios.');
    return;
  }

  if (!isValidEmail(email)) {
    toast.error('Ingresa un correo electrónico válido.');
    return;
  }

  submitting.value = true;

  const subject = encodeURIComponent(`SIEC — ${name}`);
  const body = encodeURIComponent(
    [
      `Nombre: ${name}`,
      `Email: ${email}`,
      `Rol: ${form.role}`,
      '',
      'Mensaje:',
      message,
    ].join('\n'),
  );

  window.location.href = `mailto:${EXPOSMART.contact.email}?subject=${subject}&body=${body}`;
  toast.success(EXPOSMART.contact.successToast);

  window.setTimeout(() => {
    submitting.value = false;
  }, 600);
};
</script>

<template>
  <form
    class="exposmart-contact-form mx-auto max-w-xl rounded-[1.6rem] p-6 sm:p-8"
    data-landing-reveal
    @submit.prevent="handleSubmit"
  >
    <div class="grid gap-5">
      <div>
        <label for="exposmart-name" class="exposmart-field-label">Nombre *</label>
        <input
          id="exposmart-name"
          v-model="form.name"
          type="text"
          name="name"
          required
          autocomplete="name"
          class="exposmart-field input-focus-ring"
          placeholder="Tu nombre completo"
        />
      </div>

      <div>
        <label for="exposmart-email" class="exposmart-field-label">Correo electrónico *</label>
        <input
          id="exposmart-email"
          v-model="form.email"
          type="email"
          name="email"
          required
          autocomplete="email"
          class="exposmart-field input-focus-ring"
          placeholder="tu@correo.cl"
        />
      </div>

      <div>
        <label for="exposmart-role" class="exposmart-field-label">Rol</label>
        <select
          id="exposmart-role"
          v-model="form.role"
          name="role"
          class="exposmart-field input-focus-ring"
        >
          <option v-for="role in EXPOSMART.contact.roles" :key="role" :value="role">
            {{ role }}
          </option>
        </select>
      </div>

      <div>
        <label for="exposmart-message" class="exposmart-field-label">Mensaje *</label>
        <textarea
          id="exposmart-message"
          v-model="form.message"
          name="message"
          required
          rows="5"
          class="exposmart-field input-focus-ring resize-y min-h-[120px]"
          placeholder="Escribe tu consulta sobre el proyecto SIEC…"
        />
      </div>

      <button
        type="submit"
        :disabled="submitting"
        data-landing-hover="nav-action"
        class="btn-accent inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-black disabled:opacity-60"
      >
        <Send class="h-4 w-4" :stroke-width="2.5" />
        {{ EXPOSMART.contact.submit }}
      </button>

      <p class="text-center text-xs font-medium text-slate-500">
        Al enviar se abrirá tu cliente de correo con el mensaje prellenado.
      </p>
    </div>
  </form>
</template>

<style scoped>
.exposmart-contact-form {
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: linear-gradient(180deg, rgba(7, 16, 29, 0.72) 0%, rgba(7, 16, 29, 0.55) 100%);
  box-shadow: 0 22px 54px -30px rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(20px) saturate(1.15);
  -webkit-backdrop-filter: blur(20px) saturate(1.15);
}

.exposmart-field-label {
  @apply mb-1.5 block text-[10px] font-black uppercase tracking-[0.14em] text-slate-400;
}

.exposmart-field {
  @apply w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-medium text-slate-100 placeholder:text-slate-500;
  transition:
    border-color 0.22s ease,
    box-shadow 0.22s ease,
    background-color 0.22s ease;
}

.exposmart-field:focus {
  @apply border-orange-400/50 bg-white/[0.06] outline-none;
}
</style>
