"""Measure the context a small-model turn needs against the full catalog.

This is a size comparison, not a correctness baseline: it reports how much of
the addressable instruction/tool surface one turn actually carries, so the
"short on-stage context" claim can be checked without a second agent
implementation. Numbers are printed as KiB and as a share of the full set.
"""
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

GROUPS = {
    "calls": ["ext/root-skill/calls"],
    "guides": ["ext/root-skill/guides"],
    "runtime": ["ext/root-skill/runtime"],
    "phase-docs": [
        "ext/root-skill/state.mq.md",
        "ext/root-skill/intent.mq.md",
        "ext/root-skill/planning.mq.md",
        "ext/root-skill/authoring.mq.md",
        "ext/root-skill/delivery.mq.md",
    ],
    "stdlib": ["lib"],
}


def walk(rel_paths, root=ROOT):
    total = files = 0
    for rel in rel_paths:
        path = os.path.join(root, rel)
        if os.path.isdir(path):
            for base, _, names in os.walk(path):
                for name in names:
                    if name.endswith(".mq.md"):
                        total += os.path.getsize(os.path.join(base, name))
                        files += 1
        elif os.path.isfile(path):
            total += os.path.getsize(path)
            files += 1
    return files, total


def main():
    measured = [int(arg) for arg in sys.argv[1:]]
    sizes = {name: walk(paths) for name, paths in GROUPS.items()}
    catalog = sum(total for _, total in sizes.values())
    for name, (files, total) in sizes.items():
        print(f"{name:12s} {files:3d} files {total/1024:8.1f} KiB")
    print(f"{'catalog':12s} {'':3s}       {catalog/1024:8.1f} KiB (all instructions and stdlib)")
    if measured:
        average = sum(measured) / len(measured)
        print()
        for value in measured:
            print(f"measured turn {value:6d} B  {value/1024:7.1f} KiB  {100*value/catalog:5.1f}% of catalog")
        print(f"average turn  {average:6.0f} B  {average/1024:7.1f} KiB  {100*average/catalog:5.1f}% of catalog")
        # Token scale: a real local run measured 1037 prompt tokens for 1000
        # Chinese characters (about 1.04 tokens per character). Bytes are UTF-8,
        # so an approximate character count is bytes/3 for Chinese text; this is
        # an estimate for the catalog, not a measured prompt.
        chars = catalog / 3
        tokens = chars * 1.04
        print(f"catalog estimate {tokens:8.0f} tokens at 1.04 tokens/char (measured sample)")
        print(f"a 32768-token window would need about {tokens/32768:4.1f} full windows")


if __name__ == "__main__":
    main()
