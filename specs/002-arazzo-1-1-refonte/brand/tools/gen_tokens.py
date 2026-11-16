#!/usr/bin/env python3
"""Generate ConnEthics x Arazzo design tokens (DTCG JSON + CSS) and check WCAG contrast.

Usage: python3 brand/tools/gen_tokens.py <brand_dir> [<report_dir>]
Writes tokens.json and tokens.css into <brand_dir>, and contrast-report.md into <report_dir>
(default: <brand_dir>). The report table is reproduced in BRAND.md. Exit code 1 if any WCAG check fails.
"""
import json
import sys
from pathlib import Path

OUT = Path(sys.argv[1])

# ---------------------------------------------------------------- primitives
P = {
    "blue": {50: "#eff6ff", 100: "#dbeafe", 200: "#bfdbfe", 300: "#93c5fd", 400: "#60a5fa", 500: "#3b82f6",
             600: "#2563eb", 700: "#1d4ed8", 800: "#1e40af", 900: "#1e3a8a", 950: "#172554"},
    "orange": {50: "#fff7ed", 100: "#ffedd5", 200: "#fed7aa", 300: "#fdba74", 400: "#fb923c", 500: "#f97316",
               600: "#ea580c", 700: "#c2410c", 800: "#9a3412", 900: "#7c2d12", 950: "#431407"},
    "slate": {50: "#f8fafc", 100: "#f1f5f9", 200: "#e2e8f0", 300: "#cbd5e1", 400: "#94a3b8", 500: "#64748b",
              600: "#475569", 700: "#334155", 800: "#1e293b", 900: "#0f172a", 950: "#020617"},
    "green": {50: "#f0fdf4", 100: "#dcfce7", 200: "#bbf7d0", 300: "#86efac", 400: "#4ade80", 500: "#22c55e",
              600: "#16a34a", 700: "#15803d", 800: "#166534", 900: "#14532d", 950: "#052e16"},
    "red": {50: "#fef2f2", 100: "#fee2e2", 200: "#fecaca", 300: "#fca5a5", 400: "#f87171", 500: "#ef4444",
            600: "#dc2626", 700: "#b91c1c", 800: "#991b1b", 900: "#7f1d1d", 950: "#450a0a"},
    "amber": {50: "#fffbeb", 100: "#fef3c7", 200: "#fde68a", 300: "#fcd34d", 400: "#fbbf24", 500: "#f59e0b",
              600: "#d97706", 700: "#b45309", 800: "#92400e", 900: "#78350f", 950: "#451a03"},
    "teal": {50: "#f0fdfa", 100: "#ccfbf1", 200: "#99f6e4", 300: "#5eead4", 400: "#2dd4bf", 500: "#14b8a6",
             600: "#0d9488", 700: "#0f766e", 800: "#115e59", 900: "#134e4a", 950: "#042f2e"},
    "cyan": {50: "#ecfeff", 100: "#cffafe", 200: "#a5f3fc", 300: "#67e8f9", 400: "#22d3ee", 500: "#06b6d4",
             600: "#0891b2", 700: "#0e7490", 800: "#155e75", 900: "#164e63", 950: "#083344"},
    "indigo": {50: "#eef2ff", 100: "#e0e7ff", 200: "#c7d2fe", 300: "#a5b4fc", 400: "#818cf8", 500: "#6366f1",
               600: "#4f46e5", 700: "#4338ca", 800: "#3730a3", 900: "#312e81", 950: "#1e1b4b"},
    "violet": {50: "#f5f3ff", 100: "#ede9fe", 200: "#ddd6fe", 300: "#c4b5fd", 400: "#a78bfa", 500: "#8b5cf6",
               600: "#7c3aed", 700: "#6d28d9", 800: "#5b21b6", 900: "#4c1d95", 950: "#2e1065"},
    "fuchsia": {50: "#fdf4ff", 100: "#fae8ff", 200: "#f5d0fe", 300: "#f0abfc", 400: "#e879f9", 500: "#d946ef",
                600: "#c026d3", 700: "#a21caf", 800: "#86198f", 900: "#701a75", 950: "#4a044e"},
}
BASE = {"white": "#ffffff", "black": "#000000", "logo-cyan": "#009cdf"}
PRIMITIVE_DESC = {
    "blue": "ConnEthics primary (website globals.css --color-primary-*).",
    "orange": "ConnEthics accent (website globals.css --color-accent-*).",
    "slate": "Neutrals (Tailwind slate; website deep-ocean hero uses slate-900).",
    "logo-cyan": "Cyan sampled from logo-connethics.webp (#009cdf). Reference only.",
}


def hx(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def to_hex(rgb):
    return "#%02x%02x%02x" % tuple(max(0, min(255, round(c))) for c in rgb)


def blend(fg, bg, a):
    f, b = hx(fg), hx(bg)
    return to_hex(tuple(f[i] * a + b[i] * (1 - a) for i in range(3)))


def lum(h):
    def ch(c):
        c /= 255
        return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
    r, g, b = (ch(c) for c in hx(h))
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def ratio(a, b):
    la, lb = sorted((lum(a), lum(b)), reverse=True)
    return (la + 0.05) / (lb + 0.05)


def ref(name):
    """'blue.600' -> hex"""
    if "." not in name:
        return BASE[name]
    g, s = name.split(".")
    return P[g][int(s)]


# ---------------------------------------------------------------- semantic (chrome)
# value = primitive ref ('blue.600'), raw hex, or ('mix', hue_ref, base_ref, alpha)
CANVAS = {"light": "white", "dark": "slate.900"}
SURFACE = {"light": "slate.50", "dark": "slate.800"}

CHROME = {
    # name: (light, dark, description)
    "bg-canvas": ("white", "slate.900", "Fond principal (page, canevas du graphe)."),
    "bg-surface": ("slate.50", "slate.800", "Panneaux, cartes, barres latérales."),
    "bg-raised": ("white", "slate.800", "Éléments surélevés (popover, nœud du graphe)."),
    "bg-sunken": ("slate.100", "slate.950", "Zones en creux (code, champs)."),
    "bg-hover": ("slate.100", "slate.700", "Survol d'un élément de liste."),
    "bg-selected": ("blue.50", ("mix", "blue.500", "slate.900", 0.22), "Élément sélectionné."),
    "border-default": ("slate.200", "slate.700", "Bordure décorative (séparateurs). Non soumise au 3:1."),
    "border-strong": ("slate.500", "slate.500", "Bordure de composant interactif (≥ 3:1)."),
    "text-default": ("slate.900", "slate.100", "Texte courant."),
    "text-muted": ("slate.600", "slate.300", "Texte secondaire."),
    "text-subtle": ("slate.500", "slate.400", "Métadonnées, placeholders (≥ 4.5:1 conservé)."),
    "text-link": ("blue.700", "blue.400", "Liens."),
    "primary": ("blue.600", "blue.400", "Bleu ConnEthics : icônes, traits, états actifs."),
    "primary-solid": ("blue.600", "blue.600", "Fond de bouton primaire."),
    "primary-solid-hover": ("blue.700", "blue.700", "Survol du bouton primaire."),
    "on-primary": ("white", "white", "Texte sur primary-solid."),
    "primary-subtle": ("blue.50", ("mix", "blue.500", "slate.900", 0.18), "Fond teinté primaire."),
    "primary-subtle-text": ("blue.800", "blue.200", "Texte sur primary-subtle."),
    "accent": ("orange.600", "orange.400", "Orange ConnEthics fonctionnel (traits, icônes ≥ 3:1)."),
    "accent-brand": ("orange.500", "orange.500", "Orange de marque #f97316 : aplats décoratifs uniquement en light (2.8:1 sur blanc)."),
    "accent-text": ("orange.700", "orange.300", "Texte orange (≥ 4.5:1)."),
    "accent-solid": ("orange.700", "orange.500", "Fond de bouton CTA orange."),
    "on-accent": ("white", "slate.950", "Texte sur accent-solid."),
    "accent-subtle": ("orange.50", ("mix", "orange.500", "slate.900", 0.16), "Fond teinté orange."),
    "accent-subtle-text": ("orange.800", "orange.200", "Texte sur accent-subtle."),
    "focus-ring": ("blue.600", "blue.400", "Anneau de focus clavier (≥ 3:1)."),
}

STATUS = {
    # name: hue
    "success": "green",
    "warning": "amber",
    "danger": "red",
    "info": "blue",
}

# ---------------------------------------------------------------- graph kinds
# Each kind gets fg (stroke/icon, >=3:1), bg (fill), text (>=4.5:1 on bg AND canvas)
GRAPH = {
    # name: (hue, description, light overrides, dark overrides)
    "input": ("cyan", "Nœud Inputs du workflow (cyan, clin d'œil au logo ConnEthics).", {}, {}),
    "output": ("violet", "Nœud Outputs du workflow.", {}, {}),
    "step-http": ("blue", "Étape HTTP (operationId / operationPath) : bleu primaire.", {}, {}),
    "async-send": ("orange", "Étape AsyncAPI action: send (orange accent).", {}, {}),
    "async-receive": ("teal", "Étape AsyncAPI action: receive.", {}, {}),
    "workflow-call": ("fuchsia", "Étape workflowId / action goto|reuse vers un sous-workflow (nœud + arête).", {}, {}),
    "success": ("green", "Arête onSuccess / goto succès, critère satisfait.", {"fg": "green.700"}, {}),
    "failure": ("red", "Arête onFailure, critère en échec.", {}, {}),
    "retry": ("amber", "Boucle retry (×retryLimit / retryAfter).", {"fg": "amber.700"}, {}),
    "end": ("slate", "Action type: end et nœud terminal.", {"fg": "slate.700", "bg": "slate.100", "text": "slate.800"},
            {"fg": "slate.300", "text": "slate.200"}),
    "depends-on": ("indigo", "Arête dependsOn (pointillés) et nœud de jonction.", {}, {}),
    "sequence": ("slate", "Arête de séquence implicite (étape suivante).",
                 {"fg": "slate.500", "bg": "slate.50", "text": "slate.600"},
                 {"fg": "slate.400", "text": "slate.300"}),
}

METHODS = {"get": "green", "post": "blue", "put": "amber", "patch": "teal", "delete": "red"}


def resolve(v):
    if isinstance(v, tuple) and v[0] == "mix":
        return blend(ref(v[1]), ref(v[2]), v[3])
    if v.startswith("#"):
        return v
    return ref(v)


def kind_values(hue, mode, over):
    if mode == "light":
        d = {"fg": f"{hue}.600", "bg": f"{hue}.50", "text": f"{hue}.800", "border": f"{hue}.600"}
    else:
        d = {"fg": f"{hue}.400", "bg": ("mix", f"{hue}.500", "slate.900", 0.16), "text": f"{hue}.200",
             "border": f"{hue}.400"}
    d.update(over)
    if "fg" in over:
        d["border"] = over["fg"]
    return d


def method_values(hue, mode):
    if mode == "light":
        return {"bg": f"{hue}.100", "text": f"{hue}.800", "solid": f"{hue}.700", "on-solid": "white"}
    return {"bg": ("mix", f"{hue}.500", "slate.800", 0.22), "text": f"{hue}.300", "solid": f"{hue}.400",
            "on-solid": "slate.950"}


def status_values(hue, mode):
    if mode == "light":
        return {"fg": f"{hue}.700" if hue in ("amber", "green") else f"{hue}.600", "bg": f"{hue}.50", "text": f"{hue}.800"}
    return {"fg": f"{hue}.400", "bg": ("mix", f"{hue}.500", "slate.900", 0.16), "text": f"{hue}.200"}


MODES = ("light", "dark")
semantic = {m: {} for m in MODES}  # css-name -> (raw value spec, description)

for name, (l, d, desc) in CHROME.items():
    semantic["light"][name] = (l, desc)
    semantic["dark"][name] = (d, desc)
for name, hue in STATUS.items():
    for m in MODES:
        for k, v in status_values(hue, m).items():
            semantic[m][f"status-{name}-{k}"] = (v, f"Statut {name} ({k}).")
for name, (hue, desc, lo, do) in GRAPH.items():
    for m, over in (("light", lo), ("dark", do)):
        for k, v in kind_values(hue, m, over).items():
            semantic[m][f"graph-{name}-{k}"] = (v, desc)
for name, hue in METHODS.items():
    for m in MODES:
        for k, v in method_values(hue, m).items():
            semantic[m][f"method-{name}-{k}"] = (v, f"Badge méthode HTTP {name.upper()} ({k}).")
# graph chrome
for m in MODES:
    semantic[m]["graph-canvas"] = (CANVAS[m], "Fond du canevas du graphe.")
    semantic[m]["graph-grid"] = (("slate.200" if m == "light" else "slate.700"), "Points / grille du canevas (décoratif).")
    semantic[m]["graph-node-bg"] = (("white" if m == "light" else "slate.800"), "Fond d'une carte-nœud.")
    semantic[m]["graph-node-border"] = (("slate.300" if m == "light" else "slate.600"), "Bordure neutre de carte-nœud (décorative, la couleur de type porte l'info).")
    semantic[m]["graph-node-selected"] = (("blue.600" if m == "light" else "blue.400"), "Contour du nœud sélectionné (≥ 3:1).")
    semantic[m]["graph-minimap-mask"] = (("#0f172a14" if m == "light" else "#0206178c"), "Masque de la minimap.")


def resolved(m, name):
    v = semantic[m][name][0]
    if isinstance(v, str) and v.startswith("#") and len(v) == 9:
        return v
    return resolve(v)


# ---------------------------------------------------------------- contrast checks
checks = []  # (mode, label, fg, bg, min)


def chk(label, fgname, bgname, minimum):
    for m in MODES:
        checks.append((m, label, fgname, bgname, minimum))


for t in ("text-default", "text-muted", "text-subtle", "text-link", "accent-text"):
    for b in ("bg-canvas", "bg-surface", "bg-raised"):
        chk(f"{t} / {b}", t, b, 4.5)
chk("text-default / bg-sunken", "text-default", "bg-sunken", 4.5)
chk("text-default / bg-selected", "text-default", "bg-selected", 4.5)
chk("text-default / bg-hover", "text-default", "bg-hover", 4.5)
chk("on-primary / primary-solid", "on-primary", "primary-solid", 4.5)
chk("on-primary / primary-solid-hover", "on-primary", "primary-solid-hover", 4.5)
chk("on-accent / accent-solid", "on-accent", "accent-solid", 4.5)
chk("primary-subtle-text / primary-subtle", "primary-subtle-text", "primary-subtle", 4.5)
chk("accent-subtle-text / accent-subtle", "accent-subtle-text", "accent-subtle", 4.5)
for u in ("primary", "accent", "focus-ring", "border-strong"):
    chk(f"{u} / bg-canvas (UI)", u, "bg-canvas", 3.0)
    chk(f"{u} / bg-surface (UI)", u, "bg-surface", 3.0)
for s in STATUS:
    chk(f"status-{s}-text / status-{s}-bg", f"status-{s}-text", f"status-{s}-bg", 4.5)
    chk(f"status-{s}-fg / bg-canvas (UI)", f"status-{s}-fg", "bg-canvas", 3.0)
for g in GRAPH:
    chk(f"graph-{g}-text / graph-{g}-bg", f"graph-{g}-text", f"graph-{g}-bg", 4.5)
    chk(f"graph-{g}-text / graph-canvas", f"graph-{g}-text", "graph-canvas", 4.5)
    chk(f"graph-{g}-fg / graph-canvas (UI)", f"graph-{g}-fg", "graph-canvas", 3.0)
    chk(f"graph-{g}-fg / graph-node-bg (UI)", f"graph-{g}-fg", "graph-node-bg", 3.0)
    chk(f"graph-{g}-fg / graph-{g}-bg (UI)", f"graph-{g}-fg", f"graph-{g}-bg", 3.0)
chk("graph-node-selected / graph-canvas (UI)", "graph-node-selected", "graph-canvas", 3.0)
for meth in METHODS:
    chk(f"method-{meth}-text / method-{meth}-bg", f"method-{meth}-text", f"method-{meth}-bg", 4.5)
    chk(f"method-{meth}-on-solid / method-{meth}-solid", f"method-{meth}-on-solid", f"method-{meth}-solid", 4.5)

fails = []
rows = []
for m, label, f, b, mn in checks:
    fv, bv = resolved(m, f), resolved(m, b)
    r = ratio(fv, bv)
    ok = r >= mn
    rows.append((m, label, fv, bv, r, mn, ok))
    if not ok:
        fails.append((m, label, fv, bv, round(r, 2), mn))

# Informative (not tokens in use for text): brand orange on white
info_rows = [
    ("light", "#f97316 (orange marque) / #ffffff", ratio("#f97316", "#ffffff")),
    ("light", "#ffffff / #f97316 (texte blanc sur orange marque)", ratio("#ffffff", "#f97316")),
    ("light", "#ffffff / #ea580c", ratio("#ffffff", "#ea580c")),
    ("light", "#2563eb / #ffffff (bleu marque)", ratio("#2563eb", "#ffffff")),
    ("light", "#009cdf (cyan logo) / #ffffff", ratio("#009cdf", "#ffffff")),
    ("dark", "#f97316 / #0f172a", ratio("#f97316", "#0f172a")),
    ("dark", "#2563eb / #0f172a", ratio("#2563eb", "#0f172a")),
]

# ---------------------------------------------------------------- non-color tokens
FONT = {
    "sans": ["Inter", "ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "Helvetica Neue", "Arial", "sans-serif"],
    "mono": ["JetBrains Mono", "ui-monospace", "SFMono-Regular", "Menlo", "Consolas", "Liberation Mono", "monospace"],
}
FONT_SIZE = {"2xs": 10, "xs": 12, "sm": 14, "base": 16, "lg": 18, "xl": 20, "2xl": 24, "3xl": 30, "4xl": 36, "5xl": 48, "6xl": 60,
             "graph-badge": 10, "graph-meta": 11, "graph-title": 13}
FONT_WEIGHT = {"regular": 400, "medium": 500, "semibold": 600, "bold": 700, "extrabold": 800}
LINE_HEIGHT = {"none": 1, "tight": 1.25, "snug": 1.375, "normal": 1.5, "relaxed": 1.625}
LETTER = {"tight": -0.025, "normal": 0, "wide": 0.025, "caps": 0.05}
SPACE = {"0": 0, "px": 1, "0-5": 2, "1": 4, "1-5": 6, "2": 8, "2-5": 10, "3": 12, "4": 16, "5": 20, "6": 24, "8": 32,
         "10": 40, "12": 48, "16": 64, "20": 80, "24": 96}
RADIUS = {"none": 0, "xs": 2, "sm": 4, "md": 6, "lg": 8, "xl": 12, "2xl": 16, "3xl": 24, "full": 9999}
GRAPH_DIM = {"node-width": 240, "node-min-height": 56, "node-radius": 8, "node-padding": 12, "edge-width": 1.5,
             "edge-width-selected": 2.5, "junction-size": 10, "handle-size": 8, "focus-ring-width": 2, "focus-ring-offset": 2}
DASH = {"depends-on": "6 4", "retry": "2 3", "workflow-call": "8 3 2 3"}
DURATION = {"fast": 150, "normal": 200, "slow": 300}
EASING = {"standard": [0.2, 0, 0, 1], "emphasized": [0.3, 0, 0, 1], "exit": [0.4, 0, 1, 1]}

# shadows: (offsetX, offsetY, blur, spread, alpha) ; color = slate-950 light / black dark
SHADOWS = {
    "xs": {"light": [(0, 1, 2, 0, 0.05)], "dark": [(0, 1, 2, 0, 0.4)]},
    "sm": {"light": [(0, 1, 3, 0, 0.10), (0, 1, 2, -1, 0.10)], "dark": [(0, 1, 3, 0, 0.5), (0, 1, 2, -1, 0.5)]},
    "md": {"light": [(0, 4, 6, -1, 0.10), (0, 2, 4, -2, 0.10)], "dark": [(0, 4, 6, -1, 0.5), (0, 2, 4, -2, 0.5)]},
    "lg": {"light": [(0, 10, 15, -3, 0.10), (0, 4, 6, -4, 0.10)], "dark": [(0, 10, 15, -3, 0.6), (0, 4, 6, -4, 0.6)]},
    "xl": {"light": [(0, 20, 25, -5, 0.10), (0, 8, 10, -6, 0.10)], "dark": [(0, 20, 25, -5, 0.7), (0, 8, 10, -6, 0.7)]},
}
SHADOW_ALIAS = {"node": "sm", "node-hover": "md", "overlay": "lg", "dialog": "xl"}
SHADOW_RGB = {"light": "15 23 42", "dark": "0 0 0"}


def shadow_css(m, layers):
    return ", ".join(f"{x}px {y}px {b}px {s}px rgb({SHADOW_RGB[m]} / {a})" for x, y, b, s, a in layers)


# ---------------------------------------------------------------- DTCG JSON
def color_obj(h):
    h6 = h[:7]
    r, g, b = hx(h6)
    o = {"colorSpace": "srgb", "components": [round(r / 255, 4), round(g / 255, 4), round(b / 255, 4)], "hex": h6}
    if len(h) == 9:
        o["alpha"] = round(int(h[7:9], 16) / 255, 3)
    return o


def alias_of(v):
    if isinstance(v, tuple):
        return None
    if v.startswith("#"):
        return None
    if "." in v:
        return "{color." + v + "}"
    return "{color.base." + v + "}"


def color_token(v, desc=None):
    a = alias_of(v) if not isinstance(v, tuple) else None
    if a:
        t = {"$value": a}
    else:
        t = {"$value": color_obj(resolve(v) if not (isinstance(v, str) and len(v) == 9) else v)}
        if isinstance(v, tuple):
            t["$extensions"] = {"com.connethics.derivation": f"mix({v[1]} @ {int(v[3] * 100)}% over {v[2]})"}
    if desc:
        t["$description"] = desc
    return t


tokens = {
    "$description": "ConnEthics x Arazzo design tokens (B1, refonte Arazzo 1.1.0). Format W3C DTCG 2025.10. "
                    "Les tokens sémantiques portent la valeur light dans $value et la valeur dark dans "
                    "$extensions['com.connethics.modes'].dark. Généré par brand/tools/gen_tokens.py, ne pas éditer à la main.",
    "color": {"$type": "color", "base": {k: {"$value": color_obj(v), **({"$description": PRIMITIVE_DESC[k]} if k in PRIMITIVE_DESC else {})} for k, v in BASE.items()}},
}
for g, scale in P.items():
    grp = {str(k): {"$value": color_obj(v)} for k, v in scale.items()}
    if g in PRIMITIVE_DESC:
        grp["$description"] = PRIMITIVE_DESC[g]
    tokens["color"][g] = grp


def put(tree, path, value):
    cur = tree
    for p in path[:-1]:
        cur = cur.setdefault(p, {})
    cur[path[-1]] = value


sem = {"$type": "color"}
for name in semantic["light"]:
    lv, desc = semantic["light"][name]
    dv, _ = semantic["dark"][name]
    t = color_token(lv, desc)
    dt = color_token(dv)
    t.setdefault("$extensions", {})["com.connethics.modes"] = {"dark": dt["$value"]}
    if "$extensions" in dt and "com.connethics.derivation" in dt["$extensions"]:
        t["$extensions"]["com.connethics.derivation.dark"] = dt["$extensions"]["com.connethics.derivation"]
    t["$extensions"]["com.connethics.css"] = f"--ce-{name}"
    # path: graph-input-fg -> graph/input/fg ; method-get-bg -> method/get/bg ; others flat-ish
    if name.startswith("graph-") and any(name.startswith(f"graph-{g}-") for g in GRAPH):
        g = next(g for g in sorted(GRAPH, key=len, reverse=True) if name.startswith(f"graph-{g}-"))
        path = ["graph", g, name[len(f"graph-{g}-"):]]
    elif name.startswith("graph-"):
        path = ["graph", "chrome", name[len("graph-"):]]
    elif name.startswith("method-"):
        _, meth, k = name.split("-", 2)
        path = ["method", meth, k]
    elif name.startswith("status-"):
        _, st, k = name.split("-", 2)
        path = ["status", st, k]
    else:
        path = ["ui", name]
    put(sem, path, t)
tokens["semantic"] = sem


def dim(v, unit="px"):
    return {"value": v, "unit": unit}


tokens["font"] = {
    "family": {"$type": "fontFamily", **{k: {"$value": v} for k, v in FONT.items()}},
    "size": {"$type": "dimension", **{k: {"$value": dim(v / 16, "rem") if not k.startswith("graph") else dim(v)} for k, v in FONT_SIZE.items()}},
    "weight": {"$type": "fontWeight", **{k: {"$value": v} for k, v in FONT_WEIGHT.items()}},
    "line-height": {"$type": "number", **{k: {"$value": v} for k, v in LINE_HEIGHT.items()}},
    "letter-spacing": {"$type": "dimension", **{k: {"$value": dim(v, "em")} for k, v in LETTER.items()}},
}
tokens["typography"] = {
    "$type": "typography",
    "body": {"$value": {"fontFamily": "{font.family.sans}", "fontSize": "{font.size.base}", "fontWeight": "{font.weight.regular}",
                        "letterSpacing": "{font.letter-spacing.normal}", "lineHeight": "{font.line-height.normal}"}},
    "heading": {"$value": {"fontFamily": "{font.family.sans}", "fontSize": "{font.size.3xl}", "fontWeight": "{font.weight.bold}",
                           "letterSpacing": "{font.letter-spacing.tight}", "lineHeight": "{font.line-height.tight}"}},
    "code": {"$value": {"fontFamily": "{font.family.mono}", "fontSize": "{font.size.sm}", "fontWeight": "{font.weight.regular}",
                        "letterSpacing": "{font.letter-spacing.normal}", "lineHeight": "{font.line-height.normal}"}},
    "graph-title": {"$value": {"fontFamily": "{font.family.sans}", "fontSize": "{font.size.graph-title}", "fontWeight": "{font.weight.semibold}",
                               "letterSpacing": "{font.letter-spacing.normal}", "lineHeight": "{font.line-height.snug}"}},
    "graph-badge": {"$value": {"fontFamily": "{font.family.mono}", "fontSize": "{font.size.graph-badge}", "fontWeight": "{font.weight.bold}",
                               "letterSpacing": "{font.letter-spacing.caps}", "lineHeight": "{font.line-height.none}"}},
}
tokens["space"] = {"$type": "dimension", **{k: {"$value": dim(v)} for k, v in SPACE.items()}}
tokens["radius"] = {"$type": "dimension", **{k: {"$value": dim(v)} for k, v in RADIUS.items()}}
tokens["graph"] = {"$type": "dimension", **{k: {"$value": dim(v)} for k, v in GRAPH_DIM.items()},
                   "dash": {"$type": "strokeStyle", **{k: {"$value": {"dashArray": [dim(float(x)) for x in v.split()], "lineCap": "round"}} for k, v in DASH.items()}}}
tokens["duration"] = {"$type": "duration", **{k: {"$value": {"value": v, "unit": "ms"}} for k, v in DURATION.items()}}
tokens["easing"] = {"$type": "cubicBezier", **{k: {"$value": v} for k, v in EASING.items()}}


def shadow_tok(m, layers):
    rgb = [int(x) for x in SHADOW_RGB[m].split()]
    return [{"color": {"colorSpace": "srgb", "components": [round(c / 255, 4) for c in rgb], "alpha": a, "hex": to_hex(rgb)},
             "offsetX": dim(x), "offsetY": dim(y), "blur": dim(b), "spread": dim(s)} for x, y, b, s, a in layers]


tokens["shadow"] = {"$type": "shadow"}
for k, v in SHADOWS.items():
    tokens["shadow"][k] = {"$value": shadow_tok("light", v["light"]),
                           "$extensions": {"com.connethics.modes": {"dark": shadow_tok("dark", v["dark"])}}}
for k, v in SHADOW_ALIAS.items():
    tokens["shadow"][k] = {"$value": "{shadow." + v + "}"}

(OUT / "tokens.json").write_text(json.dumps(tokens, indent=2, ensure_ascii=False) + "\n")

# ---------------------------------------------------------------- CSS
L = []
w = L.append
w("/*")
w(" * ConnEthics x Arazzo — design tokens (lot B1, refonte Arazzo 1.1.0)")
w(" * Généré par brand/tools/gen_tokens.py à partir de la même source que tokens.json : ne pas éditer à la main.")
w(" *")
w(" * Thèmes :")
w(" *   - light par défaut (:root, [data-theme=\"light\"], body.vscode-light) ;")
w(" *   - dark via [data-theme=\"dark\"], body.vscode-dark, ou prefers-color-scheme: dark")
w(" *     quand aucun data-theme=\"light\" n'est imposé ;")
w(" *   - section « VS Code bridge » en fin de fichier : remappe le chrome sur var(--vscode-*)")
w(" *     avec fallback sur la palette ConnEthics ; les couleurs sémantiques du graphe restent celles de la marque.")
w(" * Préfixe : --ce-*. Contrastes WCAG AA vérifiés (voir BRAND.md).")
w(" */")
w("")
w(":root {")
w("  /* ---------- Primitives : couleurs ---------- */")
for k, v in BASE.items():
    w(f"  --ce-color-{k}: {v};")
for g, scale in P.items():
    for s, v in scale.items():
        w(f"  --ce-color-{g}-{s}: {v};")
w("")
w("  /* ---------- Typographie ---------- */")
for k, v in FONT.items():
    fam = ", ".join(f'"{x}"' if " " in x else x for x in v)
    w(f"  --ce-font-{k}: {fam};")
for k, v in FONT_SIZE.items():
    w(f"  --ce-font-size-{k}: {v}px;" if k.startswith("graph") else f"  --ce-font-size-{k}: {v / 16:g}rem;")
for k, v in FONT_WEIGHT.items():
    w(f"  --ce-font-weight-{k}: {v};")
for k, v in LINE_HEIGHT.items():
    w(f"  --ce-line-height-{k}: {v};")
for k, v in LETTER.items():
    w(f"  --ce-letter-spacing-{k}: {v}em;")
w("")
w("  /* ---------- Espacement (grille 4 px) ---------- */")
for k, v in SPACE.items():
    w(f"  --ce-space-{k}: {v}px;")
w("")
w("  /* ---------- Rayons ---------- */")
for k, v in RADIUS.items():
    w(f"  --ce-radius-{k}: {v}px;")
w("")
w("  /* ---------- Graphe : dimensions ---------- */")
for k, v in GRAPH_DIM.items():
    w(f"  --ce-graph-{k}: {v}px;")
for k, v in DASH.items():
    w(f"  --ce-graph-dash-{k}: {v};")
w("")
w("  /* ---------- Mouvement ---------- */")
for k, v in DURATION.items():
    w(f"  --ce-duration-{k}: {v}ms;")
for k, v in EASING.items():
    w(f"  --ce-easing-{k}: cubic-bezier({', '.join(str(x) for x in v)});")
w("}")
w("")
w("body.vscode-reduce-motion {")
for k in DURATION:
    w(f"  --ce-duration-{k}: 0ms;")
w("}")
w("")
w("@media (prefers-reduced-motion: reduce) {")
w("  :root {")
for k in DURATION:
    w(f"    --ce-duration-{k}: 0ms;")
w("  }")
w("}")
w("")


def css_val(m, name):
    v = semantic[m][name][0]
    if isinstance(v, tuple):
        return resolve(v)  # derived hex (mix)
    if v.startswith("#"):
        return v
    if "." in v:
        g, s = v.split(".")
        return f"var(--ce-color-{g}-{s})"
    return f"var(--ce-color-{v})"


def theme_block(m, indent="  "):
    out = []
    out.append(f"{indent}color-scheme: {m};")
    section = None
    for name in semantic[m]:
        sec = name.split("-")[0]
        sec = sec if sec in ("graph", "method", "status") else "ui"
        if sec != section:
            section = sec
            label = {"graph": "Graphe", "method": "Méthodes HTTP", "status": "Statuts"}.get(sec, "UI (chrome)")
            out.append(f"{indent}/* {label} */")
        out.append(f"{indent}--ce-{name}: {css_val(m, name)};")
    for k, v in SHADOWS.items():
        out.append(f"{indent}--ce-shadow-{k}: {shadow_css(m, v[m])};")
    for k, v in SHADOW_ALIAS.items():
        out.append(f"{indent}--ce-shadow-{k}: var(--ce-shadow-{v});")
    return out


LIGHT_SEL = ':root,\n[data-theme="light"],\nbody.vscode-light,\nbody.vscode-high-contrast-light'
DARK_SEL = '[data-theme="dark"],\nbody.vscode-dark,\nbody.vscode-high-contrast:not(.vscode-high-contrast-light)'

w("/* =====================================================================")
w("   Thème LIGHT (défaut)")
w("   ===================================================================== */")
w(LIGHT_SEL + " {")
L.extend(theme_block("light"))
w("}")
w("")
w("/* =====================================================================")
w("   Thème DARK — préférence système (sauf data-theme=\"light\" explicite)")
w("   ===================================================================== */")
w("@media (prefers-color-scheme: dark) {")
w('  :root:not([data-theme="light"]) {')
L.extend(theme_block("dark", "    "))
w("  }")
w("}")
w("")
w("/* =====================================================================")
w("   Thème DARK — explicite (data-theme ou thème VS Code sombre)")
w("   ===================================================================== */")
w(DARK_SEL + " {")
L.extend(theme_block("dark"))
w("}")
w("")

# ---------------------------------------------------------------- VS Code bridge
BRIDGE = [
    # (ce token, vscode var, light fallback, dark fallback)
    ("bg-canvas", "--vscode-editor-background", "white", "slate.900"),
    ("bg-surface", "--vscode-sideBar-background", "slate.50", "slate.800"),
    ("bg-raised", "--vscode-editorWidget-background", "white", "slate.800"),
    ("bg-sunken", "--vscode-textCodeBlock-background", "slate.100", "slate.950"),
    ("bg-hover", "--vscode-list-hoverBackground", "slate.100", "slate.700"),
    ("bg-selected", "--vscode-list-activeSelectionBackground", "blue.50", blend(ref("blue.500"), ref("slate.900"), 0.22)),
    ("border-default", "--vscode-panel-border", "slate.200", "slate.700"),
    ("border-strong", "--vscode-input-border", "slate.500", "slate.500"),
    ("text-default", "--vscode-foreground", "slate.900", "slate.100"),
    ("text-muted", "--vscode-descriptionForeground", "slate.600", "slate.300"),
    ("text-subtle", "--vscode-disabledForeground", "slate.500", "slate.400"),
    ("text-link", "--vscode-textLink-foreground", "blue.700", "blue.400"),
    ("primary-solid", "--vscode-button-background", "blue.600", "blue.600"),
    ("primary-solid-hover", "--vscode-button-hoverBackground", "blue.700", "blue.700"),
    ("on-primary", "--vscode-button-foreground", "white", "white"),
    ("focus-ring", "--vscode-focusBorder", "blue.600", "blue.400"),
    ("status-danger-fg", "--vscode-editorError-foreground", "red.600", "red.400"),
    ("status-warning-fg", "--vscode-editorWarning-foreground", "amber.700", "amber.400"),
    ("status-info-fg", "--vscode-editorInfo-foreground", "blue.600", "blue.400"),
    ("status-success-fg", "--vscode-testing-iconPassed", "green.700", "green.400"),
    ("graph-canvas", "--vscode-editor-background", "white", "slate.900"),
    ("graph-node-bg", "--vscode-editorWidget-background", "white", "slate.800"),
    ("graph-node-border", "--vscode-editorWidget-border", "slate.300", "slate.600"),
    ("graph-grid", "--vscode-editorIndentGuide-background1", "slate.200", "slate.700"),
    ("graph-node-selected", "--vscode-focusBorder", "blue.600", "blue.400"),
]


def fb(v):
    if v.startswith("#"):
        return v
    if "." in v:
        g, s = v.split(".")
        return f"var(--ce-color-{g}-{s})"
    return f"var(--ce-color-{v})"


w("/* =====================================================================")
w("   VS Code bridge")
w("   Dans un webview VS Code, <body> porte vscode-light | vscode-dark | vscode-high-contrast")
w("   (+ vscode-high-contrast-light). Le chrome (fonds, textes, bordures, boutons, focus,")
w("   sévérités) suit le thème de l'utilisateur ; le fallback est la valeur ConnEthics.")
w("   Les couleurs sémantiques du graphe (--ce-graph-<kind>-*) et des méthodes restent")
w("   celles de la marque : elles portent du sens et sont validées AA sur les fonds ci-dessus")
w("   en thèmes Light+/Dark+ par défaut. Ne pas référencer --ce-X dans la redéfinition de --ce-X")
w("   (cycle) : les fallbacks pointent donc sur les primitives.")
w("   ===================================================================== */")
for mode, sel in (("light", "body.vscode-light,\nbody.vscode-high-contrast-light"),
                  ("dark", "body.vscode-dark,\nbody.vscode-high-contrast:not(.vscode-high-contrast-light)")):
    w(sel + " {")
    w("  --ce-font-sans: var(--vscode-font-family, \"Inter\", ui-sans-serif, system-ui, sans-serif);")
    w("  --ce-font-mono: var(--vscode-editor-font-family, \"JetBrains Mono\", ui-monospace, monospace);")
    w("  --ce-font-size-base: var(--vscode-font-size, 13px);")
    for tok, vs, lf, df in BRIDGE:
        w(f"  --ce-{tok}: var({vs}, {fb(lf if mode == 'light' else df)});")
    w("}")
    w("")
w("/* High contrast : bordures et focus imposés par le thème, traits du graphe renforcés */")
w("/* :not(.ce-hc-off) porte la spécificité à (0,2,1) pour passer devant le bloc dark HC ci-dessus. */")
w("body.vscode-high-contrast:not(.ce-hc-off) {")
w("  --ce-border-default: var(--vscode-contrastBorder, CanvasText);")
w("  --ce-border-strong: var(--vscode-contrastBorder, CanvasText);")
w("  --ce-graph-node-border: var(--vscode-contrastBorder, CanvasText);")
w("  --ce-focus-ring: var(--vscode-contrastActiveBorder, Highlight);")
w("  --ce-graph-node-selected: var(--vscode-contrastActiveBorder, Highlight);")
w("  --ce-graph-edge-width: 2px;")
w("  --ce-shadow-node: none;")
w("  --ce-shadow-node-hover: none;")
w("}")
w("")
w("@media (forced-colors: active) {")
w("  :root {")
w("    --ce-graph-node-border: CanvasText;")
w("    --ce-focus-ring: Highlight;")
w("    --ce-graph-node-selected: Highlight;")
w("  }")
w("}")
(OUT / "tokens.css").write_text("\n".join(L) + "\n")

# ---------------------------------------------------------------- report
rep = ["| Thème | Paire (avant-plan / fond) | Avant-plan | Fond | Ratio | Seuil | AA |", "|---|---|---|---|---:|---:|:---:|"]
for m, label, fv, bv, r, mn, ok in rows:
    rep.append(f"| {m} | `{label}` | `{fv}` | `{bv}` | {r:.2f} | {mn:g} | {'OK' if ok else 'ÉCHEC'} |")
rep.append("")
rep.append("Valeurs de référence (hors tokens de texte) :")
rep.append("")
rep.append("| Thème | Paire | Ratio |")
rep.append("|---|---|---:|")
for m, label, r in info_rows:
    rep.append(f"| {m} | {label} | {r:.2f} |")
REPORT_DIR = Path(sys.argv[2]) if len(sys.argv) > 2 else OUT
(REPORT_DIR / "contrast-report.md").write_text("\n".join(rep) + "\n")

print(f"checks: {len(rows)}  fails: {len(fails)}")
for f in fails:
    print("FAIL", f)
for m, label, fv, bv, r, mn, ok in rows:
    if r < mn + 0.6:
        print(f"near threshold: {m:5} {r:5.2f} {label}")
sys.exit(1 if fails else 0)
