<script setup>
import LegalDocumentShell from '../../components/legal/LegalDocumentShell.vue';
import { LEGAL } from '../../constants/legal.js';
</script>

<template>
  <LegalDocumentShell
    title="Política de Privacidad"
    :version="LEGAL.privacyVersion"
    :effective-date="LEGAL.effectiveDate"
    badge="Protección de datos"
  >
    <section class="space-y-4">
      <p>
        En {{ LEGAL.brand }} ({{ LEGAL.productName }}) protegemos tus datos personales y queremos
        que entiendas, de forma clara, cómo los utilizamos.
      </p>
      <p>
        Esta Política se aplica conforme a la Ley N° 19.628 mientras se encuentre vigente y ha
        sido preparada para incorporar los estándares de la Ley N° 21.719, que entra en vigor el
        1 de diciembre de 2026.
      </p>
      <p>
        Aquí explicamos qué datos tratamos, para qué los usamos, con quién podemos compartirlos,
        cuánto tiempo los conservamos y cómo puedes ejercer tus derechos. Esta Política
        complementa los
        <router-link :to="LEGAL.termsPath">Términos de Servicio</router-link>.
      </p>
    </section>

    <section class="space-y-4">
      <h2>1. Quién es responsable de tus datos</h2>
      <p>
        <strong>Responsable:</strong> {{ LEGAL.operatorName }},
        {{ LEGAL.operatorDescription }}, con domicilio en {{ LEGAL.jurisdictionCity }},
        {{ LEGAL.applicableLaw }}.
      </p>
      <p>
        {{ LEGAL.operatorName }} es responsable de los datos utilizados para administrar cuentas,
        pagos, soporte, seguridad y funcionamiento general del Servicio.
      </p>
      <p>
        Cuando una persona usuaria incorpora datos de clientes, propietarios, colaboradores u
        otras personas dentro de un proyecto, esa persona usuaria debe contar con autorización o
        con otra base legal válida. En esos casos, {{ LEGAL.operatorName }} trata esos datos para
        prestar el Servicio y siguiendo las instrucciones de la persona usuaria.
      </p>
      <p>
        <strong>Contacto de privacidad:</strong>
        <a :href="`mailto:${LEGAL.dpoEmail}`">{{ LEGAL.dpoEmail }}</a>.
        <strong>Contacto legal:</strong>
        <a :href="`mailto:${LEGAL.legalEmail}`">{{ LEGAL.legalEmail }}</a>.
      </p>
    </section>

    <section class="space-y-4">
      <h2>2. A qué servicios se aplica</h2>
      <p>
        Esta Política se aplica al sitio
        <a :href="LEGAL.website">{{ LEGAL.domain }}</a>, a la aplicación web de
        {{ LEGAL.brand }}, a SIEC Place, al soporte, a las exportaciones, a los enlaces compartidos
        y a las demás funciones relacionadas con el Servicio.
      </p>
      <p>
        Los sitios o servicios de terceros enlazados desde la plataforma tienen sus propias
        políticas de privacidad. Te recomendamos revisarlas antes de utilizarlos.
      </p>
    </section>

    <section class="space-y-4">
      <h2>3. Qué datos podemos tratar</h2>
      <ul>
        <li>
          <strong>Datos de cuenta:</strong> nombre, correo electrónico, empresa, imagen de perfil,
          método de inicio de sesión y preferencias.
        </li>
        <li>
          <strong>Datos de proyectos:</strong> nombre y ubicación de la obra, diseños 2D o 3D,
          dimensiones, materiales, presupuestos, archivos, versiones y datos incorporados por la
          persona usuaria.
        </li>
        <li>
          <strong>Datos de colaboración:</strong> comentarios, menciones, permisos e historial de
          cambios.
        </li>
        <li>
          <strong>Datos de SIEC Place:</strong> información publicada sobre una obra, rango de
          presupuesto y datos de contacto que autorices compartir.
        </li>
        <li>
          <strong>Datos de pago:</strong> plan contratado, estado de la suscripción e
          identificadores entregados por el proveedor de pagos. No almacenamos el número completo
          de tu tarjeta.
        </li>
        <li>
          <strong>Datos técnicos:</strong> dirección IP, dispositivo, navegador, registros de
          acceso, actividad de seguridad y errores del sistema.
        </li>
        <li>
          <strong>Comunicaciones:</strong> consultas, solicitudes y mensajes enviados al soporte.
        </li>
      </ul>
      <p>
        El Servicio no está diseñado para recopilar datos sensibles, como información de salud,
        biométrica, creencias religiosas u orientación sexual. No debes incorporarlos salvo que
        sea estrictamente necesario y cuentes con una autorización o base legal válida.
      </p>
    </section>

    <section class="space-y-4">
      <h2>4. Para qué usamos los datos y por qué podemos hacerlo</h2>
      <ul>
        <li>
          <strong>Prestar el Servicio:</strong> crear y administrar tu cuenta, guardar proyectos,
          calcular presupuestos, generar exportaciones y aplicar los límites del plan contratado.
          Este tratamiento es necesario para cumplir el contrato contigo.
        </li>
        <li>
          <strong>Cumplir obligaciones legales:</strong> mantener registros tributarios,
          contables o de seguridad y responder solicitudes válidas de autoridades.
        </li>
        <li>
          <strong>Proteger y mejorar la plataforma:</strong> prevenir fraude, detectar errores,
          mantener registros de seguridad y mejorar el funcionamiento. Para ello utilizamos datos
          limitados y evaluamos que nuestros intereses no afecten injustificadamente tus derechos.
        </li>
        <li>
          <strong>Funciones opcionales:</strong> publicar en SIEC Place, compartir datos de
          contacto, crear enlaces públicos o recibir comunicaciones comerciales. Cuando sea
          necesario, te pediremos un consentimiento separado y podrás retirarlo.
        </li>
      </ul>
      <p>
        La lectura o aceptación de esta Política no constituye, por sí sola, un consentimiento
        general para todos los usos de datos. Los permisos opcionales se solicitan de manera
        específica dentro del Servicio.
      </p>
      <p>
        No vendemos tus datos personales ni utilizamos el contenido privado de tus proyectos para
        entrenar modelos de inteligencia artificial de terceros sin una autorización previa,
        específica y separada.
      </p>
    </section>

    <section class="space-y-4">
      <h2>5. De dónde obtenemos los datos</h2>
      <ul>
        <li>Directamente de ti al registrarte, contratar un plan o utilizar el Servicio.</li>
        <li>De otras personas usuarias que te invitan o incorporan información en un proyecto.</li>
        <li>De servicios que autorizas, como el inicio de sesión con Google.</li>
        <li>De forma automática cuando utilizas la plataforma, mediante registros técnicos.</li>
        <li>De contratistas o participantes de SIEC Place, cuando sea necesario para la función solicitada.</li>
      </ul>
    </section>

    <section class="space-y-4">
      <h2>6. Con quién podemos compartir los datos</h2>
      <p>
        Utilizamos proveedores que nos ayudan a operar la plataforma. Solo reciben los datos
        necesarios para prestar su servicio y deben tratarlos bajo condiciones de confidencialidad
        y seguridad.
      </p>
      <ul>
        <li><strong>Supabase:</strong> autenticación, base de datos y almacenamiento.</li>
        <li><strong>Stripe:</strong> pagos y suscripciones.</li>
        <li><strong>Vercel, Railway o proveedor equivalente:</strong> alojamiento de la plataforma y su API.</li>
        <li><strong>Sentry:</strong> detección y análisis de errores.</li>
        <li><strong>Google:</strong> inicio de sesión, cuando eliges esa opción.</li>
      </ul>
      <p>
        En SIEC Place, tus datos de contacto solo se compartirán con un contratista cuando hayas
        autorizado esa acción. Desde ese momento, el contratista será responsable del uso que haga
        de los datos recibidos para sus propios fines.
      </p>
      <p>
        También podremos comunicar datos cuando exista una obligación legal, una orden válida de
        una autoridad o cuando sea necesario para ejercer o defender derechos.
      </p>
    </section>

    <section class="space-y-4">
      <h2>7. Tratamiento de datos fuera de Chile</h2>
      <p>
        Algunos proveedores pueden almacenar o procesar datos fuera de Chile. Cuando esto ocurra,
        aplicaremos las medidas contractuales, técnicas y legales exigidas por la normativa vigente
        para mantener un nivel adecuado de protección.
      </p>
      <p>
        Puedes solicitar información adicional sobre estas medidas escribiendo a
        <a :href="`mailto:${LEGAL.dpoEmail}`">{{ LEGAL.dpoEmail }}</a>.
      </p>
    </section>

    <section class="space-y-4">
      <h2>8. Cuánto tiempo conservamos los datos</h2>
      <ul>
        <li>
          <strong>Cuenta y proyectos:</strong> mientras tu cuenta permanezca activa. Después de una
          solicitud de eliminación, los datos se eliminarán o anonimizarán de los sistemas activos
          dentro de un plazo máximo de 30 días, salvo que debamos conservarlos por ley.
        </li>
        <li>
          <strong>Registros de seguridad:</strong> hasta 12 meses, salvo que sean necesarios para
          investigar un incidente o cumplir una obligación legal.
        </li>
        <li>
          <strong>Versiones de proyectos:</strong> se conservan las versiones habilitadas por el
          plan y la configuración del Servicio.
        </li>
        <li>
          <strong>Enlaces públicos:</strong> hasta su fecha de vencimiento o hasta que los revoques.
        </li>
        <li>
          <strong>SIEC Place:</strong> mientras la publicación esté activa y durante el tiempo
          necesario para atender reclamos u obligaciones legales.
        </li>
        <li>
          <strong>Facturación:</strong> durante los plazos tributarios y contables aplicables.
        </li>
        <li>
          <strong>Consentimientos y solicitudes:</strong> durante el tiempo necesario para demostrar
          su gestión y cumplir los plazos legales.
        </li>
      </ul>
      <p>
        Las copias de respaldo pueden mantenerse durante su ciclo normal de rotación y solo se
        utilizarán para recuperación o seguridad.
      </p>
    </section>

    <section class="space-y-4">
      <h2>9. Tus derechos</h2>
      <p>
        Puedes solicitar información sobre tus datos y, cuando corresponda, pedir su acceso,
        rectificación, eliminación u oponerte a un uso determinado.
      </p>
      <p>
        Desde el 1 de diciembre de 2026 también podrás ejercer expresamente los derechos de
        portabilidad y bloqueo temporal reconocidos por la Ley N° 21.719.
      </p>
      <h3>Cómo ejercerlos</h3>
      <ul>
        <li>
          Desde <strong>Configuración → Privacidad</strong>, cuando la función esté disponible.
        </li>
        <li>
          Por correo a
          <a :href="`mailto:${LEGAL.dpoEmail}`">{{ LEGAL.dpoEmail }}</a>, indicando tu correo de
          registro, el derecho que deseas ejercer y los datos necesarios para identificar la
          solicitud.
        </li>
      </ul>
      <p>
        El ejercicio de estos derechos es gratuito en los casos establecidos por la ley. Podemos
        solicitar una verificación razonable de identidad para impedir que otra persona acceda a
        tu información.
      </p>
      <p>
        Responderemos dentro del plazo legal aplicable. Desde el 1 de diciembre de 2026, el plazo
        general será de 30 días corridos y podrá ampliarse una sola vez cuando la ley lo permita.
      </p>
    </section>

    <section class="space-y-4">
      <h2>10. Consentimientos y preferencias</h2>
      <p>
        Cuando el tratamiento dependa de tu consentimiento, este será solicitado mediante una
        acción clara y separada. Podrás retirarlo utilizando un medio tan sencillo como el usado
        para otorgarlo.
      </p>
      <p>
        Puedes revisar o cambiar tus preferencias desde
        <strong>Configuración → Privacidad</strong>. Retirar un consentimiento no afecta los usos
        realizados válidamente antes de su retiro ni aquellos que debamos mantener por otra base
        legal.
      </p>
    </section>

    <section class="space-y-4">
      <h2>11. Eliminación de cuenta</h2>
      <p>
        Puedes solicitar el cierre y eliminación de tu cuenta desde
        <strong>Configuración → Privacidad</strong> o por correo. Podremos pedir una confirmación
        adicional para evitar eliminaciones accidentales o fraudulentas.
      </p>
      <p>
        La eliminación no incluirá información que debamos conservar por obligaciones legales,
        seguridad, prevención de fraude o defensa de derechos. En esos casos, los datos quedarán
        restringidos al fin que justifica su conservación.
      </p>
    </section>

    <section class="space-y-4">
      <h2>12. Personas menores de edad</h2>
      <p>
        El Servicio está dirigido a personas mayores de 18 años. No creamos intencionalmente
        cuentas para menores de edad. Si detectamos una cuenta creada en incumplimiento de esta
        regla, podremos restringirla o eliminarla.
      </p>
      <p>
        Si un proyecto incluye datos de niños, niñas o adolescentes, la persona usuaria debe
        asegurarse de contar con la autorización y las medidas de protección exigidas por la ley.
      </p>
    </section>

    <section class="space-y-4">
      <h2>13. Seguridad e incidentes</h2>
      <p>
        Aplicamos medidas técnicas y organizativas proporcionales al riesgo para proteger la
        confidencialidad, integridad y disponibilidad de los datos. Estas medidas incluyen controles
        de acceso, conexiones cifradas, registros de seguridad, respaldos y revisión de proveedores.
      </p>
      <p>
        Ningún sistema puede garantizar seguridad absoluta. Ante un incidente que genere un riesgo
        para las personas, actuaremos para contenerlo, registrarlo y notificarlo a la autoridad y a
        las personas afectadas cuando la normativa aplicable lo exija.
      </p>
      <p>
        Puedes informar una vulnerabilidad o incidente a
        <a :href="`mailto:${LEGAL.dpoEmail}`">{{ LEGAL.dpoEmail }}</a>.
      </p>
    </section>

    <section class="space-y-4">
      <h2>14. Cookies y almacenamiento local</h2>
      <p>
        Utilizamos cookies y almacenamiento local necesarios para mantener la sesión, recordar tus
        preferencias y permitir el funcionamiento de la plataforma.
      </p>
      <p>
        No utilizamos cookies publicitarias de terceros. Si en el futuro incorporamos analítica o
        cookies no esenciales, actualizaremos esta Política y solicitaremos autorización cuando
        corresponda.
      </p>
    </section>

    <section class="space-y-4">
      <h2>15. Automatización e inteligencia artificial</h2>
      <p>
        El Servicio puede utilizar reglas automáticas para cálculos, estimaciones y alertas de
        referencia. Estas funciones no toman decisiones jurídicas ni profesionales vinculantes
        sobre ti y sus resultados deben ser revisados por una persona competente.
      </p>
      <p>
        Actualmente no realizamos perfiles ni decisiones exclusivamente automatizadas que produzcan
        efectos jurídicos o te afecten significativamente. Si esto cambia, informaremos la lógica
        general, sus posibles consecuencias y las opciones de revisión humana disponibles.
      </p>
    </section>

    <section class="space-y-4">
      <h2>16. Cambios y reclamos</h2>
      <p>
        Podemos actualizar esta Política para reflejar cambios legales o del Servicio. Publicaremos
        la versión vigente y su fecha de entrada en vigor. Los cambios importantes serán informados
        por correo o mediante un aviso visible en la plataforma.
      </p>
      <p>
        Cuando un nuevo uso de datos requiera consentimiento, lo solicitaremos antes de iniciarlo.
        No consideraremos el silencio o la simple continuidad de uso como consentimiento cuando la
        ley exija una aceptación expresa.
      </p>
      <p>
        Puedes presentar consultas o reclamos ante
        <a :href="`mailto:${LEGAL.dpoEmail}`">{{ LEGAL.dpoEmail }}</a>. Desde la entrada en vigor
        de la Ley N° 21.719 también podrás reclamar ante la Agencia de Protección de Datos
        Personales en los casos establecidos por dicha ley.
      </p>
    </section>

    <section class="space-y-4">
      <h2>17. Contacto</h2>
      <p>
        Privacidad y ejercicio de derechos:
        <a :href="`mailto:${LEGAL.dpoEmail}`">{{ LEGAL.dpoEmail }}</a>.
        Asuntos legales:
        <a :href="`mailto:${LEGAL.legalEmail}`">{{ LEGAL.legalEmail }}</a>.
      </p>
    </section>
  </LegalDocumentShell>
</template>
