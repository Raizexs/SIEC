<script setup>
import LegalDocumentShell from "../../components/legal/LegalDocumentShell.vue";
import { LEGAL } from "../../constants/legal.js";
</script>

<template>
  <LegalDocumentShell
    title="Términos de Servicio"
    :version="LEGAL.termsVersion"
    :effective-date="LEGAL.effectiveDate"
    badge="Condiciones de uso"
  >
    <section class="space-y-4">
      <p>
        Estos Términos regulan el acceso y uso de {{ LEGAL.brand }} ({{
          LEGAL.productName
        }}), incluyendo su aplicación web, SIEC Place y las funciones
        disponibles en <a :href="LEGAL.website">{{ LEGAL.domain }}</a
        >.
      </p>
      <p>
        Al crear una cuenta o aceptar estos Términos mediante la opción
        habilitada en la plataforma, declaras haberlos leído y comprendido.
        También se aplica nuestra
        <router-link :to="LEGAL.privacyPolicyPath"
          >Política de Privacidad</router-link
        >.
      </p>
      <p>
        Si utilizas el Servicio como consumidor, estos Términos no limitan los
        derechos irrenunciables que reconoce la legislación chilena.
      </p>
    </section>

    <section class="space-y-4">
      <h2>1. Quién presta el Servicio</h2>
      <p>
        El Servicio es prestado por {{ LEGAL.operatorName }},
        {{ LEGAL.operatorDescription }}, con domicilio en
        {{ LEGAL.jurisdictionCity }}, {{ LEGAL.applicableLaw }}.
      </p>
      <p>
        Consultas legales:
        <a :href="`mailto:${LEGAL.legalEmail}`">{{ LEGAL.legalEmail }}</a
        >. Soporte:
        <a :href="`mailto:${LEGAL.supportEmail}`">{{ LEGAL.supportEmail }}</a
        >.
      </p>
    </section>

    <section class="space-y-4">
      <h2>2. Qué ofrece el Servicio</h2>
      <p>
        {{ LEGAL.brand }} ofrece herramientas para crear y administrar proyectos
        de construcción residencial, diseñar espacios en 2D o 3D, estimar
        costos, generar documentos, revisar reglas de referencia y, de forma
        opcional, publicar proyectos en SIEC Place.
      </p>
      <p>
        Las estimaciones, alertas y documentos generados son herramientas de
        apoyo. No reemplazan la revisión de profesionales habilitados, permisos
        municipales, estudios técnicos ni asesoría legal, arquitectónica, de
        ingeniería o contable.
      </p>
    </section>

    <section class="space-y-4">
      <h2>3. Requisitos de uso y cuenta</h2>
      <ul>
        <li>
          Debes ser mayor de 18 años y tener capacidad legal para contratar.
        </li>
        <li>Debes entregar información verdadera, actual y completa.</li>
        <li>
          Eres responsable de proteger tus credenciales y de las acciones
          realizadas desde tu cuenta.
        </li>
        <li>
          Debes informar cualquier acceso no autorizado a
          <a :href="`mailto:${LEGAL.supportEmail}`">{{ LEGAL.supportEmail }}</a
          >.
        </li>
        <li>
          Si actúas por una empresa u organización, declaras tener autorización
          para representarla.
        </li>
      </ul>
    </section>

    <section class="space-y-4">
      <h2>4. Contratación e información al consumidor</h2>
      <p>
        Antes de contratar un plan de pago, mostraremos sus funciones, límites,
        precio final, impuestos aplicables, duración, forma de renovación y
        condiciones de cancelación.
      </p>
      <p>
        La contratación se completa mediante una acción afirmativa de
        aceptación. Enviaremos una confirmación al correo registrado con las
        condiciones aplicables a la compra o suscripción.
      </p>
      <p>
        Cuando la Ley N° 19.496 sea aplicable, el derecho de retracto se
        ejercerá en los casos, plazos y condiciones que ella establece. Si una
        modalidad de servicio excluye legalmente el retracto, esa exclusión será
        informada de forma destacada antes de contratar y pagar.
      </p>
    </section>

    <section class="space-y-4">
      <h2>5. Planes, pagos y cancelación</h2>
      <p>
        El Servicio puede ofrecer planes gratuitos y de pago. Las condiciones
        vigentes serán las mostradas al momento de contratar.
      </p>
      <ul>
        <li>
          Los pagos pueden ser procesados por Stripe u otro proveedor informado
          antes de la compra.
        </li>
        <li>
          En las suscripciones renovables, autorizas el cobro periódico hasta
          que canceles.
        </li>
        <li>
          Puedes cancelar desde la configuración de tu cuenta o mediante el
          canal de soporte. La cancelación evita renovaciones futuras y no
          elimina de inmediato el acceso ya pagado.
        </li>
        <li>
          Los reembolsos y retractos se gestionarán conforme a la ley y a la
          parte del servicio que ya haya sido efectivamente prestada.
        </li>
        <li>
          Los cambios de precio se informarán antes de la siguiente renovación y
          no afectarán un período ya pagado.
        </li>
      </ul>
    </section>

    <section class="space-y-4">
      <h2>6. Uso permitido</h2>
      <p>No puedes utilizar el Servicio para:</p>
      <ul>
        <li>
          Realizar actividades ilícitas, fraudulentas o que vulneren derechos de
          terceros.
        </li>
        <li>
          Cargar malware, atacar, interferir o intentar acceder sin autorización
          a sistemas o cuentas.
        </li>
        <li>
          Suplantar identidades o publicar datos personales de terceros sin
          autorización.
        </li>
        <li>
          Enviar spam o realizar prácticas comerciales engañosas o abusivas.
        </li>
        <li>
          Extraer datos de forma masiva o automatizada sin autorización escrita.
        </li>
        <li>Eludir límites técnicos, de seguridad o del plan contratado.</li>
        <li>Revender el acceso al Servicio sin autorización.</li>
      </ul>
    </section>

    <section class="space-y-4">
      <h2>7. Tu contenido y datos de terceros</h2>
      <p>
        Conservas la propiedad de los proyectos, diseños, textos, imágenes y
        demás contenido que incorpores al Servicio.
      </p>
      <p>
        Nos autorizas a alojar, procesar, respaldar y mostrar ese contenido
        únicamente en la medida necesaria para operar el Servicio y ejecutar las
        funciones que solicites, como exportar, colaborar, compartir o publicar
        en SIEC Place.
      </p>
      <p>
        Debes contar con autorización o con otra base legal válida para
        incorporar datos personales, imágenes, planos o materiales de terceros.
        También eres responsable de informarles cuando corresponda.
      </p>
      <p>
        Podemos restringir o retirar contenido que sea ilegal, infrinja derechos
        de terceros, comprometa la seguridad del Servicio o deba eliminarse por
        orden de una autoridad competente.
      </p>
    </section>

    <section class="space-y-4">
      <h2>8. Propiedad intelectual de la plataforma</h2>
      <p>
        El software, diseño, marca, textos, componentes, algoritmos y demás
        elementos propios del Servicio pertenecen a {{ LEGAL.brand }} o a sus
        licenciantes.
      </p>
      <p>
        Tu plan te concede un permiso limitado, no exclusivo y revocable para
        usar el Servicio de acuerdo con estos Términos. No puedes copiar,
        distribuir o explotar sus componentes fuera de lo expresamente permitido
        por la ley o por una autorización escrita.
      </p>
      <p>
        Los documentos exportados pueden incluir la marca
        {{ LEGAL.brand }} según el plan y la configuración aplicable.
      </p>
    </section>

    <section class="space-y-4">
      <h2>9. SIEC Place</h2>
      <p>
        SIEC Place es una función opcional que permite publicar proyectos y
        conectar personas interesadas con contratistas.
      </p>
      <ul>
        <li>
          La publicación y el intercambio de datos de contacto requieren las
          autorizaciones indicadas en la plataforma.
        </li>
        <li>
          {{ LEGAL.brand }} facilita el contacto, pero no forma parte del
          contrato de construcción que puedan celebrar las personas usuarias y
          los contratistas.
        </li>
        <li>
          Cada persona debe revisar identidad, experiencia, permisos, seguros,
          condiciones y antecedentes antes de contratar.
        </li>
        <li>
          Las personas usuarias y los contratistas son responsables de sus
          ofertas, comunicaciones, acuerdos y ejecución de los trabajos.
        </li>
      </ul>
    </section>

    <section class="space-y-4">
      <h2>10. Enlaces compartidos y colaboración</h2>
      <p>
        Puedes invitar colaboradores o generar enlaces de lectura. Antes de
        compartir, debes revisar los permisos, la información visible y la fecha
        de vencimiento.
      </p>
      <p>
        Quien reciba un enlace podrá acceder al contenido habilitado mientras el
        enlace esté activo. Eres responsable de revocarlo cuando deje de ser
        necesario y de no publicar datos sensibles o información confidencial
        sin autorización.
      </p>
    </section>

    <section class="space-y-4">
      <h2>11. Estimaciones y validaciones</h2>
      <p>
        Los costos, cantidades, materiales, plazos y alertas normativas son
        estimaciones basadas en los datos disponibles y en la información
        ingresada por la persona usuaria. Pueden existir diferencias con precios
        reales, condiciones del terreno, exigencias municipales o criterios
        profesionales.
      </p>
      <p>
        El Servicio no certifica el cumplimiento de la OGUC, de normas térmicas,
        de la Ley N° 21.725 ni de otras reglas incorporadas como referencia.
        Antes de construir o contratar debes obtener las revisiones, permisos y
        aprobaciones correspondientes.
      </p>
    </section>

    <section class="space-y-4">
      <h2>12. Privacidad</h2>
      <p>
        El uso de datos personales se explica en nuestra
        <router-link :to="LEGAL.privacyPolicyPath"
          >Política de Privacidad</router-link
        >. Puedes ejercer tus derechos desde
        <strong>Configuración → Privacidad</strong> o escribiendo a
        <a :href="`mailto:${LEGAL.dpoEmail}`">{{ LEGAL.dpoEmail }}</a
        >.
      </p>
    </section>

    <section class="space-y-4">
      <h2>13. Disponibilidad y cambios del Servicio</h2>
      <p>
        Trabajamos para mantener el Servicio disponible y seguro, pero pueden
        existir interrupciones por mantenimiento, actualizaciones, fallas
        externas o situaciones fuera de nuestro control.
      </p>
      <p>
        Podemos agregar, modificar o retirar funciones. Cuando un cambio afecte
        de manera importante un plan de pago, lo informaremos con anticipación
        razonable y respetaremos los derechos que correspondan conforme a la
        ley.
      </p>
    </section>

    <section class="space-y-4">
      <h2>14. Suspensión y cierre de cuenta</h2>
      <p>
        Puedes cerrar tu cuenta en cualquier momento desde la configuración o
        mediante soporte.
      </p>
      <p>
        Podemos suspender o cerrar una cuenta por incumplimiento grave, fraude,
        impago, riesgo de seguridad o requerimiento legal. Salvo que exista una
        urgencia o prohibición legal, informaremos el motivo y daremos una
        oportunidad razonable para corregir el problema.
      </p>
      <p>
        Cuando sea técnicamente posible y no exista un riesgo de seguridad,
        podrás exportar tu información antes del cierre. Después se aplicarán
        los plazos de conservación indicados en la Política de Privacidad.
      </p>
    </section>

    <section class="space-y-4">
      <h2>15. Responsabilidad</h2>
      <p>
        Cada parte responde por los daños que le sean legalmente atribuibles.
        Nada en estos Términos excluye responsabilidad cuando la ley no permite
        hacerlo ni limita los derechos irrenunciables de las personas
        consumidoras.
      </p>
      <p>
        {{ LEGAL.brand }} no responde por decisiones técnicas, constructivas,
        comerciales o contractuales tomadas sin la revisión profesional
        necesaria, ni por información incorrecta ingresada por la persona
        usuaria.
      </p>
      <p>
        Tampoco somos responsables por servicios, contenidos o actuaciones de
        terceros ajenos a nuestro control, sin perjuicio de las obligaciones que
        legalmente nos correspondan.
      </p>
    </section>

    <section class="space-y-4">
      <h2>16. Soporte y reclamos</h2>
      <p>
        Puedes enviar consultas, reclamos o solicitudes a
        <a :href="`mailto:${LEGAL.supportEmail}`">{{ LEGAL.supportEmail }}</a> o
        a <a :href="`mailto:${LEGAL.legalEmail}`">{{ LEGAL.legalEmail }}</a
        >.
      </p>
      <p>
        Estos Términos no restringen tu derecho a acudir al SERNAC, a la
        autoridad competente o a los tribunales que correspondan conforme a la
        ley.
      </p>
    </section>

    <section class="space-y-4">
      <h2>17. Ley aplicable</h2>
      <p>
        Estos Términos se rigen por las leyes de la {{ LEGAL.applicableLaw }}.
        Las controversias serán conocidas por los tribunales competentes
        conforme a la normativa aplicable, sin imponer a las personas
        consumidoras una jurisdicción distinta de la que legalmente les
        corresponda.
      </p>
    </section>

    <section class="space-y-4">
      <h2>18. Cambios a estos Términos</h2>
      <p>
        Podemos actualizar estos Términos por cambios legales, de seguridad o
        del Servicio. La nueva versión indicará su fecha de entrada en vigor.
      </p>
      <p>
        Los cambios importantes se comunicarán por correo o mediante un aviso
        visible. No aplicaremos cambios perjudiciales de forma retroactiva.
        Cuando la ley o la naturaleza del cambio lo exijan, solicitaremos una
        nueva aceptación expresa.
      </p>
    </section>

    <section class="space-y-4">
      <h2>19. Disposiciones generales</h2>
      <ul>
        <li>
          Si una cláusula no puede aplicarse, las demás continuarán vigentes en
          la medida permitida por la ley.
        </li>
        <li>
          La falta de ejercicio de un derecho no significa que se renuncie a él.
        </li>
        <li>
          Una reorganización o transferencia del negocio podrá incluir estos
          Términos, respetando la normativa aplicable y comunicando los cambios
          relevantes.
        </li>
        <li>
          Estos Términos, la Política de Privacidad y las condiciones
          específicas informadas al contratar forman el acuerdo aplicable al
          Servicio.
        </li>
      </ul>
    </section>

    <section class="space-y-4">
      <h2>20. Contacto</h2>
      <p>
        Soporte:
        <a :href="`mailto:${LEGAL.supportEmail}`">{{ LEGAL.supportEmail }}</a
        >. Asuntos legales:
        <a :href="`mailto:${LEGAL.legalEmail}`">{{ LEGAL.legalEmail }}</a
        >. Privacidad:
        <a :href="`mailto:${LEGAL.dpoEmail}`">{{ LEGAL.dpoEmail }}</a
        >.
      </p>
    </section>
  </LegalDocumentShell>
</template>
