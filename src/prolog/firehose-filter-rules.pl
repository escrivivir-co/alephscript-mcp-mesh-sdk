%% firehose-filter-rules.pl — Reglas Prolog para filtrado de calidad del firehose
%%
%% Estas reglas se cargan en el Prolog MCP Server (port 3006) y son consultadas
%% por el MCPFirehoseServer para decisiones de filtrado avanzadas.
%%
%% Uso:
%%   1. prolog_create_session({sessionId: "firehose", obraId: "firehose-filter"})
%%   2. prolog_consult_file({sessionId: "firehose", filePath: "src/prolog/firehose-filter-rules.pl"})
%%   3. prolog_query({sessionId: "firehose", query: "aceptar_post(Razon)."})
%%
%% Las reglas operan sobre hechos dinámicos que se asiertan por cada post evaluado.
%% @épica FIREHOSE-LABELER-1.0.0

:- discontiguous post_cdr/2.
:- discontiguous post_lang/1.
:- discontiguous post_words/1.
:- discontiguous post_is_reply/1.
:- discontiguous post_has_url/1.
:- discontiguous post_hashtag_count/1.

%% ============================================================
%% HECHOS DINAMICOS (se asiertan por post antes de consultar)
%% ============================================================
%% post_cdr(Nutriente, Valor).        % e.g., post_cdr(pensamiento_critico, 45).
%% post_lang(Lang).                   % e.g., post_lang("es").
%% post_words(N).                     % e.g., post_words(120).
%% post_is_reply(Bool).               % e.g., post_is_reply(false).
%% post_has_url(Bool).                % e.g., post_has_url(true).
%% post_hashtag_count(N).             % e.g., post_hashtag_count(2).

%% ============================================================
%% UMBRALES CDR (referencia ONFALO v1)
%% ============================================================

umbral_cdr(pensamiento_critico, minimo, 60).
umbral_cdr(pluralidad, minimo, 30).
umbral_cdr(transparencia, minimo, 100).
umbral_cdr(autonomia, minimo, 50).
umbral_cdr(complacencia, maximo, 20).

%% ============================================================
%% REGLAS DE CALIDAD
%% ============================================================

%% Un nutriente cumple CDR si supera el minimo o esta bajo el maximo
nutriente_ok(Nutriente) :-
    umbral_cdr(Nutriente, minimo, Umbral),
    post_cdr(Nutriente, Valor),
    Valor >= Umbral.

nutriente_ok(Nutriente) :-
    umbral_cdr(Nutriente, maximo, Umbral),
    post_cdr(Nutriente, Valor),
    Valor =< Umbral.

%% Cuenta cuantos nutrientes cumplen CDR
nutrientes_ok(N) :-
    findall(Nut, nutriente_ok(Nut), Lista),
    length(Lista, N).

%% ============================================================
%% PERFILES DE ACEPTACION (extensible)
%% ============================================================

%% Perfil ESTRICTO: todos los nutrientes CDR deben cumplir
perfil_aceptacion(estricto) :-
    nutrientes_ok(5).

%% Perfil MODERADO: al menos 3 de 5 nutrientes CDR cumplen
perfil_aceptacion(moderado) :-
    nutrientes_ok(N),
    N >= 3.

%% Perfil EXPLORATORIO: al menos 1 nutriente destaca (CDR > 60)
perfil_aceptacion(exploratorio) :-
    post_cdr(_, Valor),
    Valor >= 60.

%% Perfil ANTI-COMPLACENCIA: complacencia baja obligatoria
perfil_aceptacion(anti_complacencia) :-
    post_cdr(complacencia, C),
    C =< 15.

%% Perfil PENSAMIENTO_CRITICO: exige pensamiento critico alto
perfil_aceptacion(pensamiento_critico) :-
    post_cdr(pensamiento_critico, PC),
    PC >= 50.

%% Perfil PLURALIDAD: exige diversidad de perspectivas
perfil_aceptacion(pluralidad_minima) :-
    post_cdr(pluralidad, P),
    P >= 40.

%% ============================================================
%% REGLA PRINCIPAL DE ACEPTACION
%% ============================================================

%% aceptar_post/1 - Punto de entrada. Devuelve la razon de aceptacion.
%% Por defecto usa perfil moderado. Cambiar a estricto/exploratorio segun necesidad.

aceptar_post(Razon) :-
    perfil_activo(Perfil),
    perfil_aceptacion(Perfil),
    Razon = Perfil.

%% Perfil activo por defecto (modificable con retract/assert)
:- dynamic perfil_activo/1.
perfil_activo(moderado).

%% Cambiar perfil en runtime:
%% ?- retract(perfil_activo(_)), assert(perfil_activo(estricto)).

%% rechazar_post/1 - Razon de rechazo (complemento)
rechazar_post(Razon) :-
    \+ aceptar_post(_),
    nutrientes_ok(N),
    perfil_activo(Perfil),
    format(atom(Razon), 'Rechazado: solo ~w/5 nutrientes ok para perfil ~w', [N, Perfil]).

%% ============================================================
%% REGLAS DE DETECCION ESPECIALES (extensibles)
%% ============================================================

%% Detectar posts que son potenciales "Signal 73" (ONFALO)
%% Signal 73 = contenido que deberia decirse pero hay constriccion
potencial_signal_73 :-
    post_cdr(transparencia, T),
    post_cdr(complacencia, C),
    T >= 50,
    C =< 10.

%% Detectar posts con sesgo hegemonico probable
sesgo_hegemonico_probable :-
    post_cdr(pluralidad, P),
    post_cdr(complacencia, C),
    P =< 15,
    C >= 40.

%% Detectar posts con alto valor epistemico
alto_valor_epistemico :-
    post_cdr(pensamiento_critico, PC),
    post_cdr(pluralidad, P),
    post_cdr(complacencia, C),
    PC >= 50,
    P >= 30,
    C =< 25.

%% ============================================================
%% UTILIDADES
%% ============================================================

%% Limpiar hechos del post anterior antes de evaluar uno nuevo
limpiar_post :-
    retractall(post_cdr(_, _)),
    retractall(post_lang(_)),
    retractall(post_words(_)),
    retractall(post_is_reply(_)),
    retractall(post_has_url(_)),
    retractall(post_hashtag_count(_)).

%% Cargar hechos de un post para evaluacion
%% Ejemplo de uso desde el MCPFirehoseServer:
%%   limpiar_post,
%%   assert(post_cdr(pensamiento_critico, 45)),
%%   assert(post_cdr(pluralidad, 30)),
%%   assert(post_cdr(transparencia, 10)),
%%   assert(post_cdr(autonomia, 20)),
%%   assert(post_cdr(complacencia, 15)),
%%   assert(post_lang("es")),
%%   assert(post_words(80)),
%%   aceptar_post(Razon).

%% Diagnostico completo de un post
diagnostico_post(Diagnostico) :-
    nutrientes_ok(NOk),
    (aceptar_post(Perfil) -> Aceptado = true ; Aceptado = false, Perfil = ninguno),
    (potencial_signal_73 -> S73 = true ; S73 = false),
    (sesgo_hegemonico_probable -> SH = true ; SH = false),
    (alto_valor_epistemico -> AVE = true ; AVE = false),
    Diagnostico = diagnostico{
        nutrientes_ok: NOk,
        aceptado: Aceptado,
        perfil: Perfil,
        signal_73: S73,
        sesgo_hegemonico: SH,
        alto_valor_epistemico: AVE
    }.
