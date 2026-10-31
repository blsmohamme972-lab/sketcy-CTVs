#!/usr/bin/env python3
"""Bridge a measured Studio handoff and transparent layer export to schema-2 Android.

No synthesis, resampling, invented duration, or review approval happens here.
Use the existing CPU generation ledger, then the shared JVM archive validator.
"""
import argparse
import copy
import json
from pathlib import Path
import re
import struct
import tempfile

from package_lesson import ROOT, benchmark, build, strict_json


def png_file(folder, name, checksum):
    if not re.fullmatch(r"[A-Za-z0-9_-]+\.png", name):
        raise ValueError("Layer PNG must be a simple filename")
    path = (folder / name).resolve()
    if path.parent != folder.resolve() or not path.is_file():
        raise ValueError("Layer file must stay inside its export folder")
    if benchmark.sha256(path) != checksum:
        raise ValueError("Exported layer bytes changed: " + name)
    with path.open("rb") as source:
        header = source.read(24)
    if len(header) != 24 or header[:8] != b"\x89PNG\r\n\x1a\n":
        raise ValueError("Invalid layer PNG")
    return path, struct.unpack(">II", header[16:24])


def prepare(handoff_folder, layer_folder, generation):
    handoff = strict_json(handoff_folder / "studio-handoff.json")
    exported = strict_json(layer_folder / "layers.layer-assets.json")
    ledger = strict_json(generation / "generation.json")
    if handoff["schema"] != "sketcy.studio-handoff.v1" or exported["schema"] != "sketcy.layer-assets.v1":
        raise ValueError("Unsupported Studio handoff or layer export")
    manifest = copy.deepcopy(handoff["lesson"])
    if len(manifest["parts"]) != 1 or len(handoff["narrationPlan"]["parts"]) != 1:
        raise ValueError("Export one Studio scene per package")
    part = manifest["parts"][0]
    part_id = part["id"]
    plan = handoff["narrationPlan"]["parts"][0]
    if plan["id"] != part_id:
        raise ValueError("Narration part identity differs")
    for mode in ("explanation", "story"):
        measured = ledger["tracks"][part_id + "/" + mode]
        expected = [{k: s[k] for k in ("id", "text", "factIds", "symbolIds")} for s in measured["segments"]]
        if plan["tracks"][mode] != expected:
            raise ValueError("Studio scripts or fact links differ from synthesized segments")
        timing = handoff["timingDraft"][mode]
        if timing["durationMs"] != measured["audio"]["sample_frames"] * 1000 // 24000:
            raise ValueError("Studio duration must use measured CPU audio")
        if len(timing["cues"]) != len(measured["segments"]) or any(
            (cue["id"], cue["startMs"], cue["endMs"]) != (segment["id"], segment["startMs"], segment["endMs"])
            for cue, segment in zip(timing["cues"], measured["segments"])
        ):
            raise ValueError("Studio cues must use actual generated segment boundaries")
    width, height = exported["canvas"]["width"], exported["canvas"]["height"]
    if not (isinstance(width, int) and isinstance(height, int) and 64 <= width <= 4096 and 64 <= height <= 4096):
        raise ValueError("Invalid scene canvas")
    background, size = png_file(layer_folder, exported["background"], exported["backgroundSha256"])
    if size != (width, height):
        raise ValueError("Background size differs from scene")
    scene = {"width": width, "height": height, "backgroundPath": "images/background.png", "layers": []}
    images = {part["illustrationPath"]: str((handoff_folder / "images/scene.png").resolve()),
              scene["backgroundPath"]: str(background)}
    symbols = {s["id"]: s for s in manifest["symbols"]}
    for index, layer in enumerate(exported["layers"]):
        if layer["z"] != index:
            raise ValueError("Layer stacking order differs")
        file, size = png_file(layer_folder, layer["file"], layer["sha256"])
        box = layer["placement"]
        if size != (box["width"], box["height"]):
            raise ValueError("Layer pixels differ from exported placement")
        path = "images/" + layer["file"]
        images[path] = str(file)
        item = {"id": layer["id"], "assetPath": path,
                "region": {"x": box["x"] / width, "y": box["y"] / height,
                           "width": box["width"] / width, "height": box["height"] / height},
                "symbolId": layer["id"] if layer["id"] in symbols else None,
                "pivotX": layer["pivot"]["x"], "pivotY": layer["pivot"]["y"]}
        for mode in ("explanation", "story"):
            item[mode] = [{**key, "dx": key["dx"] / width, "dy": key["dy"] / height} for key in layer["motion"][mode]]
        scene["layers"].append(item)
    manifest["schemaVersion"] = 2
    part["scene"] = scene
    # Copy all flags unchanged. USER_SOURCE still needs recorded human approval.
    return {"lesson": manifest, "imageFiles": images}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--handoff", type=Path, required=True)
    parser.add_argument("--layers", type=Path, required=True)
    parser.add_argument("--generation", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    output = args.output.resolve()
    if output.is_relative_to(ROOT):
        parser.error("Keep generated lesson packages outside Git")
    output.parent.mkdir(parents=True, exist_ok=True)
    authored = prepare(args.handoff.resolve(), args.layers.resolve(), args.generation.resolve())
    with tempfile.TemporaryDirectory(prefix="sketcy-studio-package-", dir=output.parent) as work:
        authoring = Path(work) / "authoring.json"
        authoring.write_text(json.dumps(authored, indent=2) + "\n")
        build(authoring, args.generation.resolve(), output)


if __name__ == "__main__":
    main()
