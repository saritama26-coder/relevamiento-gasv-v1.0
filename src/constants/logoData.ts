// Logotipo horizontal negro sobre fondo blanco para informes, manuales e impresión.
// No utilizar gasv-logo.png aquí: esa variante es blanca y queda invisible sobre blanco.
const baseUrl = (import.meta.env?.BASE_URL || '/').replace(/\/+$/, '');
export const GSARITAMA_LOGO_PNG = `${baseUrl}/gsaritama_official.svg`;

// Marca exacta utilizada en la cabecera principal de GASV (versión blanca).
// En reportes y PDF debe colocarse sobre una placa azul para conservar su aspecto.
export const GSARITAMA_HEADER_LOGO = `${baseUrl}/gasv-logo.png`;
