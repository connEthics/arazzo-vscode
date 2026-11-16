"""Check graph/method semantic colors against VS Code default theme backgrounds."""
import importlib.util, sys, io, contextlib, os, tempfile
here = os.path.dirname(os.path.abspath(__file__))
tmp = tempfile.mkdtemp()
sys.argv = ["x", tmp, tmp]
spec = importlib.util.spec_from_file_location("g", os.path.join(here, "gen_tokens.py"))
g = importlib.util.module_from_spec(spec)
with contextlib.redirect_stdout(io.StringIO()):
    try:
        spec.loader.exec_module(g)
    except SystemExit:
        pass
bgs = {"light": {"Light Modern editor #ffffff": "#ffffff", "Light+ widget #f3f3f3": "#f3f3f3"},
       "dark": {"Dark Modern editor #1f1f1f": "#1f1f1f", "Dark+ editor #1e1e1e": "#1e1e1e", "Dark+ widget #252526": "#252526", "HC black #000000": "#000000"}}
res = []
for m, bb in bgs.items():
    for bn, bv in bb.items():
        for k in g.GRAPH:
            for part, mn in (("fg", 3), ("text", 4.5)):
                v = g.resolved(m, f"graph-{k}-{part}")
                res.append((g.ratio(v, bv), m, bn, f"graph-{k}-{part}", mn))
res.sort()
print("min per background:")
for m, bb in bgs.items():
    for bn in bb:
        r = min(x for x in res if x[2] == bn)
        print(f"  {m:5} {bn:28} min {r[0]:.2f} ({r[3]}, seuil {r[4]})")
print("fails:", [x for x in res if x[0] < x[4]])
