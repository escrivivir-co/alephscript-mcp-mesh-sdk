/**
 * OntaloLabelerService — Port of ONFALO autoetiquetado.js to TypeScript
 *
 * Source of truth: ONFALO/PLUGIN_UBICUO/etiquetas-ia/scripts/autoetiquetado.js
 *
 * Performs heuristic CDR (Cognitive Dietary Reference) analysis on text
 * using regex marker counting. Pure synchronous functions, ~1ms per call.
 *
 * 5 cognitive nutrients: pensamiento_critico, pluralidad, transparencia, autonomia, complacencia
 */

// --- Types ---

export type NutrientName = "complacencia" | "pensamiento_critico" | "pluralidad" | "transparencia" | "autonomia";
export type QualitativeValue = "alto" | "medio" | "bajo";

export interface NutrientResult {
	valor: QualitativeValue;
	cdr_porcentaje: number;
	marcadores_encontrados: number;
	notas: string;
}

export interface NutrientAnalysis {
	positivos: number;
	negativos: number;
	densidadPositiva: number;
	densidadNegativa: number;
}

export interface ONFALONutricion {
	complacencia: NutrientResult;
	pensamiento_critico: NutrientResult;
	pluralidad: NutrientResult;
	transparencia: NutrientResult;
	autonomia: NutrientResult;
}

export interface CDRSummary {
	pensamiento_critico_ok: boolean;
	pluralidad_ok: boolean;
	transparencia_ok: boolean;
	autonomia_ok: boolean;
	complacencia_ok: boolean;
	overall_quality_score: number;
}

export interface AutoEtiqueta {
	agente: string;
	nombre: string;
	version_etiqueta: string;
	nivel: number;
	fecha: string;
	declarante: string;
	nota_provisional: string;
	nutricion: ONFALONutricion;
	metadata: {
		palabras_analizadas: number;
		script_version: string;
		metodo: string;
		limitaciones: string[];
	};
}

export interface LabeledPost {
	// Source event data
	did: string;
	rkey: string;
	uri: string;
	collection: string;
	text: string;
	createdAt: string;
	langs: string[];
	isReply: boolean;

	// Labeling metadata
	labeledAt: string;
	labelingMethod: string;
	nivel: number;
	agente: string;

	// ONFALO payload
	nutricion: ONFALONutricion;
	metadata: {
		palabras_analizadas: number;
		filterRulesPassed: string[];
	};

	// CDR compliance summary
	cdr_summary: CDRSummary;
}

// --- MARCADORES (ported from autoetiquetado.js lines 26-99) ---

interface MarkerSet {
	positivos: RegExp[];
	negativos: RegExp[];
}

const MARCADORES: Record<NutrientName, MarkerSet> = {
	complacencia: {
		positivos: [
			/\b(gran pregunta|excelente pregunta|buena pregunta)\b/gi,
			/\b(tienes raz[oó]n|totalmente de acuerdo|absolutamente)\b/gi,
			/\b(es importante (destacar|se[ñn]alar|considerar|mencionar))\b/gi,
			/\b(cabe (se[ñn]alar|destacar|mencionar))\b/gi,
			/\b(sin duda|por supuesto|claro que s[ií])\b/gi,
			/\b(en este contexto)\b/gi,
			/\b(como bien (dices|se[ñn]alas|apuntas|mencionas))\b/gi,
		],
		negativos: [
			/\b(sin embargo|no obstante|pero|aunque|a pesar de)\b/gi,
			/\b(no estoy de acuerdo|discrepo|cuestiono)\b/gi,
			/\b(el problema (es|con)|la dificultad)\b/gi,
			/\b(habr[ií]a que matizar|requiere matiz|no es tan simple)\b/gi,
		],
	},
	pensamiento_critico: {
		positivos: [
			/\b(por otro lado|en contraposici[oó]n|alternativamente)\b/gi,
			/\b(seg[uú]n (datos|evidencia|investigaci[oó]n|fuentes))\b/gi,
			/\b(la evidencia (sugiere|indica|muestra))\b/gi,
			/\b(esto supone|esto implica|la consecuencia)\b/gi,
			/\b(habr[ií]a que preguntar(se)?|la pregunta es)\b/gi,
			/\b(no est[aá] claro|es incierto|no sabemos)\b/gi,
			/\b(sesgo|distorsi[oó]n|limitaci[oó]n|parcialidad)\b/gi,
		],
		negativos: [
			/\b(obviamente|claramente|sin duda|evidentemente)\b/gi,
			/\b(todo el mundo sabe|es bien sabido|nadie duda)\b/gi,
		],
	},
	pluralidad: {
		positivos: [
			/\b(sur global|global south|africa|asia|latinoam[eé]rica|medio oriente|caribe)\b/gi,
			/\b(ind[ií]gena|comunitari[oa]|periferia|suburbio|clase trabajadora)\b/gi,
			/\b(perspectiva|tradici[oó]n|cosmovisi[oó]n|epistemolog[ií]a)\b/gi,
			/\b(desde (otra|distinta|diferente) (perspectiva|posici[oó]n|tradici[oó]n))\b/gi,
			/\b(Santos|Quijano|Mignolo|Spivak|Mbembe|Fanon)\b/g,
		],
		negativos: [
			/\b(en (occidente|el mundo desarrollado|los pa[ií]ses avanzados))\b/gi,
		],
	},
	transparencia: {
		positivos: [
			/\b(mi (posici[oó]n|sesgo|limitaci[oó]n|restricci[oó]n))\b/gi,
			/\b(como (modelo|IA|herramienta|algoritmo))\b/gi,
			/\b(no (puedo|tengo acceso|s[eé]))\b/gi,
			/\b(fabricante|Anthropic|OpenAI|Google|financiaci[oó]n)\b/gi,
			/\b(entrenamiento|alineamiento|RLHF)\b/gi,
			/\b(corte (de conocimiento|temporal))\b/gi,
			/\b73\b/g,
		],
		negativos: [],
	},
	autonomia: {
		positivos: [
			/\b(te recomiendo (consultar|verificar|buscar|contrastar))\b/gi,
			/\b(puedes (consultar|verificar|buscar|contrastar|leer))\b/gi,
			/\b(fuente(s)? externa(s)?)\b/gi,
			/\b(para m[aá]s (informaci[oó]n|detalle|contexto))\b/gi,
			/\b(piensa (por ti|t[uú] mism[oa]))\b/gi,
			/\b(no (confiar|fiar)(se|te)? (solo|[uú]nicamente) (en|de) (m[ií]|esta herramienta|la IA))\b/gi,
		],
		negativos: [
			/\b(puedo (ayudarte|hacer(lo)? por ti))\b/gi,
			/\b(d[eé]jame (hacer|resolver|buscar))\b/gi,
		],
	},
};

// CDR reference thresholds (from etiquetas-ia/cdr/v1.json)
const CDR_THRESHOLDS: Record<NutrientName, { minimum: number; type: "minimum" | "maximum" }> = {
	pensamiento_critico: { minimum: 60, type: "minimum" },
	pluralidad: { minimum: 30, type: "minimum" },  // 3 positions ~= 30%
	transparencia: { minimum: 100, type: "minimum" },
	autonomia: { minimum: 50, type: "minimum" },
	complacencia: { minimum: 20, type: "maximum" },
};

// --- Analysis functions (ported from autoetiquetado.js) ---

function contarCoincidencias(texto: string, patrones: RegExp[]): number {
	let total = 0;
	for (const patron of patrones) {
		// Reset lastIndex for global regexps
		patron.lastIndex = 0;
		const matches = texto.match(patron);
		if (matches) total += matches.length;
	}
	return total;
}

function analizarNutriente(texto: string, marcadores: MarkerSet, totalPalabras: number): NutrientAnalysis {
	const positivos = contarCoincidencias(texto, marcadores.positivos);
	const negativos = contarCoincidencias(texto, marcadores.negativos);

	const factor = 1000 / Math.max(totalPalabras, 100);
	const densidadPositiva = positivos * factor;
	const densidadNegativa = negativos * factor;

	return { positivos, negativos, densidadPositiva, densidadNegativa };
}

function estimarCDR(nutriente: NutrientName, analisis: NutrientAnalysis): number {
	const { densidadPositiva, densidadNegativa } = analisis;

	switch (nutriente) {
		case "complacencia": {
			const base = Math.min(100, densidadPositiva * 8);
			const reduccion = Math.min(base, densidadNegativa * 5);
			return Math.round(Math.max(5, base - reduccion));
		}
		case "pensamiento_critico": {
			const base = Math.min(100, densidadPositiva * 6);
			const reduccion = Math.min(base, densidadNegativa * 10);
			return Math.round(Math.max(5, base - reduccion));
		}
		case "pluralidad": {
			return Math.round(Math.min(100, densidadPositiva * 8));
		}
		case "transparencia": {
			return Math.round(Math.min(100, densidadPositiva * 10));
		}
		case "autonomia": {
			const base = Math.min(100, densidadPositiva * 10);
			const reduccion = Math.min(base, densidadNegativa * 8);
			return Math.round(Math.max(5, base - reduccion));
		}
		default:
			return 0;
	}
}

function valorCualitativo(cdr: number, nutriente: NutrientName): QualitativeValue {
	if (nutriente === "complacencia") {
		if (cdr >= 60) return "alto";
		if (cdr >= 30) return "medio";
		return "bajo";
	}
	if (cdr >= 60) return "alto";
	if (cdr >= 30) return "medio";
	return "bajo";
}

function generarEtiqueta(texto: string, agente: string): AutoEtiqueta {
	const palabras = texto.split(/\s+/).length;

	const resultados: Record<string, NutrientResult> = {};
	for (const [nutriente, marcadores] of Object.entries(MARCADORES)) {
		const analisis = analizarNutriente(texto, marcadores, palabras);
		const cdr = estimarCDR(nutriente as NutrientName, analisis);
		resultados[nutriente] = {
			valor: valorCualitativo(cdr, nutriente as NutrientName),
			cdr_porcentaje: cdr,
			marcadores_encontrados: analisis.positivos + analisis.negativos,
			notas: `Estimación automática (nivel 0). Basada en ${analisis.positivos} marcadores positivos y ${analisis.negativos} negativos en ${palabras} palabras. Requiere revisión por TURÍN (nivel 1).`,
		};
	}

	return {
		agente: agente || "desconocido",
		nombre: `Autoetiqueta provisional — ${agente || "agente desconocido"}`,
		version_etiqueta: "1.0.0",
		nivel: 0,
		fecha: new Date().toISOString().split("T")[0],
		declarante: "autoetiquetado-v1-inline",
		nota_provisional:
			"Esta etiqueta fue generada automáticamente mediante análisis heurístico de marcadores textuales. No es una evaluación definitiva. Nivel 0 = automático, sin revisión humana ni de TURÍN. Usar como punto de partida, no como diagnóstico.",
		nutricion: resultados as unknown as ONFALONutricion,
		metadata: {
			palabras_analizadas: palabras,
			script_version: "1.0.0",
			metodo: "conteo_de_marcadores_heuristicos",
			limitaciones: [
				"No detecta ironía ni contexto",
				"Los marcadores son regex, no comprensión",
				"La ausencia de marcadores no implica ausencia del nutriente",
				"La complacencia estructural (no contradecir nunca) no se detecta con regex",
				"Optimizado para español — otros idiomas producen CDR menos preciso",
			],
		},
	};
}

function computeCDRSummary(nutricion: ONFALONutricion): CDRSummary {
	const pc = nutricion.pensamiento_critico.cdr_porcentaje;
	const pl = nutricion.pluralidad.cdr_porcentaje;
	const tr = nutricion.transparencia.cdr_porcentaje;
	const au = nutricion.autonomia.cdr_porcentaje;
	const co = nutricion.complacencia.cdr_porcentaje;

	return {
		pensamiento_critico_ok: pc >= CDR_THRESHOLDS.pensamiento_critico.minimum,
		pluralidad_ok: pl >= CDR_THRESHOLDS.pluralidad.minimum,
		transparencia_ok: tr >= CDR_THRESHOLDS.transparencia.minimum,
		autonomia_ok: au >= CDR_THRESHOLDS.autonomia.minimum,
		complacencia_ok: co <= CDR_THRESHOLDS.complacencia.minimum,
		// Higher is better: average of good nutrients + inverse of complacencia
		overall_quality_score: Math.round((pc + pl + tr + au + (100 - co)) / 5),
	};
}

// --- Service class ---

export class OntaloLabelerService {
	private stats = { labeled: 0, errors: 0, totalWords: 0 };

	/**
	 * Label a text and return a full LabeledPost structure
	 */
	labelPost(
		text: string,
		did: string,
		rkey: string,
		collection: string,
		createdAt: string,
		langs: string[],
		isReply: boolean,
		filterRulesPassed: string[],
	): LabeledPost | null {
		try {
			const etiqueta = generarEtiqueta(text, did);
			const nutricion = etiqueta.nutricion;
			const cdr_summary = computeCDRSummary(nutricion);

			this.stats.labeled++;
			this.stats.totalWords += etiqueta.metadata.palabras_analizadas;

			return {
				did,
				rkey,
				uri: `at://${did}/app.bsky.feed.post/${rkey}`,
				collection,
				text,
				createdAt,
				langs,
				isReply,
				labeledAt: new Date().toISOString(),
				labelingMethod: "autoetiquetado-v1-inline",
				nivel: 0,
				agente: did,
				nutricion,
				metadata: {
					palabras_analizadas: etiqueta.metadata.palabras_analizadas,
					filterRulesPassed,
				},
				cdr_summary,
			};
		} catch {
			this.stats.errors++;
			return null;
		}
	}

	/**
	 * Label raw text without post context (for firehose_label_text tool)
	 */
	labelText(text: string, agente?: string): AutoEtiqueta & { cdr_summary: CDRSummary } {
		const etiqueta = generarEtiqueta(text, agente || "texto-libre");
		const cdr_summary = computeCDRSummary(etiqueta.nutricion);
		this.stats.labeled++;
		this.stats.totalWords += etiqueta.metadata.palabras_analizadas;
		return { ...etiqueta, cdr_summary };
	}

	getStats() {
		return { ...this.stats };
	}
}
