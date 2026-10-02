import type { Metadata } from 'next'
import { LEGAL, LegalShell, LegalSection } from '@/features/legal/LegalShell'

export const metadata: Metadata = {
  title: 'Política de Privacidad · Jampika',
  description:
    'Cómo Jampika trata los datos personales de las cuentas y de los pacientes o consultantes de las clínicas usuarias.',
}

export default function PrivacidadPage() {
  return (
    <LegalShell
      title="Política de Privacidad"
      subtitle="Cómo tratamos y protegemos los datos personales en Jampika."
    >
      <p>
        En {LEGAL.entidad} nos tomamos en serio la privacidad. Esta política explica qué datos
        tratamos, con qué finalidad y qué derechos tienes. Es especialmente importante porque Jampika
        gestiona datos de salud, que la normativa considera una categoría especialmente protegida.
      </p>

      <LegalSection n={1} title="Responsable y dos roles distintos">
        <p>
          Responsable del tratamiento: <strong>{LEGAL.entidad}</strong> ({LEGAL.entidadNota}),{' '}
          {LEGAL.pais}. Contacto: <a href={`mailto:${LEGAL.correo}`}>{LEGAL.correo}</a>.
        </p>
        <p>Debes distinguir dos situaciones:</p>
        <ul>
          <li>
            <strong>Datos de la cuenta</strong> (profesionales, administradores y personal de la
            clínica): actuamos como <strong>responsables</strong>, porque decidimos cómo se tratan
            estos datos para prestarte el servicio.
          </li>
          <li>
            <strong>Datos de pacientes o consultantes</strong> que la clínica introduce (historia
            clínica, cuestionarios, citas, facturación): actuamos como{' '}
            <strong>encargados del tratamiento</strong>. La clínica usuaria es la responsable y decide
            sobre esos datos; nosotros solo los tratamos siguiendo sus instrucciones y para hacer
            funcionar la plataforma.
          </li>
        </ul>
      </LegalSection>

      <LegalSection n={2} title="Qué datos tratamos">
        <ul>
          <li>
            <strong>Datos de registro y cuenta</strong>: nombre, correo, contraseña cifrada, rol, país
            y datos de la clínica.
          </li>
          <li>
            <strong>Datos de facturación de la suscripción</strong>: los pagos los procesa Stripe;
            recibimos identificadores de cliente y estado de la suscripción, no el número completo de
            tu tarjeta.
          </li>
          <li>
            <strong>Datos introducidos por la clínica</strong>: información de pacientes o consultantes
            (identificación, historia clínica, cuestionarios, citas, comprobantes, inventario y
            archivos adjuntos), incluidos <strong>datos de salud</strong>.
          </li>
          <li>
            <strong>Datos técnicos</strong>: registros de acceso, identificador de dispositivo y datos
            necesarios para la sincronización y la seguridad.
          </li>
        </ul>
      </LegalSection>

      <LegalSection n={3} title="Finalidades y base jurídica">
        <ul>
          <li>Prestar y mantener el servicio — ejecución del contrato.</li>
          <li>Gestionar la suscripción, los pagos y la facturación — ejecución del contrato y obligación legal.</li>
          <li>Seguridad, prevención del fraude y soporte — interés legítimo.</li>
          <li>
            Tratamiento de datos de salud de pacientes — por cuenta de la clínica responsable, sobre
            la base legal que esta determine (normalmente consentimiento o asistencia sanitaria).
          </li>
          <li>Comunicaciones sobre el servicio — ejecución del contrato e interés legítimo.</li>
        </ul>
      </LegalSection>

      <LegalSection n={4} title="Almacenamiento sin conexión y en el dispositivo">
        <p>
          Como funciona sin conexión, Jampika guarda una copia de los datos en el navegador o
          dispositivo (IndexedDB) para permitir trabajar sin conexión, y los sincroniza con nuestros
          servidores cuando hay red. Es responsabilidad del usuario proteger el acceso físico a sus
          dispositivos y cerrar sesión en equipos compartidos.
        </p>
      </LegalSection>

      <LegalSection n={5} title="Proveedores y transferencias internacionales">
        <p>
          Para prestar el servicio nos apoyamos en proveedores que actúan como encargados y aplican
          garantías de seguridad y, cuando procede, cláusulas contractuales tipo para transferencias
          internacionales:
        </p>
        <ul>
          <li>
            <strong>Stripe</strong> — procesamiento de pagos de la suscripción.
          </li>
          <li>
            <strong>Neon</strong> — base de datos gestionada donde se almacena la información
            sincronizada.
          </li>
          <li>
            <strong>Vercel</strong> — alojamiento de la aplicación y almacenamiento de archivos
            adjuntos.
          </li>
        </ul>
        <p>No vendemos datos personales ni los cedemos a terceros para fines publicitarios.</p>
      </LegalSection>

      <LegalSection n={6} title="Conservación">
        <p>
          Conservamos los datos mientras la cuenta esté activa y durante los plazos legales aplicables
          (por ejemplo, obligaciones contables y fiscales). Tras la baja, los datos de la clínica se
          conservan durante un plazo razonable para permitir su exportación y después se eliminan o
          anonimizan, salvo obligación legal de conservarlos.
        </p>
      </LegalSection>

      <LegalSection n={7} title="Tus derechos">
        <ul>
          <li>
            Acceso, rectificación, supresión, oposición, limitación y portabilidad de tus datos de
            cuenta, escribiendo a <a href={`mailto:${LEGAL.correo}`}>{LEGAL.correo}</a>.
          </li>
          <li>
            Si eres <strong>paciente o consultante</strong> de una clínica que usa Jampika, debes
            ejercer tus derechos <strong>ante esa clínica</strong>, que es la responsable de tus
            datos; nosotros la asistiremos como encargados.
          </li>
          <li>
            Si resides en la Unión Europea, puedes reclamar ante la autoridad de control competente
            (en España, la Agencia Española de Protección de Datos, <a href="https://www.aepd.es">aepd.es</a>).
            En otros países, ante la autoridad de protección de datos que corresponda.
          </li>
        </ul>
      </LegalSection>

      <LegalSection n={8} title="Seguridad">
        <p>
          Aplicamos medidas técnicas y organizativas para proteger los datos: cifrado en tránsito,
          contraseñas almacenadas con funciones de hash, control de acceso por roles y aislamiento de
          datos entre clínicas. Ningún sistema es infalible; si detectas un problema de seguridad,
          avísanos a <a href={`mailto:${LEGAL.correo}`}>{LEGAL.correo}</a>.
        </p>
      </LegalSection>

      <LegalSection n={9} title="Menores">
        <p>
          El servicio está dirigido a profesionales. Cuando una clínica registra datos de pacientes
          menores de edad, corresponde a dicha clínica contar con el consentimiento de los
          representantes legales conforme a la normativa aplicable.
        </p>
      </LegalSection>

      <LegalSection n={10} title="Cambios en esta política">
        <p>
          Podemos actualizar esta política. Publicaremos la versión vigente en esta página con su
          fecha de actualización y, si los cambios son relevantes, te lo notificaremos.
        </p>
      </LegalSection>
    </LegalShell>
  )
}
