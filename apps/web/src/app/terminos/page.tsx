import type { Metadata } from 'next'
import { LEGAL, LegalShell, LegalSection } from '@/features/legal/LegalShell'

export const metadata: Metadata = {
  title: 'Términos y Condiciones · Jampika',
  description:
    'Términos de uso y condiciones de compra del servicio Jampika para profesionales de salud y bienestar.',
}

export default function TerminosPage() {
  return (
    <LegalShell
      title="Términos y Condiciones"
      subtitle="Condiciones de uso y de compra del servicio Jampika."
    >
      <p>
        Estos Términos y Condiciones (los «Términos») regulan el acceso y uso de {LEGAL.producto},
        una plataforma de software como servicio (SaaS) para la gestión de la práctica de
        profesionales de salud y bienestar, titularidad de {LEGAL.entidad} («nosotros»), con sede en{' '}
        {LEGAL.pais}. Al crear una cuenta o contratar una suscripción aceptas estos Términos en su
        totalidad. Si no estás de acuerdo, no utilices el servicio.
      </p>

      <LegalSection n={1} title="Titular del servicio">
        <ul>
          <li>
            Titular: {LEGAL.entidad} ({LEGAL.entidadNota})
          </li>
          <li>Domicilio social: {LEGAL.pais}</li>
          <li>Servicio: {LEGAL.producto} ({LEGAL.dominio})</li>
          <li>
            Contacto: <a href={`mailto:${LEGAL.correo}`}>{LEGAL.correo}</a>
          </li>
        </ul>
      </LegalSection>

      <LegalSection n={2} title="Objeto del servicio">
        <p>
          Jampika ofrece herramientas de gestión de pacientes o consultantes, agenda, historia
          clínica, cuestionarios, facturación, inventario, telemedicina y sincronización de datos.
          Está diseñado con arquitectura <strong>offline-first</strong>: la información puede
          almacenarse localmente en el dispositivo y sincronizarse con nuestros servidores cuando hay
          conexión.
        </p>
        <p>
          Jampika es una herramienta de apoyo a la gestión. <strong>No es un dispositivo médico</strong>,
          no emite diagnósticos ni sustituye el criterio profesional del usuario. La
          responsabilidad clínica y legal sobre la atención prestada corresponde exclusivamente al
          profesional o a la clínica usuaria.
        </p>
      </LegalSection>

      <LegalSection n={3} title="Cuenta y responsabilidad del usuario">
        <ul>
          <li>
            Debes ser mayor de edad y un profesional o entidad legalmente habilitado para prestar los
            servicios que gestionas con la plataforma.
          </li>
          <li>
            Eres responsable de la veracidad de los datos de registro, de la confidencialidad de tus
            credenciales y de toda la actividad realizada bajo tu cuenta.
          </li>
          <li>
            Como titular de la clínica, eres responsable del tratamiento de los datos de tus
            pacientes o consultantes que introduces en la plataforma, y de contar con la base legal y
            los consentimientos necesarios. Consulta la{' '}
            <a href="/privacidad">Política de Privacidad</a>.
          </li>
          <li>
            No debes usar el servicio para fines ilícitos, ni intentar vulnerar su seguridad,
            revenderlo o superar los límites de tu plan por medios no autorizados.
          </li>
        </ul>
      </LegalSection>

      <LegalSection n={4} title="Planes y precios">
        <p>
          El servicio se ofrece mediante suscripción en tres planes, según el número de profesionales
          activos:
        </p>
        <ul>
          <li>
            <strong>Consultorio</strong> — hasta 5 profesionales — USD 39/mes o USD 390/año.
          </li>
          <li>
            <strong>Clínica</strong> — hasta 15 profesionales — USD 79/mes o USD 790/año.
          </li>
          <li>
            <strong>Institución</strong> — profesionales ilimitados — USD 149/mes o USD 1490/año.
          </li>
        </ul>
        <p>
          Los precios se expresan en dólares estadounidenses (USD) y pueden no incluir los impuestos
          aplicables según tu país, que se añadirán cuando corresponda. Todos los planes incluyen los
          módulos disponibles de la plataforma. Podemos actualizar los precios; los cambios se
          comunicarán con antelación y se aplicarán a partir de la siguiente renovación.
        </p>
      </LegalSection>

      <LegalSection n={5} title="Periodo de prueba">
        <p>
          Las nuevas suscripciones pueden incluir un periodo de prueba de 30 días. Durante la prueba
          no se realiza ningún cargo. Al finalizar, la suscripción se activa automáticamente y se
          cobra el plan elegido, salvo que la canceles antes del fin del periodo de prueba.
        </p>
      </LegalSection>

      <LegalSection n={6} title="Facturación, pago y renovación">
        <ul>
          <li>
            Los pagos se procesan a través de <strong>Stripe</strong>, nuestro proveedor de pagos. No
            almacenamos los datos completos de tu tarjeta.
          </li>
          <li>
            La suscripción se <strong>renueva automáticamente</strong> al final de cada periodo
            (mensual o anual) por el mismo plan, hasta que la canceles.
          </li>
          <li>
            Puedes <strong>cambiar de plan</strong> en cualquier momento desde el portal de
            suscripción; los ajustes de importe se prorratean según las reglas del proveedor de pagos.
          </li>
          <li>
            Si un cobro falla, podremos reintentarlo y, tras un periodo de gracia, suspender el acceso
            de escritura hasta regularizar el pago.
          </li>
        </ul>
      </LegalSection>

      <LegalSection n={7} title="Cancelación y reembolsos">
        <ul>
          <li>
            Puedes cancelar cuando quieras desde <strong>Ajustes → Suscripción → Gestionar
            suscripción</strong>. La cancelación surte efecto al final del periodo ya pagado; seguirás
            teniendo acceso hasta esa fecha.
          </li>
          <li>
            Salvo obligación legal en contrario, los importes ya abonados de un periodo en curso no son
            reembolsables una vez iniciado dicho periodo.
          </li>
          <li>
            Si eres consumidor en la Unión Europea, dispones del derecho de desistimiento de 14 días;
            al contratar un servicio digital de acceso inmediato y solicitar su ejecución antes de ese
            plazo, aceptas que dicho derecho se extingue una vez comenzada la prestación.
          </li>
        </ul>
      </LegalSection>

      <LegalSection n={8} title="Suspensión y conservación de datos">
        <p>
          La falta de pago o el incumplimiento de estos Términos puede conllevar la limitación o
          suspensión del servicio. Aun en caso de suspensión por impago,{' '}
          <strong>no eliminaremos ni bloquearemos la lectura de la historia clínica ni de los datos
          ya registrados</strong> mientras la ley lo exija: la suspensión limita el alta de nuevos
          datos, no el acceso a la información existente. Tras la baja definitiva de la cuenta, podrás
          solicitar la exportación de tus datos durante un plazo razonable antes de su eliminación.
        </p>
      </LegalSection>

      <LegalSection n={9} title="Facturación electrónica (fase beta)">
        <p>
          Las funciones de emisión de comprobantes (boletas, facturas, registro de ventas) se
          encuentran en fase de pruebas. Los documentos generados tienen carácter de representación
          impresa y <strong>no tienen validez tributaria hasta su envío efectivo a la autoridad
          fiscal correspondiente</strong> (por ejemplo, SUNAT en Perú) a través del medio habilitado.
          La correcta declaración y emisión fiscal es responsabilidad del usuario.
        </p>
      </LegalSection>

      <LegalSection n={10} title="Disponibilidad y propiedad intelectual">
        <p>
          Nos esforzamos por mantener el servicio disponible, pero no garantizamos un funcionamiento
          ininterrumpido ni libre de errores, y podemos realizar mantenimientos o mejoras. El
          software, la marca y los contenidos de Jampika son titularidad de {LEGAL.entidad} o de sus
          licenciantes; los datos que tú introduces siguen siendo tuyos.
        </p>
      </LegalSection>

      <LegalSection n={11} title="Limitación de responsabilidad">
        <p>
          En la medida permitida por la ley, no seremos responsables de daños indirectos, lucro
          cesante ni pérdida de datos derivados del uso o la imposibilidad de uso del servicio. Nuestra
          responsabilidad total quedará limitada al importe abonado por ti en los 12 meses anteriores
          al hecho que origine la reclamación. Nada en estos Términos excluye responsabilidades que no
          puedan limitarse legalmente.
        </p>
      </LegalSection>

      <LegalSection n={12} title="Modificaciones">
        <p>
          Podemos actualizar estos Términos para reflejar cambios legales o del servicio. Publicaremos
          la versión vigente en esta página con su fecha de actualización y, cuando los cambios sean
          sustanciales, te lo notificaremos. El uso continuado del servicio implica su aceptación.
        </p>
      </LegalSection>

      <LegalSection n={13} title="Ley aplicable y contacto">
        <p>
          Estos Términos se rigen por la legislación de {LEGAL.pais}, sin perjuicio de las normas
          imperativas de protección al consumidor de tu país de residencia. Para cualquier consulta
          escríbenos a <a href={`mailto:${LEGAL.correo}`}>{LEGAL.correo}</a>.
        </p>
      </LegalSection>
    </LegalShell>
  )
}
