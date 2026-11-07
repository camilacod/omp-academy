/** Plantillas para contenido: conservan las barras invertidas (LaTeX, \n de C++) y convierten § en ` */
export const md = (strings: TemplateStringsArray, ...v: unknown[]) => String.raw(strings, ...v).replaceAll("§", "`");
export const code = (strings: TemplateStringsArray, ...v: unknown[]) => String.raw(strings, ...v).replace(/^\n/, "");
